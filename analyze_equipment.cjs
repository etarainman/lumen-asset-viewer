
const fs = require('fs');
const path = 'c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/Ray notes and files/Equipment Names in PRO CSV.csv';

const parseEquipmentName = (nameString) => {
    if (!nameString) return { vendor: 'Unknown', model: 'Unidentified' };

    const parts = nameString.split('.');
    const token1 = parts[1]?.toUpperCase()?.trim() || '';
    const token2 = parts[2]?.trim() || '';

    const KNOWN_VENDORS = ['HUAWEI', 'INFINERA', 'CIENA', 'CISCO', 'ADVA', 'ABB', 'JUNIPER', 'CANOGA', 'EATON', 'FUJITSU', 'NOKIA', 'ALCATEL', 'LUCENT'];

    if (KNOWN_VENDORS.includes(token1)) {
        return { vendor: token1, model: token2 || 'Generic' };
    }

    const nameUpper = nameString.toUpperCase();
    if (nameUpper.includes('OSPOSX')) return { vendor: 'Generic', model: 'Optical Splitter (OSPOSX)' };
    if (nameUpper.includes('GWYOSX')) return { vendor: 'Generic', model: 'Optical Gateway (GWYOSX)' };
    if (nameUpper.includes('FAP')) return { vendor: 'Generic', model: 'Fiber Adapter Panel' };
    if (nameUpper.includes('AC-PNL')) return { vendor: 'Eaton', model: 'AC Panel' };
    if (nameUpper.includes('BDFB')) return { vendor: 'Generic', model: 'Power Dist (BDFB)' };
    if (nameUpper.includes('FDP') || nameUpper.includes('TXCFDP') || nameUpper.includes('GWYFDP')) return { vendor: 'Generic', model: 'Fiber Dist Panel' };
    if (nameUpper.includes('ISPR45')) return { vendor: 'Generic', model: 'ISPR Frame' };
    if (nameUpper.includes('OSPOCP')) return { vendor: 'Generic', model: 'OSP OCP Frame' };

    return { vendor: 'Unknown', model: 'Unidentified Device' };
};

try {
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split(/\r?\n/).filter(l => l.trim().length > 0);

    const unique = new Map();

    lines.forEach(line => {
        const { vendor, model } = parseEquipmentName(line);
        const key = `${vendor}|${model}`;
        if (!unique.has(key)) {
            unique.set(key, { vendor, model, count: 0 });
        }
        unique.get(key).count++;
    });

    console.log('| Vendor | Model | Count | Proposed ID |');
    console.log('|---|---|---|---|');
    Array.from(unique.values()).sort((a, b) => a.vendor.localeCompare(b.vendor)).forEach(item => {
        const safeModel = item.model.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        const id = `EQ_${item.vendor.toUpperCase()}_${safeModel}`;
        console.log(`| ${item.vendor} | ${item.model} | ${item.count} | ${id} |`);
    });

} catch (err) {
    console.error(err);
}
