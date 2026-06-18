
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCsv(filePath) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const headers = lines[0].split(',');
    const results = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const currentline = lines[i].split(',');
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j].trim()] = currentline[j]?.trim();
        }
        results.push(obj);
    }
    return results;
}

// Map Site Configs
const sitesConfig = [
    { id: 'A0001', customerId: 'CSRKCOCF', name: 'Castlerock', csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },
    { id: 'A1002', customerId: 'PTVLCO03', name: 'plateville', csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
    { id: 'A004', customerId: 'PLLKCO01', name: 'Palmer Lake', csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' }
];

async function run() {
    console.log('--- STARTING CSV-BASED DEEP RESTORATION ---');

    const { data: cloudRow, error: fetchErr } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

    if (fetchErr) return console.error('Fetch failed:', fetchErr.message);

    let ws = cloudRow.data;
    ws.sites = sitesConfig.map(s => ({ ...s, lat: ws.sites.find(os => os.id === s.id)?.lat || 0, lng: ws.sites.find(os => os.id === s.id)?.lng || 0 }));

    for (const site of sitesConfig) {
        console.log(`\nSite: ${site.name} (${site.id})`);
        if (!fs.existsSync(site.csv)) {
            console.warn(`  - CSV not found: ${site.csv}`);
            continue;
        }

        const items = parseCsv(site.csv);
        console.log(`  - CSV loaded: ${items.length} items`);

        items.forEach(item => {
            const bayName = item['BAY NAME'] || item['FULL RACK NAME'];
            if (!bayName) return;

            // Parser: CLLI.Floor.Building.Suite.LineUp.Bay
            const parts = bayName.split('.');
            if (parts.length < 6) return;

            const bLabel = parts[2];
            const suite = parts[3];
            const lineUp = parts[4];
            const bayNo = parts[5];
            const label = `${lineUp}.${bayNo}`;

            // 1. Ensure Building exists
            let b = ws.buildings.find(b => b.siteId === site.id && b.label === bLabel);
            if (!b) {
                console.log(`  - Creating Building ${bLabel}`);
                b = {
                    id: `B-${site.id}-${bLabel}-${Date.now()}`,
                    siteId: site.id,
                    name: `Building ${bLabel}`,
                    label: bLabel,
                    definitionId: 'TYPE_A',
                    x: (ws.buildings.length % 5) * 40,
                    z: Math.floor(ws.buildings.length / 5) * 30,
                    racks: [],
                    equipment: [],
                    suites: [],
                    status: 'RETAIN',
                    ownerId: 'OWN_LUMEN'
                };
                ws.buildings.push(b);
            }

            // 2. Ensure Rack exists
            let rack = b.racks.find(r => r.label === label && r.suite === suite);
            if (!rack) {
                rack = {
                    id: item['RACK_ID'] || item['FULL RACK NAME'] || `R-${b.id}-${label}-${Date.now()}`,
                    definitionId: 'RACK_42U',
                    label: label,
                    lineUp: lineUp,
                    bayNo: bayNo,
                    suite: suite,
                    location: bayName,
                    x: b.racks.length * 4 - 20,
                    y: 0,
                    status: 'RETAIN',
                    ownerId: 'OWN_LUMEN'
                };
                b.racks.push(rack);
            }

            // 3. Ensure Equipment exists if present
            const eqId = item['EQUIPMENT_ID'] || item['EQUIP_ID'];
            const eqName = item['EQUIP_NAME'] || item['EQUIPMENT Name'] || item['EQUIPMENT_ID'];

            if (eqId && eqName) {
                if (!b.equipment.some(e => e.id === eqId)) {
                    b.equipment.push({
                        id: eqId,
                        definitionId: 'EQ_SERVER_1U',
                        name: eqName,
                        rackId: rack.id,
                        baseRMU: parseInt(item['U_POSITION'] || item['RMU'] || '1') || 1,
                        status: 'RETAIN',
                        ownerId: 'OWN_LUMEN'
                    });
                }
            }
        });
    }

    console.log('\n--- FINAL SYNC TO CLOUD ---');
    const { error: saveErr } = await supabase
        .from('workspaces')
        .update({ data: ws, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

    if (saveErr) {
        console.error('Update failed:', saveErr.message);
    } else {
        console.log('SUCCESS: CSV Deep Restoration Complete.');
        console.log(`Final Totals: Racks=${ws.buildings.reduce((s, b) => s + b.racks.length, 0)}, Eq=${ws.buildings.reduce((s, b) => s + b.equipment.length, 0)}`);
    }
}

run();
