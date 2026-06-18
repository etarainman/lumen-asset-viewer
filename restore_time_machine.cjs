
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const backupFile = process.argv[2];

if (!backupFile) {
    console.log('ERROR: No backup file specified.');
    console.log('Usage: node restore_time_machine.cjs backups/your_backup_file.json');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
    console.log(`\n--- TIME MACHINE RESTORATION INITIATED ---`);
    console.log(`Source File: ${backupFile}`);
    console.log(`Target: ${workspaceId} (Production Cloud)`);

    if (!fs.existsSync(backupFile)) {
        console.error('CRITICAL ERROR: Backup file does not exist locally.');
        return;
    }

    // 1. Load Data
    let data;
    try {
        data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    } catch (e) {
        console.error('CRITICAL ERROR: Failed to parse JSON backup.');
        return;
    }

    // 2. Safety Check - Validate structure
    if (!data.vendors || !data.sites) {
        console.error('CRITICAL ERROR: Backup file appears to be corrupted or invalid (missing core keys).');
        return;
    }

    console.log(`\nValidating Snapshot Contents:`);
    console.log(`- Vendors: ${data.vendors.length}`);
    console.log(`- Equipment Types: ${data.equipmentDefs.length}`);
    console.log(`- Sites: ${data.sites.length}`);

    // 3. Last Confirmation
    console.log(`\nReady to push to Cloud...`);

    const { error: updateError } = await supabase
        .from('workspaces')
        .update({ data: data })
        .eq('id', workspaceId);

    if (updateError) {
        console.error('RESTORE FAILED:', updateError.message);
    } else {
        console.log('\n==========================================');
        console.log('SUCCESS: Time Machine restoration complete!');
        console.log('The production Supabase has been rolled back to this snapshot.');
        console.log('==========================================\n');
    }
}

restore();
