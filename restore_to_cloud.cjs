
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- STARTING SURGICAL RESTORATION ---');

    // 1. Fetch current cloud state
    const { data: cloudRow, error: fetchErr } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

    if (fetchErr) {
        console.error('Failed to fetch cloud state:', fetchErr.message);
        return;
    }

    let ws = cloudRow.data;
    console.log(`Current cloud state: ${ws.sites.length} sites, ${ws.buildings.length} buildings.`);

    // 2. Ensure basic site structure in Workspace
    const sites = [
        { id: 'A0001', customerId: 'CSRKCOCF', name: 'Castlerock', lat: 39.371693, lng: -104.865836, digitizedStatus: 'Digitized' },
        { id: 'A1002', customerId: 'PTVLCO03', name: 'plateville', lat: 40.186075, lng: -104.817409, digitizedStatus: 'Not Digitized' },
        { id: 'A004', customerId: 'PLLKCO01', name: 'Palmer Lake', lat: 39.125068, lng: -104.907596, digitizedStatus: 'Not Digitized' }
    ];
    ws.sites = sites;

    // 3. Populate Plateville (A1002) from Instructions JSON
    console.log('\nProcessing Plateville (A1002)...');
    try {
        const platevilleJson = JSON.parse(fs.readFileSync('Ray notes and files/Outputs/260223 - Plateville_Inventory_Instructions.json', 'utf8'));
        const ops = platevilleJson.operations?.create || [];

        // Ensure buildings 0001-0004 exist, add missing ones if needed
        const platevilleBuildings = ws.buildings.filter(b => b.siteId === 'A1002');
        const existingLabels = new Set(platevilleBuildings.map(b => b.label));

        const requiredLabels = ['0001', '0002', '0003', '0004', '0005', 'H101', 'TWRC'];
        requiredLabels.forEach(label => {
            if (!existingLabels.has(label)) {
                console.log(`  - Adding missing building ${label} for Plateville`);
                ws.buildings.push({
                    id: `B-PTVL-${label}-${Date.now()}`,
                    siteId: 'A1002',
                    name: `Building ${label}`,
                    label: label,
                    definitionId: 'TYPE_A',
                    x: (ws.buildings.length % 5) * 40,
                    z: Math.floor(ws.buildings.length / 5) * 30,
                    racks: [],
                    equipment: [],
                    suites: [],
                    status: 'RETAIN',
                    ownerId: 'OWN_LUMEN'
                });
            }
        });

        // Add Racks and Equipment from Operations
        ops.forEach(op => {
            const bLabel = op.attributes.building || op.details.building;
            const targetB = ws.buildings.find(b => b.siteId === 'A1002' && b.label === bLabel);

            if (targetB) {
                if (op.type === 'RACK') {
                    const rackId = op.attributes.rackId || `R-${targetB.id}-${op.details.label}`;
                    if (!targetB.racks.some(r => r.id === rackId)) {
                        targetB.racks.push({
                            id: rackId,
                            definitionId: 'RACK_42U',
                            label: op.details.label,
                            lineUp: op.details.lineUp,
                            bayNo: op.details.bayNo,
                            suite: op.details.suite || "",
                            location: `${sites[1].customerId}.001.${bLabel}.${op.details.suite || ""}.${op.details.lineUp}.${op.details.bayNo}`,
                            x: targetB.racks.length * 4 - 20,
                            y: 0,
                            status: 'RETAIN',
                            ownerId: 'OWN_LUMEN'
                        });
                    }
                } else if (op.type === 'EQUIPMENT') {
                    // Equipment mapping
                    const rackLabel = op.details.rack;
                    const rack = targetB.racks.find(r => r.label === rackLabel);
                    if (rack) {
                        targetB.equipment.push({
                            id: op.attributes.equipmentId || `E-${Date.now()}-${targetB.equipment.length}`,
                            definitionId: 'EQ_SERVER_1U',
                            name: op.attributes.name,
                            rackId: rack.id,
                            baseRMU: op.details.rmu || 1,
                            status: 'RETAIN',
                            ownerId: 'OWN_LUMEN'
                        });
                    }
                }
            }
        });
    } catch (e) {
        console.warn('Failed to load/process Plateville JSON:', e.message);
    }

    // 4. Save back to Cloud
    console.log('\n--- SAVING TO CLOUD ---');
    const { error: saveErr } = await supabase
        .from('workspaces')
        .update({
            data: ws,
            updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

    if (saveErr) {
        console.error('Failed to save to cloud:', saveErr.message);
    } else {
        console.log('SUCCESS: Full restoration complete.');
        console.log(`Final state: ${ws.sites.length} sites, ${ws.buildings.length} buildings.`);
    }
}

run();
