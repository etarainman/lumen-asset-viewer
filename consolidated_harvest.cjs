
const fs = require('fs');
const path = require('path');

// 1. Sources
const feb22CodePath = 'tmp_restore_feb22_full/components/InventoryPanel.tsx';
const csvDir = 'Ray notes and files/PRO Inventory CSVs';
const csvFiles = [
    'CSRKCOCF_CSV.csv',
    'PLLKCO01_PRO_LOOKUP_07-16-20205.csv',
    'PTVLCO03_PRO_Inventory_CSV.csv'
];

const vendorSet = new Set();
const modelSet = new Map(); // Key -> { vendor, model, depth, heightU }

function harvest() {
    console.log('--- CONSOLIDATED ADMIN HARVEST (FEB 22 CODE + CSVS) ---');

    // A. Parse Feb 22 Source Code
    if (fs.existsSync(feb22CodePath)) {
        const code = fs.readFileSync(feb22CodePath, 'utf8');

        // Match the KNOWN_VENDORS array
        const vendorListMatch = code.match(/const KNOWN_VENDORS = \[(.*?)\];/s);
        if (vendorListMatch) {
            const list = vendorListMatch[1].split(',').map(v => v.replace(/['"\s]/g, '').trim()).filter(v => v);
            list.forEach(v => vendorSet.add(v.toUpperCase()));
            console.log(`Harvested ${list.length} vendors from InventoryPanel.tsx`);
        }

        // Match the model parsing logic (keywords)
        const keywordMatches = code.matchAll(/model: '(.*?)'/g);
        for (const match of keywordMatches) {
            const m = match[1];
            if (m !== 'Unidentified') {
                const key = `GENERIC_${m.replace(/\s+/g, '_').toUpperCase()}`;
                if (!modelSet.has(key)) {
                    modelSet.set(key, { vendor: 'GENERIC', model: m, depth: 8, heightU: 1 });
                }
            }
        }
    }

    // B. Parse CSVs for Real-World Inventory
    csvFiles.forEach(file => {
        const filePath = path.join(csvDir, file);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const headers = lines[0].split(',');

        const idxEqName = headers.indexOf('EQUIPMENT NAME');
        const idxEqW = headers.indexOf('EQPT-W');
        const idxEqH = headers.indexOf('EQPT-H');
        const idxEqD = headers.indexOf('EQPT-D');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(',');
            const fullEqName = cols[idxEqName]?.trim();

            if (fullEqName && fullEqName !== 'EQUIPMENT NAME') {
                const parts = fullEqName.split('.');
                if (parts.length >= 3) {
                    let vendor = parts[1].trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
                    let model = parts[2].trim();

                    if (vendor && vendor.length > 2 && vendor !== 'SITE') {
                        vendorSet.add(vendor);
                        const key = `${vendor}_${model}`.toUpperCase();
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

    fs.writeFileSync('master_admin_registry.json', JSON.stringify(finalData, null, 2));
    console.log('Results saved to master_admin_registry.json');
}

harvest();
