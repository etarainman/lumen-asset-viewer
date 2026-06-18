
const fs = require('fs');
const path = require('path');

const backupFile = process.argv[2];

if (!backupFile) {
    console.log('Usage: node audit_backup.cjs backups/your_backup_file.json');
    process.exit(1);
}

if (!fs.existsSync(backupFile)) {
    console.log('File not found:', backupFile);
    process.exit(1);
}

try {
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    console.log('\n==========================================');
    console.log(`AUDIT REPORT: ${path.basename(backupFile)}`);
    console.log('==========================================');

    // 1. Admin Libraries
    console.log('\n--- 1. ADMIN AREA (LIBRARIES) ---');
    console.log(`Vendors:         ${(data.vendors || []).length}`);
    console.log(`Equipment Types: ${(data.equipmentDefs || []).length}`);
    console.log(`Building Types:  ${(data.buildingDefs || []).length}`);
    console.log(`Rack Types:      ${(data.rackDefs || []).length}`);

    // 2. Sites & Buildings
    console.log('\n--- 2. SPATIAL LAYOUT ---');
    console.log(`Total Sites:     ${(data.sites || []).length}`);

    let totalBuildings = 0;
    let totalRacks = 0;
    let totalEquipment = 0;

    data.sites.forEach(site => {
        const bldgs = site.buildings || [];
        totalBuildings += bldgs.length;

        bldgs.forEach(b => {
            const racks = b.racks || [];
            totalRacks += racks.length;

            racks.forEach(r => {
                totalEquipment += (r.equipment || []).length;
            });
        });
    });

    console.log(`Total Buildings: ${totalBuildings}`);
    console.log(`Total Racks:     ${totalRacks}`);
    console.log(`Total Equipment: ${totalEquipment}`);

    console.log('\n--- SAMPLE VENDORS ---');
    console.log((data.vendors || []).slice(0, 5).map(v => v.name).join(', ') + '...');

    console.log('\n--- SAMPLE SITES ---');
    console.log((data.sites || []).map(s => s.name).join(', '));

    console.log('\n==========================================\n');

} catch (err) {
    console.error('Error reading backup:', err.message);
}
