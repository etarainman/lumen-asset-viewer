
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHistory() {
    console.log('--- CHECKING INTERNAL DB BACKUPS ---');

    // Check workspace_backups table
    const { data: backups, error: bErr } = await supabase
        .from('workspace_backups')
        .select('*')
        .order('created_at', { ascending: false });

    if (!bErr && backups && backups.length > 0) {
        console.log(`Found ${backups.length} snapshots in workspace_backups!`);
        backups.forEach(b => console.log(`- Snapshot from: ${b.created_at} | ID: ${b.id}`));
        return;
    }

    // Check history table
    const { data: history, error: hErr } = await supabase
        .from('history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

    if (!hErr && history && history.length > 0) {
        console.log(`Found ${history.length} records in history table.`);
        history.forEach(h => console.log(`- Action: ${h.action} | User: ${h.user} | Time: ${h.timestamp}`));
    } else {
        console.log('No historical snapshots found in DB tables.');
    }
}

checkHistory();
