
const fs = require('fs');

function count(file) {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const racks = (data.operations?.create || []).filter(op => op.type === 'RACK').length;
        console.log(`${file}: ${racks} racks`);
        return racks;
    } catch (e) {
        console.error(`Error ${file}: ${e.message}`);
        return 0;
    }
}

let total = 0;
total += count('Ray notes and files/Outputs/260223 - Castlerock_Inventory_Instructions.json');
total += count('Ray notes and files/Outputs/260223 - PalmerLake_Inventory_Instructions.json');
total += count('Ray notes and files/Outputs/260223 - Plateville_Inventory_Instructions.json');

console.log('Total:', total);
