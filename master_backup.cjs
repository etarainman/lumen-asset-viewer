
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runMasterBackup() {
    console.log('==========================================');
    console.log('   UNIVERSAL MASTER BACKUP INITIATED');
    console.log('==========================================');

    const now = new Date();
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    try {
        const nodePath = `"${process.execPath}"`;
        // 1. DATA SNAPSHOT (Supabase -> JSON)
        console.log('\n[1/3] Triggering Cloud Data Snapshot...');
        const snapshotOutput = execSync(`${nodePath} create_snapshot.cjs`).toString();

        // Find the filename in the output
        const match = snapshotOutput.match(/\d{6} - snapshot-[\d-T-Z]+\.json/);
        const dataFilename = match ? match[0] : null;

        if (dataFilename) {
            console.log(`SUCCESS: Data Snapshot saved as ${dataFilename}`);

            // 2. EXCEL AUDIT (JSON -> CSV Suite)
            console.log('\n[2/4] Generating Excel (CSV) Audit Suite...');
            execSync(`${nodePath} excel_audit.cjs "backups/${dataFilename}"`);

            // 3. DEEP AUDIT (JSON -> TXT Report)
            console.log('\n[3/4] Generating Deep Inventory Audit Report...');
            execSync(`${nodePath} deep_audit.cjs "backups/${dataFilename}"`);

            // Move/Rename the audit report to match the snapshot
            const auditFile = `backups/${dataFilename.replace('.json', '-audit.txt')}`;
            if (fs.existsSync('deep_inventory_audit.txt')) {
                fs.renameSync('deep_inventory_audit.txt', auditFile);
                console.log(`SUCCESS: Audit Report saved as ${auditFile}`);
            }
        }

        // 3. CODE BACKUP (Source -> ZIP)
        console.log('\n[3/3] Creating Source Code Archive...');
        const zipName = `backups/${yymmdd} - code-backup-${timestamp}.zip`;

        // PowerShell command to zip current dir but exclude heavy stuff
        const zipCmd = `powershell "Compress-Archive -Path ./ -DestinationPath ${zipName} -Force"`;
        // Note: In real scenarios, we'd need a more precise exclusion list, 
        // but for now, we'll rely on the zip command and assume user knows standard ZIP behavior.
        // To be safe, we'll try to exclude node_modules if possible via PowerShell

        // Better PowerShell command with exclusions
        const advZipCmd = `powershell "$items = Get-ChildItem -Path ./ -Exclude 'node_modules', '.git', 'backups', 'tmp*'; Compress-Archive -Path $items -DestinationPath '${zipName}' -Update"`;

        execSync(advZipCmd);
        console.log(`SUCCESS: Code Backup saved as ${zipName}`);

        console.log('\n==========================================');
        console.log('   MASTER BACKUP COMPLETE');
        console.log('   Data, Code, and Audit are now SECURE.');
        console.log('==========================================\n');

    } catch (err) {
        console.error('\nCRITICAL ERROR DURING BACKUP:', err.message);
    }
}

runMasterBackup();
