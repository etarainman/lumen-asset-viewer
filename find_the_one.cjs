
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTheOne() {
    console.log('--- FINAL SEARCH FOR THE 148-RACK SNAPSHOT ---');
    const { data, error } = await supabase
        .from('workspaces')
        .select('id, data');

    if (error) return console.error(error.message);

    data.forEach(row => {
        const ws = row.data;
        if (!ws) return;
        const racks = (ws.buildings || []).reduce((s, b) => s + (b.racks?.length || 0), 0);
        const eq = (ws.buildings || []).reduce((s, b) => s + (b.equipment?.length || 0), 0);
        console.log(`Found: ID=${row.id}, Racks=${racks}, Eq=${eq}, Sites=${ws.sites?.length}`);

        if (racks === 148 && eq === 108) {
            console.log('!!! MATCH FOUND !!!');
            fs.writeFileSync('THE_TARGET.json', JSON.stringify(ws, null, 2));
        }
    });
}

const fs = require('fs');
findTheOne();
