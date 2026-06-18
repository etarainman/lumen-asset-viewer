
const fs = require('fs');

async function exportToCSV() {
    console.log('--- GENERATING CSV EXPORTS FOR EXCEL CLEANUP ---');

    // Pull the latest consolidated JSON we built
    const data = JSON.parse(fs.readFileSync('master_admin_registry.json', 'utf8'));

    // 1. Vendors CSV
    let vendorsCsv = 'id,name,color\n';
    data.vendors.forEach(v => {
        vendorsCsv += `"${v.id}","${v.name}","${v.color}"\n`;
    });
    fs.writeFileSync('vendors_audit.csv', vendorsCsv);
    console.log('Generated: vendors_audit.csv');

    // 2. Equipment Models CSV
    // Fields: id, name, manufacturer, heightU, depth, powerWatts, color, category
    let eqCsv = 'id,name,manufacturer,heightU,depth,powerWatts,color,category\n';
    data.equipmentModels.forEach(m => {
        // Defaults if missing
        const power = m.powerWatts || 0;
        const color = m.color || '#3b82f6';
        const cat = m.category || 'NETWORK';

        eqCsv += `"${m.id}","${m.name}","${m.manufacturer}",${m.heightU},${m.depth},${power},"${color}","${cat}"\n`;
    });
    fs.writeFileSync('equipment_audit.csv', eqCsv);
    console.log('Generated: equipment_audit.csv');

    console.log('\nSUCCESS: Please open these files in Excel, clean them up, and save them back as CSV.');
}

exportToCSV();
