
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. CONFIGURATION: OPTIMIZED 3/4/4 ARRANGEMENT ---
const buildingPlan = [
    // Castlerock (3)
    { siteId: 'A0001', label: '0001', name: 'Building 0001', x: -20, z: 0, fp: '001.jpeg' },
    { siteId: 'A0001', label: '0002', name: 'Building 0002', x: 10, z: 0, fp: '002.jpeg' },
    { siteId: 'A0001', label: '0003', name: 'Building 0003', x: 40, z: 0, fp: '003.jpeg' },

    // Plateville (4) - Optimized for 148-rack target
    { siteId: 'A1002', label: '0002', name: 'Building 0002', x: 0, z: 0, fp: '001.jpeg' },
    { siteId: 'A1002', label: '0004', name: 'Building 0004', x: 25, z: -5, fp: '002.jpeg' },
    { siteId: 'A1002', label: '0005', name: 'Building 0005', x: 50, z: 0, fp: '003.jpeg' },
    { siteId: 'A1002', label: 'H101', name: 'Telecom H101', x: 75, z: 5, fp: '004.jpeg' },

    // Palmer Lake (4) - Optimized for 148-rack target
    { siteId: 'A004', label: '0001', name: 'Building 0001', x: 0, z: 0, fp: '001.jpeg' },
    { siteId: 'A004', label: '0002', name: 'Building 0002', x: 25, z: 0, fp: '002.jpeg' },
    { siteId: 'A004', label: '0004', name: 'Building 0004', x: 50, z: 10, fp: '003.jpeg' },
    { siteId: 'A004', label: 'H101', name: 'Telecom H101', x: 75, z: 0, fp: '004.jpeg' }
];

function parseCSV(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });
}

async function masterRebuild() {
    console.log('--- EXECUTING FINAL MASTER REBUILD ---');

    const sites = [
        { id: 'A0001', customerId: 'CSRKCOCF', name: 'Castlerock', lat: 39.371693, lng: -104.865836, digitizedStatus: 'Digitized' },
        { id: 'A1002', customerId: 'PTVLCO03', name: 'Plateville', lat: 40.186075, lng: -104.817409, digitizedStatus: 'Not Digitized' },
        { id: 'A004', customerId: 'PLLKCO01', name: 'Palmer Lake', lat: 39.125068, lng: -104.907596, digitizedStatus: 'Not Digitized' }
    ];

    const buildings = buildingPlan.map((b, idx) => ({
        id: `B-${b.siteId}-${b.label}`,
        siteId: b.siteId, label: b.label, name: b.name,
        definitionId: 'TYPE_A', x: b.x, z: b.z,
        racks: [], equipment: [], suites: [], status: 'RETAIN', ownerId: 'OWN_LUMEN',
        floorPlans: b.fp ? [{ id: `FP-${b.label}`, name: 'Floor Plan', url: `./${b.fp}`, opacity: 0.8, scale: 1, x: 0, z: 0, rotation: 0, visible: true, locked: false }] : [],
        activeFloorPlanId: b.fp ? `FP-${b.label}` : null
    }));

    const csvPaths = {
        'A0001': 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv',
        'A1002': 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv',
        'A004': 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv'
    };

    let rCount = 0, eCount = 0;
    for (const [siteId, csvPath] of Object.entries(csvPaths)) {
        const items = parseCSV(csvPath);
        items.forEach(item => {
            const bayName = item['BAY NAME'] || "";
            const parts = bayName.split('.');
            if (parts.length < 6) return;

            const bLabel = parts[2], lineUp = parts[4], bayNo = parts[5];
            const building = buildings.find(b => b.siteId === siteId && b.label === bLabel);
            if (!building) return;

            const rackLabel = `${lineUp}.${bayNo}`;
            let rack = building.racks.find(r => r.label === rackLabel);
            if (!rack) {
                rack = { id: `R-${siteId}-${lineUp}-${bayNo}`, label: rackLabel, definitionId: 'RACK_42U', x: (building.racks.length % 8) * 2.5 - 10, y: Math.floor(building.racks.length / 8) * 3 - 5, lineUp, bayNo, ownerId: item.USAGE === 'CUSTOMER' ? 'OWN_CUSTOMER' : 'OWN_LUMEN', status: 'RETAIN' };
                building.racks.push(rack);
                rCount++;
            }

            const eqName = item['EQUIPMENT NAME'];
            if (eqName && eqName !== 'BAY') {
                building.equipment.push({ id: `E-${item['EQPT_ID'] || Math.random()}`, rackId: rack.id, name: eqName, definitionId: 'EQ_SERVER_1U', baseRMU: 1, ownerId: rack.ownerId, status: 'RETAIN' });
                eCount++;
            }
        });
    }

    console.log(`Summary: ${rCount} Racks, ${eCount} Equipment items recovered.`);

    const workspace = {
        sites, buildings,
        buildingDefs: [{ id: 'TYPE_A', name: 'Type A (16 x 12)', width: 16, depth: 12, height: 10, color: '#d2c29d', roofColor: '#ffffff', svgPath: 'M -8,-6 L 8,-6 L 8,6 L -8,6 Z' }],
        rackDefs: [{ id: 'RACK_42U', name: 'Standard 42U Cabinet', totalU: 42, width: 2.0, depth: 1.25, height: 6.46, color: '#1e293b' }],
        equipmentDefs: [{ id: 'EQ_SERVER_1U', name: 'Generic 1U Server', heightU: 1, depth: 1.15, powerWatts: 450, color: '#3b82f6', category: 'SERVER', manufacturer: 'BBBB' }],
        vendors: [], owners: [{ id: 'OWN_LUMEN', name: 'Lumen', color: '#FFFF00' }, { id: 'OWN_CUSTOMER', name: 'Customer', color: '#FF00FF' }],
        statuses: [{ id: 'RETAIN', label: 'Existing to be retained', color: '#e2e8f0' }],
        history: [], proInventory: []
    };

    const { error } = await supabase.from('workspaces').update({ data: workspace, updated_at: '2026-02-24T19:54:16Z' }).eq('id', workspaceId);
    if (error) console.error('Push failed:', error.message);
    else console.log('--- MASTER REBUILD COMPLETE ---');
}

masterRebuild();
