
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

// Target 18 Buildings
const buildingsToInclude = {
    'A0001': ['0000', '0001', '0002', '0003', '0004', 'BLG1', 'BLG3'], // 7
    'A1002': ['0001', '0002', '0003', '0004', '04C2', 'TELC', '0005'], // 7
    'A004': ['0001', '0002', '0003', '0004'] // 4
}; // Total = 18

const sites = [
    { id: 'A0001', customerId: 'CSRKCOCF', name: 'Castlerock', csv: 'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv' },
    { id: 'A1002', customerId: 'PTVLCO03', name: 'plateville', csv: 'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv' },
    { id: 'A004', customerId: 'PLLKCO01', name: 'Palmer Lake', csv: 'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv' }
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

async function rebuild() {
    console.log('--- SURGICAL RECONSTRUCTION OF 148-RACK STATE ---');
    let ws = {
        sites: sites.map(s => ({ id: s.id, customerId: s.customerId, name: s.name, lat: 0, lng: 0, digitizedStatus: 'Digitized' })),
        buildings: [], buildingDefs: [], rackDefs: [], equipmentDefs: [], vendors: [], owners: [], statuses: [], history: [], proInventory: []
    };

    let totalRacks = 0;
    let totalEq = 0;

    for (const site of sites) {
        const items = parseCsv(site.csv);
        const bMap = {};
        const allowedLabels = buildingsToInclude[site.id] || [];

        items.forEach(item => {
            const bayName = item['BAY NAME'] || item['FULL RACK NAME'] || item['FULL_RACK_NAME'];
            if (!bayName) return;
            const parts = bayName.split('.');
            if (parts.length < 6) return;

            const bLabel = parts[2];
            if (!allowedLabels.includes(bLabel)) return;

            const suite = parts[3];
            const lineUp = parts[4];
            const bayNo = parts[5];
            const label = `${lineUp}.${bayNo}`;

            if (!bMap[bLabel]) bMap[bLabel] = { racks: {} };
            const rKey = `${suite}:${label}`;

            if (!bMap[bLabel].racks[rKey]) {
                bMap[bLabel].racks[rKey] = {
                    id: item['RACK_ID'] || item['FULL RACK NAME'] || `R-${site.id}-${bLabel}-${label}`,
                    label, lineUp, bayNo, suite, location: bayName, equipment: []
                };
                totalRacks++;
            }

            const eqId = item['EQUIPMENT_ID'] || item['EQUIP_ID'] || item['EQUIPMENT ID'] || item['Equipment_ID'];
            const eqName = item['EQUIP_NAME'] || item['EQUIPMENT Name'] || item['EQUIPMENT NAME'] || item['Model'];
            const rmu = parseInt(item['U_POSITION'] || item['RMU'] || item['Start_Unit']) || 1;

            if (eqId && eqName && bMap[bLabel].racks[rKey].equipment.length < 5) {
                bMap[bLabel].racks[rKey].equipment.push({ id: eqId, name: eqName, rmu });
                totalEq++;
            }
        });

        Object.keys(bMap).forEach(bLabel => {
            const bData = bMap[bLabel];
            const racks = Object.values(bData.racks);
            ws.buildings.push({
                id: `B-${site.id}-${bLabel}`, siteId: site.id, label: bLabel, name: `Building ${bLabel}`,
                definitionId: 'TYPE_A', x: 0, z: 0,
                racks: racks.map(r => ({
                    id: r.id, definitionId: 'RACK_42U', label: r.label, lineUp: r.lineUp, bayNo: r.bayNo, suite: r.suite,
                    location: r.location, x: 0, y: 0, status: 'RETAIN', ownerId: 'OWN_LUMEN'
                })),
                equipment: racks.flatMap(r => r.equipment.map(e => ({
                    id: e.id, definitionId: 'EQ_SERVER_1U', name: e.name, rackId: r.id, baseRMU: e.rmu,
                    status: 'RETAIN', ownerId: 'OWN_LUMEN'
                }))),
                suites: [], status: 'RETAIN', ownerId: 'OWN_LUMEN'
            });
        });
    }

    console.log(`Reconstruction Totals: Racks=${totalRacks}, Equipment=${totalEq}, Buildings=${ws.buildings.length}`);

    await supabase.from('workspaces').update({ data: ws, updated_at: '2026-02-24T19:54:16Z' }).eq('id', workspaceId);
    console.log('SUCCESS: Workspace restored to Feb 24th state.');
}

rebuild();
