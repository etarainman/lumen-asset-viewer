
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const { data: cloudRow } = await supabase
        .from('workspaces')
        .select('data')
        .eq('id', workspaceId)
        .single();

    const ws = cloudRow.data;
    console.log('--- DUPLICATE ANALYSIS ---');

    ws.buildings.forEach(b => {
        const rackLabels = b.racks.map(r => `${r.suite || ''}:${r.label}`);
        const dupes = rackLabels.filter((item, index) => rackLabels.indexOf(item) !== index);
        if (dupes.length > 0) {
            const site = ws.sites.find(s => s.id === b.siteId);
            console.log(`\nSite: ${site?.name} | Building: ${b.label}`);
            console.log(`  Total Racks: ${b.racks.length}`);
            console.log(`  Duplicate Labels found: ${[...new Set(dupes)].join(', ')}`);

            // Show example of two "duplicate" racks to see why they didn't match
            const firstDupeLabel = dupes[0];
            const matchingRacks = b.racks.filter(r => `${r.suite || ''}:${r.label}` === firstDupeLabel);
            matchingRacks.forEach(r => {
                console.log(`    - ID: ${r.id}, Name: ${r.name || 'N/A'}, Loc: ${r.location}`);
            });
        }
    });
}

checkDuplicates();
