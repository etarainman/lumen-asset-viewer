
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllWorkspaces() {
    console.log('--- LISTING ALL WORKSPACE ROWS ---');
    const { data, error } = await supabase.from('workspaces').select('id, updated_at');
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.table(data);
}

listAllWorkspaces();
