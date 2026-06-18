
const fs = require('fs');
const path = require('path');

const csvDir = 'Ray notes and files/PRO Inventory CSVs';
const csvFiles = [
    '250223 - CSRKCOCF_CSV-SUPPLIED.csv',
    '250223 - PLLKCO01_CSV-SUPPLIED.csv',
    '250223 - PTVLCO03_CSV-SUPPLIED.csv'
];

const vendorSet = new Set();
const modelSet = new Map(); // Model -> { vendor, height, depth, width }
const rackSet = new Map(); // RackID -> { width, height, depth }

function harvest() {
    console.log('--- STARTING DEEP CSV HARVEST ---');

    csvFiles.forEach(file => {
        const filePath = path.join(csvDir, file);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const headers = lines[0].split(',');

        const idxName = headers.indexOf('EQUIPMENT NAME');
        const idxVendor = headers.indexOf('VENDOR NAME'); // Some CSVs have this
        const idxEqW = headers.indexOf('EQPT-W');
        const idxEqH = headers.indexOf('EQPT-H');
        const idxEqD = headers.indexOf('EQPT-D');
        const idxRackW = headers.indexOf('RACK-W');
        const idxRackH = headers.indexOf('RACK-H');
        const idxRackD = headers.indexOf('RACK-D');
        const idxRackId = headers.indexOf('RACK ID');

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            // Basic CSV parse (handles simple commas)
            const cols = lines[i].split(',');
            const eqName = cols[idxName]?.trim();
            const rackId = cols[idxRackId]?.trim();

            if (eqName && eqName !== 'EQUIPMENT NAME') {
                // Logic: Site.Vendor.Model.ID... or Site - Vendor - Model
                const parts = eqName.split('.');
                if (parts.length >= 3) {
                    const vendor = parts[1].trim();
                    const model = parts[2].trim();

                    if (vendor && vendor !== '###' && vendor !== 'O##') {
                        vendorSet.add(vendor);
                        if (!modelSet.has(model)) {
                            modelSet.set(model, {
                                vendor,
                                name: model,
                                width: parseFloat(cols[idxEqW]) || 600,
                                heightU: Math.ceil(parseFloat(cols[idxEqH]) / 44.45) || 1,
                                depth: parseFloat(cols[idxEqD]) || 800
                            });
                        }
                    }
                }
            }

            if (rackId) {
                if (!rackSet.has(rackId)) {
                    rackSet.set(rackId, {
                        width: parseFloat(cols[idxRackW]) || 600,
                        height: parseFloat(cols[idxRackH]) || 2000,
                        depth: parseFloat(cols[idxRackD]) || 1070
                    });
                }
            }
        }
    });

    console.log(`\nHarvested ${vendorSet.size} Unique Vendors:`);
    console.log(Array.from(vendorSet).sort());

    console.log(`\nHarvested ${modelSet.size} Unique Equipment Models:`);
    console.log(Array.from(modelSet.keys()).sort().slice(0, 10), '...');

    const data = {
        vendors: Array.from(vendorSet).map(v => ({ id: `V_${v}`, name: v, color: '#64748b' })),
        equipmentModels: Array.from(modelSet.values()).map(m => ({
            id: `EQ_${m.vendor}_${m.name}`.replace(/\s+/g, '_'),
            name: `${m.vendor} ${m.name}`,
            manufacturer: m.vendor,
            depth: m.depth,
            heightU: m.heightU,
            category: 'NETWORK',
            color: '#3b82f6'
        }))
    };

    fs.writeFileSync('harvested_admin.json', JSON.stringify(data, null, 2));
    console.log('\nSUCCESS: Solid records saved to harvested_admin.json');
}

harvest();
