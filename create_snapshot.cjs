
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSnapshot() {
    const now = new Date();
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    const fileName = `${yymmdd} - snapshot-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);

    console.log(`--- CREATING SESSION SNAPSHOT: ${fileName} ---`);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

    if (error) {
        console.error('Error fetching data from Supabase:', error.message);
        return;
    }

    fs.writeFileSync(filePath, JSON.stringify(workspace.data, null, 2));

    // Also create a "LATEST_GOOD_SAVE.json" for easy recovery
    fs.writeFileSync(path.join(backupDir, 'LATEST_STABLE_BACKUP.json'), JSON.stringify(workspace.data, null, 2));

    console.log(`SUCCESS: Snapshot saved to ${filePath}`);
    console.log(`Building Count: ${workspace.data.buildings.length}`);
    const rackCount = workspace.data.buildings.reduce((s, b) => s + (b.racks?.length || 0), 0);
    console.log(`Total Rack Count: ${rackCount}`);
}

createSnapshot();
