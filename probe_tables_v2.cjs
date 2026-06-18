
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
    console.log('--- ENUMERATING ALL SUPABASE TABLES ---');

    // We can't access information_schema with anon key usually,
    // but we can try common table names found in forensics.
    const targets = [
        'sites', 'buildings', 'racks', 'equipment',
        'lumen_bim_relational_v2_sites',
        'lumen_bim_relational_v2_buildings',
        'lumen_bim_relational_v2_racks',
        'lumen_bim_relational_v2_equipment',
        'workspaces', 'workspace_backups', 'history'
    ];

    for (const table of targets) {
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`Table '${table}': Access Denied or Not Found (${error.message})`);
        } else {
            console.log(`Table '${table}': FOUND (Count: ${count})`);
        }
    }
}

listAllTables();
