
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIds() {
    const ids = ['LUMEN_BIM_PRODUCTION_V1', 'LUMEN_BIM_WORKSPACE_STABLE_V1', 'AMBIFLO_WORKSPACE_STABLE_V1', 'LUMEN_BIM_RELATIONAL_V2'];
    for (const id of ids) {
        const { data, error } = await supabase.from('workspaces').select('*').eq('id', id).single();
        if (data) {
            const ws = data.data;
            const r = ws.buildings?.reduce((s, b) => s + (b.racks?.length || 0), 0) || 0;
            console.log(`ID: ${id} | Buildings: ${ws.buildings?.length} | Racks: ${r} | Updated: ${data.updated_at}`);
        } else {
            console.log(`ID: ${id} | NOT FOUND`);
        }
    }
}

checkIds();
