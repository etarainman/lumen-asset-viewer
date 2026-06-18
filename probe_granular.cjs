
const fs = require('fs');

const csvPaths = [
    'Ray notes and files/PRO Inventory CSVs/CSRKCOCF_CSV.csv',
    'Ray notes and files/PRO Inventory CSVs/PTVLCO03_PRO_Inventory_CSV.csv',
    'Ray notes and files/PRO Inventory CSVs/PLLKCO01_PRO_LOOKUP_07-16-20205.csv'
];

csvPaths.forEach(path => {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split(/\r?\n/);

    const counts = {};
    const racksSeen = new Set();

    lines.slice(1).forEach(line => {
        const cols = line.split(',');
        if (cols.length < 6) return;
        const bayName = cols[4];
        const parts = bayName.split('.');
        if (parts.length >= 6) {
            const bLabel = parts[2];
            const lineUp = parts[4];
            const bayNo = parts[5];
            const rackKey = `${bLabel}.${lineUp}.${bayNo}`;

            if (!racksSeen.has(rackKey)) {
                racksSeen.add(rackKey);
                counts[bLabel] = (counts[bLabel] || 0) + 1;
            }
        }
    });

    console.log(`File: ${path}`);
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
        console.log(`  Building ${label}: ${count} racks`);
    });
});
