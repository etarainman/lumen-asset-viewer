
const fs = require('fs');
const path = require('path');

const backupFile = process.argv[2];

if (!backupFile) {
    console.log('Usage: node deep_audit.cjs backups/your_backup_file.json');
    process.exit(1);
}

if (!fs.existsSync(backupFile)) {
    console.log('File not found:', backupFile);
    process.exit(1);
}

try {
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    let report = `\n==========================================\n`;
    report += `DEEP INVENTORY AUDIT: ${path.basename(backupFile)}\n`;
    report += `==========================================\n`;

    // 1. Vendors
    report += `\n--- [VENDORS LIBRARY] ---\n`;
    (data.vendors || []).forEach(v => {
        report += `[V] ${v.name} (ID: ${v.id})\n`;
    });

    // 2. Equipment Definitions
    report += `\n--- [EQUIPMENT DEFINITIONS (LIBRARY)] ---\n`;
    (data.equipmentDefs || []).forEach(e => {
        report += `[D] ${e.manufacturer} - ${e.name} (${e.heightU}U, ${e.depth}ft)\n`;
    });

    // 3. Full Site -> Building -> Rack -> Equipment Hierarchy
    report += `\n--- [SITE LAYOUT & PLACED INVENTORY] ---\n`;
    (data.sites || []).forEach(site => {
        report += `\n[SITE] ${site.name} (${site.customerId})\n`;
        (site.buildings || []).forEach(b => {
            report += `  └─ [BLD] ${b.label} (Type: ${b.definitionId})\n`;
            (b.racks || []).forEach(r => {
                report += `      └─ [RACK] ${r.label} (Model: ${r.definitionId}) - Position: ${r.location || 'N/A'}\n`;
                (r.equipment || []).forEach(eq => {
                    report += `          └─ [EQ] ${eq.name} (ID: ${eq.id || eq.proInventoryId})\n`;
                });
            });
        });
    });

    // Handle Top-level buildings (legacy format check)
    if (data.buildings && data.buildings.length > 0) {
        report += `\n[TOP-LEVEL BUILDINGS (LEGACY)]\n`;
        data.buildings.forEach(b => {
            report += `  └─ [BLD] ${b.label}\n`;
            (b.racks || []).forEach(r => {
                report += `      └─ [RACK] ${r.label}\n`;
                (r.equipment || []).forEach(eq => {
                    report += `          └─ [EQ] ${eq.name}\n`;
                });
            });
        });
    }

    report += `\n==========================================\n`;

    fs.writeFileSync('deep_inventory_audit.txt', report);
    console.log('SUCCESS: Full inventory report written to deep_inventory_audit.txt');
    console.log('\n--- FIRST 20 LINES OF REPORT ---');
    console.log(report.split('\n').slice(0, 20).join('\n'));
    console.log('...');

} catch (err) {
    console.error('Error reading backup:', err.message);
}
