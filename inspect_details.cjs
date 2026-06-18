
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

    if (error) {
        console.error('Error fetching workspace:', error.message);
        return;
    }

    const ws = data.data;
    console.log('--- Workspace Detailed Breadown ---');
    console.log('Last Updated:', data.updated_at);

    ws.sites.forEach(site => {
        const siteBuildings = (ws.buildings || []).filter(b => b.siteId === site.id);
        const rackCount = siteBuildings.reduce((sum, b) => sum + (b.racks?.length || 0), 0);
        const eqCount = siteBuildings.reduce((sum, b) => sum + (b.equipment?.length || 0), 0);

        console.log(`\nSite: ${site.name} (${site.id})`);
        console.log(`  Location: ${site.lat}, ${site.lng}`);
        console.log(`  Buildings: ${siteBuildings.length}`);
        console.log(`  Total Racks: ${rackCount}`);
        console.log(`  Total Equipment: ${eqCount}`);

        siteBuildings.slice(0, 5).forEach(b => {
            console.log(`  - Building ${b.label} (${b.id}): ${b.racks?.length || 0} racks, ${b.equipment?.length || 0} eq`);
        });
    });

    console.log('\n--- Building definitions ---');
    console.log('Count:', ws.buildingDefs?.length || 0);

    console.log('\n--- Pro Inventory ---');
    console.log('Count:', ws.proInventory?.length || 0);
}

inspect();
