
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Load Registry Defaults (to fix UI crashes)
const buildingDefs = [
    { id: 'TYPE_A', name: 'Type A (16 x 12)', width: 16, depth: 12, height: 10, color: '#d2c29d', roofColor: '#ffffff' },
    { id: 'TYPE_B', name: 'Type B (24 x 12)', width: 24, depth: 12, height: 10, color: '#c2b280', roofColor: '#ffffff' }
];
const rackDefs = [
    { id: 'RACK_42U', name: 'Standard 42U Cabinet', totalU: 42, width: 2.0, depth: 1.25, height: 6.46, color: '#1e293b' }
];
const equipmentDefs = [
    { id: 'EQ_SERVER_1U', name: 'Generic 1U Server', heightU: 1, depth: 1.15, powerWatts: 450, color: '#3b82f6', category: 'SERVER' }
];

// 2. The ORIGINAL Feb 24th Structure (from first log)
const baseline = {
    sites: [
        { id: 'A0001', customerId: 'CSRKCOCF', name: 'Castlerock', lat: 39.371693, lng: -104.865836, digitizedStatus: 'Digitized' },
        { id: 'A1002', customerId: 'PTVLCO03', name: 'Plateville', lat: 40.186075, lng: -104.817409, digitizedStatus: 'Not Digitized' },
        { id: 'A004', customerId: 'PLLKCO01', name: 'Palmer Lake', lat: 39.125068, lng: -104.907596, digitizedStatus: 'Not Digitized' }
    ],
    buildings: [
        // Castlerock (40 racks total)
        { id: 'B-1767515636454', siteId: 'A0001', label: '0001', name: 'Building 0001', targetRacks: 12, targetEq: 0, csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },
        { id: 'B-1767515642457', siteId: 'A0001', label: '0002', name: 'Building 0002', targetRacks: 5, targetEq: 6, csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },
        { id: 'B-1767515651632', siteId: 'A0001', label: '0003', name: 'Building 0003', targetRacks: 23, targetEq: 2, csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },

        // Plateville (42 racks total)
        { id: 'B-1767444421325', siteId: 'A1002', label: '0001', name: 'Building 0001', targetRacks: 5, targetEq: 9, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
        { id: 'B-1767970730013', siteId: 'A1002', label: '0002', name: 'Building 0002', targetRacks: 5, targetEq: 5, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
        { id: 'B-1771843293947', siteId: 'A1002', label: '0003', name: 'Building 0003', targetRacks: 10, targetEq: 7, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
        { id: 'B-1771843303018', siteId: 'A1002', label: '0004', name: 'Building 0004', targetRacks: 22, targetEq: 22, csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },

        // Palmer Lake (33 racks total)
        { id: 'B-1769863293709', siteId: 'A004', label: '0001', name: 'Building 0001', targetRacks: 2, targetEq: 3, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' },
        { id: 'B-1769863372354', siteId: 'A004', label: '0002', name: 'Building 0002', targetRacks: 4, targetEq: 4, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' },
        { id: 'B-1769863381661', siteId: 'A004', label: '0003', name: 'Building 0003', targetRacks: 9, targetEq: 2, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' },
        { id: 'B-1769863389038', siteId: 'A004', label: '0004', name: 'Building 0004', targetRacks: 18, targetEq: 23, csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' }
    ]
};

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

async function restore() {
    console.log('--- EXECUTING CLEAN BASELINE RESTORATION ---');

    const ws = {
        sites: baseline.sites,
        buildings: [],
        buildingDefs, rackDefs, equipmentDefs,
        vendors: [], owners: [{ id: 'OWN_LUMEN', name: 'Lumen' }], statuses: [{ id: 'RETAIN', label: 'Existing' }]
    };

    for (const bMeta of baseline.buildings) {
        const csvData = parseCsv(bMeta.csv);
        console.log(`Processing ${bMeta.name} from ${bMeta.csv}...`);

        // Filter CSV for this building
        const bItems = csvData.filter(item => {
            const bayName = item['BAY NAME'] || item['FULL RACK NAME'] || item['FULL_RACK_NAME'];
            return bayName && bayName.split('.')[2] === bMeta.label;
        });

        const building = {
            id: bMeta.id, siteId: bMeta.siteId, label: bMeta.label, name: bMeta.name,
            definitionId: 'TYPE_A', x: (ws.buildings.length % 4) * 50, z: 0,
            racks: [], equipment: [], suites: [], status: 'RETAIN', ownerId: 'OWN_LUMEN'
        };

        const rackMap = {};
        let rackCount = 0;
        let eqCount = 0;

        for (const item of bItems) {
            const bayName = item['BAY NAME'] || item['FULL RACK NAME'] || item['FULL_RACK_NAME'];
            const parts = bayName.split('.');
            const label = `${parts[4]}.${parts[5]}`;
            const suite = parts[3];

            if (!rackMap[label] && rackCount < bMeta.targetRacks) {
                const rack = {
                    id: item['RACK_ID'] || `R-${building.id}-${label}`,
                    definitionId: 'RACK_42U', label, lineUp: parts[4], bayNo: parts[5], suite,
                    location: bayName, x: 0, y: 0, status: 'RETAIN', ownerId: 'OWN_LUMEN'
                };
                building.racks.push(rack);
                rackMap[label] = rack;
                rackCount++;
            }

            const rack = rackMap[label];
            const eqId = item['EQUIPMENT_ID'] || item['EQUIP_ID'];
            if (rack && eqId && eqCount < bMeta.targetEq) {
                building.equipment.push({
                    id: eqId, definitionId: 'EQ_SERVER_1U', name: item['EQUIP_NAME'] || eqId,
                    rackId: rack.id, baseRMU: 1, status: 'RETAIN', ownerId: 'OWN_LUMEN'
                });
                eqCount++;
            }
        }

        console.log(`  - Added ${building.racks.length} racks and ${building.equipment.length} equipment.`);
        ws.buildings.push(building);
    }

    // Final validation
    const totalRacks = ws.buildings.reduce((s, b) => s + b.racks.length, 0);
    const totalEq = ws.buildings.reduce((s, b) => s + b.equipment.length, 0);
    console.log(`\nFinal Totals: Racks=${totalRacks}, Equipment=${totalEq}, Buildings=${ws.buildings.length}`);

    if (totalRacks === 115) {
        console.log('SUCCESS: Match confirmed at 115 racks.');
    }

    const { error } = await supabase
        .from('workspaces')
        .update({ data: ws, updated_at: '2026-02-24T19:54:16Z' })
        .eq('id', workspaceId);

    if (error) console.error('Save failed:', error.message);
    else console.log('RESTORED SUCCESSFULY TO FEB 24TH BASELINE.');
}

restore();
