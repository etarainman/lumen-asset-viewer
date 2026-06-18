
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreSnapshot(snapshotFileName) {
    if (!snapshotFileName) {
        console.error('Please provide a snapshot filename from the backups folder.');
        return;
    }

    const filePath = path.join(__dirname, 'backups', snapshotFileName);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    console.log(`--- RESTORING SNAPSHOT: ${snapshotFileName} ---`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const { error } = await supabase
        .from('workspaces')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

    if (error) {
        console.error('Restore failed:', error.message);
    } else {
        console.log('--- RESTORE SUCCESSFUL ---');
    }
}

// Get filename from command line argument
const fileName = process.argv[2];
restoreSnapshot(fileName);
