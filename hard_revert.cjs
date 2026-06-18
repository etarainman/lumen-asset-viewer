
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function revert() {
    console.log('--- REVERTING TO FEB 24 BASELINE ---');

    // Define the baseline Sites (The state from the start of today)
    const sites = [
        { id: 'A0001', customerId: 'CSRKCOCF', name: 'Castlerock', lat: 39.371693, lng: -104.865836, digitizedStatus: 'Digitized' },
        { id: 'A1002', customerId: 'PTVLCO03', name: 'plateville', lat: 40.186075, lng: -104.817409, digitizedStatus: 'Not Digitized' },
        { id: 'A004', customerId: 'PLLKCO01', name: 'Palmer Lake', lat: 39.125068, lng: -104.907596, digitizedStatus: 'Not Digitized' }
    ];

    // Initialize clean workspace
    let ws = {
        sites: sites,
        buildings: [],
        buildingDefs: [],
        rackDefs: [],
        equipmentDefs: [],
        vendors: [],
        owners: [],
        statuses: [],
        history: [],
        proInventory: []
    };

    // Load definitions from local constants/types
    // (In a real app these would be the defaults)

    // Restoration function for Site Data from Feb 23 JSONs
    function processSnapshot(filePath, siteId) {
        try {
            if (!fs.existsSync(filePath)) return;
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const ops = data.operations?.create || [];

            // Reconstruct the 4 core buildings (0001-0004)
            ['0001', '0002', '0003', '0004'].forEach(label => {
                const bId = `B-${siteId}-${label}`;
                const b = {
                    id: bId,
                    siteId: siteId,
                    label: label,
                    name: `Building ${label}`,
                    definitionId: 'TYPE_A',
                    x: (ws.buildings.length % 4) * 50,
                    z: 0,
                    racks: [],
                    equipment: [],
                    suites: [],
                    status: 'RETAIN',
                    ownerId: 'OWN_LUMEN'
                };
                ws.buildings.push(b);
            });

            // Map Racks/Equipment back to these buildings (Only for Feb 24 state)
            ops.forEach(op => {
                const bLabel = op.attributes.building || op.details.building;
                if (!['0001', '0002', '0003', '0004'].includes(bLabel)) return;

                const b = ws.buildings.find(x => x.siteId === siteId && x.label === bLabel);
                if (b) {
                    if (op.type === 'RACK') {
                        b.racks.push({
                            id: op.attributes.rackId || `R-${b.id}-${op.details.label}`,
                            definitionId: 'RACK_42U',
                            label: op.details.label,
                            lineUp: op.details.lineUp,
                            bayNo: op.details.bayNo,
                            suite: op.details.suite || "",
                            location: `${siteId}.001.${bLabel}..${op.details.lineUp}.${op.details.bayNo}`,
                            x: b.racks.length * 4 - 20,
                            y: 0,
                            status: 'RETAIN',
                            ownerId: 'OWN_LUMEN'
                        });
                    } else if (op.type === 'EQUIPMENT') {
                        const rack = b.racks.find(r => r.label === op.details.rack);
                        if (rack) {
                            b.equipment.push({
                                id: op.attributes.equipmentId || `E-${Date.now()}-${b.equipment.length}`,
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
            console.error(`Error processing ${filePath}:`, e.message);
        }
    }

    processSnapshot('Ray notes and files/Outputs/260223 - Plateville_Inventory_Instructions.json', 'A1002');
    processSnapshot('Ray notes and files/Outputs/260223 - PalmerLake_Inventory_Instructions.json', 'A004');

    // Push clean reset to Supabase
    console.log('\n--- OVERWRITING SUPABASE WITH FEB 24 STATE ---');
    const { error } = await supabase
        .from('workspaces')
        .update({
            data: ws,
            updated_at: '2026-02-24T19:54:16Z' // Revert timestamp
        })
        .eq('id', workspaceId);

    if (error) {
        console.error('Reversion failed:', error.message);
    } else {
        console.log('SUCCESS: Workspace reverted to Feb 24 baseline.');
        console.log(`Final State: ${ws.buildings.length} buildings, ${ws.buildings.reduce((s, b) => s + b.racks.length, 0)} racks.`);
    }
}

revert();
