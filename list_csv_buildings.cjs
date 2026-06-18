
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
    const labels = new Set();

    lines.slice(1).forEach(line => {
        const bayName = line.split(',')[4] || ""; // BAY NAME is 5th column
        const parts = bayName.split('.');
        if (parts.length >= 3) {
            labels.add(parts[2]);
        }
    });

    console.log(`File: ${path}`);
    console.log(`Labels: ${Array.from(labels).sort().join(', ')}`);
});
