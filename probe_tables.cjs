
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('--- LISTING ALL TABLES (Surgical Check) ---');
    // We can't list tables directly from the client usually, 
    // but we can try common names if we have RPCs or just trial-and-error.
    // However, we can use a clever trick: query the Postgres schema if public access allows,
    // but usually anon key doesn't.
    // Let's try to query some likely names.
    const tables = ['workspaces', 'workspace_backups', 'audit_logs', 'history', 'sites', 'buildings', 'racks', 'equipment'];

    for (const t of tables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table exists: ${t}`);
        } else if (error.code !== 'PGRST116' && error.code !== '42P01') {
            // 42P01 is "relation does not exist"
            console.log(`Table ${t} check error: ${error.message} (${error.code})`);
        }
    }
}

listTables();
