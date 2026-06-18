
const fs = require('fs');
const path = require('path');

const SOURCES = {
    feb22_code: 'tmp_restore_feb22_full/components/InventoryPanel.tsx',
    feb22_constants: 'tmp_restore_feb22_full/constants.ts',
    csv_dir: 'Ray notes and files/PRO Inventory CSVs'
};

const vendors = new Map(); // Name -> Source
const models = new Map();  // Key -> { vendor, name, source }

function recordVendor(name, source) {
    if (!name) return;
    const clean = name.trim().toUpperCase();
    if (!vendors.has(clean)) vendors.set(clean, source);
}

function recordModel(vendor, name, source) {
    if (!name) return;
    const key = `${vendor}_${name}`.toUpperCase();
    if (!models.has(key)) models.set(key, { vendor, name, source });
}

async function audit() {
    console.log('--- MASTER ADMIN AUDIT INITIATED ---');

    // 1. Feb 22 Code Logic
    if (fs.existsSync(SOURCES.feb22_code)) {
        const code = fs.readFileSync(SOURCES.feb22_code, 'utf8');
        const vMatch = code.match(/const KNOWN_VENDORS = \[(.*?)\];/s);
        if (vMatch) {
            vMatch[1].split(',').forEach(v => {
                const n = v.replace(/['"\s]/g, '');
                recordVendor(n, 'Feb 22 Component Code');
            });
        }
        const mMatches = code.matchAll(/model: '(.*?)'/g);
        for (const m of mMatches) {
            if (m[1] !== 'Unidentified') recordModel('GENERIC', m[1], 'Feb 22 Component Code');
        }
    }

    // 2. Feb 22 Constants
    if (fs.existsSync(SOURCES.feb22_constants)) {
        const code = fs.readFileSync(SOURCES.feb22_constants, 'utf8');
        // Simple regex for initial vectors
        const vLines = code.match(/{ id: 'V_.*', name: '(.*)', color: '.*' }/g) || [];
        vLines.forEach(l => {
            const m = l.match(/name: '(.*)', color/);
            if (m) recordVendor(m[1], 'Feb 22 Constants');
        });
        const mLines = code.match(/{ id: 'EQ_.*', name: '(.*)', heightU:.*manufacturer: '(.*)' }/g) || [];
        mLines.forEach(l => {
            const m = l.match(/name: '(.*)', heightU:.*manufacturer: '(.*)'/);
            if (m) recordModel(m[2], m[1], 'Feb 22 Constants');
        });
    }

    // 3. CSVs
    if (fs.existsSync(SOURCES.csv_dir)) {
        const files = fs.readdirSync(SOURCES.csv_dir).filter(f => f.endsWith('.csv'));
        files.forEach(file => {
            const content = fs.readFileSync(path.join(SOURCES.csv_dir, file), 'utf8');
            const lines = content.split('\n');
            const headers = lines[0].split(',');
            const iName = headers.indexOf('EQUIPMENT NAME');
            lines.slice(1, 100).forEach(line => { // Sample first 100 lines for speed
                const cols = line.split(',');
                const full = cols[iName]?.trim();
                if (full && full.includes('.')) {
                    const parts = full.split('.');
                    if (parts.length >= 3) {
                        recordVendor(parts[1], `CSV (${file})`);
                        recordModel(parts[1], parts[2], `CSV (${file})`);
                    }
                }
            });
        });
    }

    // Output Report
    let report = '# Master Admin Audit Report\n\n';

    report += '## 1. Vendors Found\n\n';
    report += '| Vendor Name | Primary Source |\n| :--- | :--- |\n';
    Array.from(vendors.keys()).sort().forEach(v => {
        report += `| ${v} | ${vendors.get(v)} |\n`;
    });

    report += '\n## 2. Equipment Models Found\n\n';
    report += '| Manufacturer | Model Name | Primary Source |\n| :--- | :--- | :--- |\n';
    Array.from(models.values()).sort((a, b) => a.vendor.localeCompare(b.vendor)).forEach(m => {
        report += `| ${m.vendor} | ${m.name} | ${m.source} |\n`;
    });

    fs.writeFileSync('admin_audit_report.md', report);
    console.log('SUCCESS: Audit report generated in admin_audit_report.md');
}

audit();
