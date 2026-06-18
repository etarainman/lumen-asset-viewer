
const fs = require('fs');
const path = require('path');

const backupFile = process.argv[2];

if (!backupFile) {
    console.log('Usage: node excel_audit.cjs backups/your_backup_file.json');
    process.exit(1);
}

if (!fs.existsSync(backupFile)) {
    console.log('File not found:', backupFile);
    process.exit(1);
}

try {
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const baseName = path.basename(backupFile, '.json');
    const outputDir = path.join(__dirname, 'backups', `${baseName}-excel-audit`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log(`--- GENERATING EXCEL AUDIT FILES IN: ${outputDir} ---`);

    // 1. Vendors CSV
    let vendorsCsv = 'id,name,color\n';
    (data.vendors || []).forEach(v => {
        vendorsCsv += `"${v.id}","${v.name}","${v.color}"\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'audit_vendors.csv'), vendorsCsv);
    console.log('Generated: audit_vendors.csv');

    // 2. Equipment Definitions CSV
    let eqDefsCsv = 'id,name,manufacturer,heightU,depth,powerWatts,color,category\n';
    (data.equipmentDefs || []).forEach(m => {
        eqDefsCsv += `"${m.id}","${m.name}","${m.manufacturer}",${m.heightU || 0},${m.depth || 0},${m.powerWatts || 0},"${m.color || ''}","${m.category || ''}"\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'audit_equipment_defs.csv'), eqDefsCsv);
    console.log('Generated: audit_equipment_defs.csv');

    // 3. Buildings CSV
    let bldCsv = 'site_name,building_id_label,type_id,x,y,rotation\n';
    // Sites nested
    (data.sites || []).forEach(site => {
        (site.buildings || []).forEach(b => {
            bldCsv += `"${site.name}","${b.label || b.id}","${b.definitionId}",${b.position?.x || 0},${b.position?.y || 0},${b.rotation || 0}\n`;
        });
    });
    // Top-level legacy
    (data.buildings || []).forEach(b => {
        bldCsv += `"LEGACY_OR_UNLINKED","${b.label || b.id}","${b.definitionId}",${b.position?.x || 0},${b.position?.y || 0},${b.rotation || 0}\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'audit_buildings.csv'), bldCsv);
    console.log('Generated: audit_buildings.csv');

    // 4. Racks CSV
    let racksCsv = 'site_name,building_label,rack_label,type_id,location_row_col,u_count\n';
    const processBuildingRacks = (siteName, b) => {
        (b.racks || []).forEach(r => {
            racksCsv += `"${siteName}","${b.label || b.id}","${r.label}","${r.definitionId}","${r.location || ''}",${r.totalU || 0}\n`;
        });
    };
    (data.sites || []).forEach(site => {
        (site.buildings || []).forEach(b => processBuildingRacks(site.name, b));
    });
    (data.buildings || []).forEach(b => processBuildingRacks("LEGACY_OR_UNLINKED", b));
    fs.writeFileSync(path.join(outputDir, 'audit_racks.csv'), racksCsv);
    console.log('Generated: audit_racks.csv');

    // 5. Full Inventory (Placed Equipment) CSV
    let invCsv = 'site_name,building_label,rack_label,equipment_name,eq_id,u_position,heightU\n';
    const processBuildingInventory = (siteName, b) => {
        (b.racks || []).forEach(r => {
            (r.equipment || []).forEach(eq => {
                invCsv += `"${siteName}","${b.label || b.id}","${r.label}","${eq.name}","${eq.id || ''}",${eq.uPosition || 0},${eq.heightU || 0}\n`;
            });
        });
    };
    (data.sites || []).forEach(site => {
        (site.buildings || []).forEach(b => processBuildingInventory(site.name, b));
    });
    (data.buildings || []).forEach(b => processBuildingInventory("LEGACY_OR_UNLINKED", b));
    fs.writeFileSync(path.join(outputDir, 'audit_inventory.csv'), invCsv);
    console.log('Generated: audit_inventory.csv');

    // 6. Pro-Inventory (Master Asset List) CSV
    let proInvCsv = 'id,name,type,building,location,status,owner,definition,proInventoryId\n';
    (data.proInventory || []).forEach(p => {
        proInvCsv += `"${p.id}","${p.name}","${p.type}","${p.building}","${p.location || ''}","${p.status || ''}","${p.ownerName || ''}","${p.definition || ''}","${p.proInventoryId || ''}"\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'audit_pro_inventory.csv'), proInvCsv);
    console.log('Generated: audit_pro_inventory.csv');

    console.log('\nSUCCESS: 5 Audit CSVs generated for Excel review.');

} catch (err) {
    console.error('Error generating Excel audit:', err.message);
}
