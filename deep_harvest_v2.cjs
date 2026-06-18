
const fs = require('fs');
const path = require('path');

const csvDir = 'Ray notes and files/PRO Inventory CSVs';
const csvFiles = [
    'CSRKCOCF_CSV.csv',
    'PLLKCO01_PRO_LOOKUP_07-16-20205.csv',
    'PTVLCO03_PRO_Inventory_CSV.csv'
];

const vendorSet = new Set();
const modelSet = new Map(); // Key -> { vendor, model, depth, heightU }

function harvest() {
    console.log('--- STARTING PRECISION CSV HARVEST ---');

    csvFiles.forEach(file => {
        const filePath = path.join(csvDir, file);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const headers = lines[0].split(',');

        // Map indices
        const idxEqName = headers.indexOf('EQUIPMENT NAME');
        const idxEqW = headers.indexOf('EQPT-W');
        const idxEqH = headers.indexOf('EQPT-H');
        const idxEqD = headers.indexOf('EQPT-D');

        console.log(`Processing ${file} (${lines.length} lines)...`);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(',');
            const fullEqName = cols[idxEqName]?.trim();

            if (fullEqName && fullEqName !== 'EQUIPMENT NAME') {
                // Format: SITE.VENDOR.MODEL.ID...
                const parts = fullEqName.split('.');
                if (parts.length >= 3) {
                    let vendor = parts[1].trim();
                    let model = parts[2].trim();

                    // Clean vendor names (strip symbols)
                    vendor = vendor.replace(/[^A-Z0-9]/gi, '');
                    if (vendor && vendor.length > 2) {
                        vendorSet.add(vendor);
                        const key = `${vendor}_${model}`;
                        if (!modelSet.has(key)) {
                            modelSet.set(key, {
                                vendor,
                                model,
                                depth: parseFloat(cols[idxEqD]) || 8,
                                heightU: Math.ceil(parseFloat(cols[idxEqH])) || 1
                            });
                        }
                    }
                }
            }
        }
    });

    console.log(`\nSUCCESS: Harvested ${vendorSet.size} Vendors and ${modelSet.size} Models.`);

    const finalData = {
        vendors: Array.from(vendorSet).map(v => ({ id: `V_${v.toUpperCase()}`, name: v, color: '#64748b' })),
        equipmentModels: Array.from(modelSet.values()).map(m => ({
            id: `EQ_${m.vendor}_${m.model}`.replace(/[^A-Z0-9_]/gi, '_').toUpperCase(),
            name: m.model,
            manufacturer: m.vendor,
            depth: m.depth,
            heightU: m.heightU,
            category: 'NETWORK',
            color: '#3b82f6'
        }))
    };

    fs.writeFileSync('harvested_admin_v2.json', JSON.stringify(finalData, null, 2));
    console.log('Results saved to harvested_admin_v2.json');
}

harvest();
