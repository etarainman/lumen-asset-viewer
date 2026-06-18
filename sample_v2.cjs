
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function sampleTables() {
    console.log('--- SAMPLING RELATIONAL V2 DATA ---');

    const tables = [
        'lumen_bim_relational_v2_sites',
        'lumen_bim_relational_v2_buildings'
    ];

    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(5);

        if (error) {
            console.log(`Table '${table}': Access Denied (${error.message})`);
        } else if (data && data.length > 0) {
            console.log(`Table '${table}': FOUND ${data.length} ROWS`);
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`Table '${table}': EMPTY`);
        }
    }
}

sampleTables();
