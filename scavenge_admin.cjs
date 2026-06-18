
const fs = require('fs');
const path = require('path');

const files = [
    'Ray notes and files/Outputs/260223 - Castlerock_Inventory_Instructions.json',
    'Ray notes and files/Outputs/260223 - Plateville_Inventory_Instructions.json'
];

const vendors = new Set();
const eqTypes = new Set();

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    const content = fs.readFileSync(f, 'utf8');
    if (content.startsWith('<!doctype')) return;

    const data = JSON.parse(content);

    // Scan creates
    (data.operations?.create || []).forEach(op => {
        if (op.attributes?.vendorId) vendors.add(op.attributes.vendorId);
        if (op.attributes?.vendorName) vendors.add(op.attributes.vendorName);
        if (op.type === 'EQUIPMENT') eqTypes.add(op.name);
    });

    // Scan deletes (original items)
    (data.operations?.delete || []).forEach(del => {
        if (del.original?.vendorName) vendors.add(del.original.vendorName);
        if (del.original?.type === 'EQUIPMENT') eqTypes.add(del.original.name);
    });
});

console.log('--- DISCOVERED VENDORS ---');
console.log(Array.from(vendors).sort());

console.log('\n--- DISCOVERED EQUIPMENT TYPES ---');
console.log(Array.from(eqTypes).sort());
