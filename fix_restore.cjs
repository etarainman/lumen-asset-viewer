
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

// Building Targets from Feb 24 Log
const buildingMeta = [
    { id: 'B-1767515636454', siteId: 'A0001', label: '0001', name: 'Building 0001', targetRacks: 12, targetEq: 0, csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },
    { id: 'B-1767515642457', siteId: 'A0001', label: '0002', name: 'Building 0002', targetRacks: 5, targetEq: 6, csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },
    { id: 'B-1767515651632', siteId: 'A0001', label: '0003', name: 'Building 0003', targetRacks: 23, targetEq: 2, csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },
    { id: 'B-1767444421325', siteId: 'A1002', label: '0001', name: 'Building 0001', targetRacks: 5, targetEq: 9, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
    { id: 'B-1767970730013', siteId: 'A1002', label: '0002', name: 'Building 0002', targetRacks: 5, targetEq: 5, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
    { id: 'B-1771843293947', siteId: 'A1002', label: '0003', name: 'Building 0003', targetRacks: 10, targetEq: 7, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
    { id: 'B-1771843303018', siteId: 'A1002', label: '0004', name: 'Building 0004', targetRacks: 22, targetEq: 22, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
    { id: 'B-1769863293709', siteId: 'A004', label: '0001', name: 'Building 0001', targetRacks: 2, targetEq: 3, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' },
    { id: 'B-1769863372354', siteId: 'A004', label: '0002', name: 'Building 0002', targetRacks: 4, targetEq: 4, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' },
    { id: 'B-1769863381661', siteId: 'A004', label: '0003', name: 'Building 0003', targetRacks: 9, targetEq: 2, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' },
    { id: 'B-1769863389038', siteId: 'A004', label: '0004', name: 'Building 0004', targetRacks: 18, targetEq: 23, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' }
];

function parseCsv(file) {
    if (!fs.existsSync(file)) return [];
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const parts = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h] = parts[i]?.trim());
        return obj;
    });
}

async function fixRestore() {
    console.log('--- RE-EXECUTING RESTORATION WITH CORRECT HEADERS ---');

    // 1. Fetch current workspace to merge/replace
    const { data: cloudRow } = await supabase.from('workspaces').select('data').eq('id', workspaceId).single();
    let ws = cloudRow.data;

    // Preserve definitions while replacing buildings
    ws.buildings = [];

    for (const bMeta of buildingMeta) {
        const csvData = parseCsv(bMeta.csv);
        console.log(`Processing ${bMeta.name} (${bMeta.label})...`);

        // Filter CSV for items in this building label
        const bItems = csvData.filter(item => {
            const bayName = item['BAY NAME'] || item['FULL RACK NAME'] || item['FULL_RACK_NAME'];
            return bayName && bayName.split('.')[2] === bMeta.label;
        });

        const building = {
            id: bMeta.id, siteId: bMeta.siteId, label: bMeta.label, name: bMeta.name,
            definitionId: 'TYPE_A', x: (ws.buildings.length % 5) * 50, z: 0,
            racks: [], equipment: [], suites: [], status: 'RETAIN', ownerId: 'OWN_LUMEN'
        };

        const rackMap = {};
        let rackTargeted = 0;
        let eqTargeted = 0;

        for (const item of bItems) {
            const bayName = item['BAY NAME'] || item['FULL RACK NAME'] || item['FULL_RACK_NAME'];
            const parts = bayName.split('.');
            const label = `${parts[4]}.${parts[5]}`;
            const suite = parts[3];

            if (!rackMap[label] && rackTargeted < bMeta.targetRacks) {
                const rack = {
                    id: item['RACK_ID'] || `R-${building.id}-${label}`,
                    definitionId: 'RACK_42U', label, lineUp: parts[4], bayNo: parts[5], suite,
                    location: bayName, x: rackTargeted * 4 - 20, y: 0, status: 'RETAIN', ownerId: 'OWN_LUMEN'
                };
                building.racks.push(rack);
                rackMap[label] = rack;
                rackTargeted++;
            }

            const rack = rackMap[label];
            const eqId = item['EQPT_ID'] || item['EQUIPMENT_ID'] || item['EQUIP_ID'];
            if (rack && eqId && eqTargeted < bMeta.targetEq) {
                building.equipment.push({
                    id: eqId, definitionId: 'EQ_SERVER_1U', name: item['EQUIPMENT NAME'] || eqId,
                    rackId: rack.id, baseRMU: 1, status: 'RETAIN', ownerId: 'OWN_LUMEN', vendorId: 'V_BBBB'
                });
                eqTargeted++;
            }
        }

        console.log(`  - Added ${building.racks.length} racks and ${building.equipment.length} eq.`);
        ws.buildings.push(building);
    }

    const rackT = ws.buildings.reduce((s, b) => s + b.racks.length, 0);
    const eqT = ws.buildings.reduce((s, b) => s + b.equipment.length, 0);
    console.log(`\nFinal Totals: Racks=${rackT}, Equipment=${eqT}`);

    const { error } = await supabase
        .from('workspaces')
        .update({ data: ws, updated_at: '2026-02-24T19:54:16Z' })
        .eq('id', workspaceId);

    if (error) console.error('Save failed:', error.message);
    else console.log('CLEAN BASELINE RESTORED.');
}

fixRestore();
