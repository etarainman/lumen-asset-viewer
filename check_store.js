
import { createClient } from '@supabase/supabase-js';

const config = {
    url: 'https://kcuxcvegeyfymizkiodb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY',
    workspaceId: 'LUMEN_BIM_PRODUCTION_V1'
};

const supabase = createClient(config.url, config.anonKey);

async function checkStore() {
    console.log('Checking Supabase Storage for ID:', config.workspaceId);
    try {
        const { data, error } = await supabase
            .from('workspaces')
            .select('data, updated_at')
            .eq('id', config.workspaceId)
            .single();

        if (error) {
            console.error('Error fetching data:', error.message);
            return;
        }

        if (!data) {
            console.log('No data found for this workspace ID.');
            return;
        }

        console.log('Last Updated:', data.updated_at);
        const workspaceData = data.data;

        console.log('--- Summary ---');
        console.log('Sites:', workspaceData.sites?.length || 0);
        console.log('Buildings:', workspaceData.buildings?.length || 0);
        console.log('Equipment Defs:', workspaceData.equipmentDefs?.length || 0);
        console.log('Pro Inventory Items:', workspaceData.proInventory?.length || 0);

        if (workspaceData.sites) {
            console.log('Site Names:', workspaceData.sites.map(s => s.name).join(', '));
        }

        if (workspaceData.buildings) {
            const buildingsWithNoRacks = workspaceData.buildings.filter(b => !b.racks || b.racks.length === 0);
            console.log('Buildings with 0 racks:', buildingsWithNoRacks.map(b => b.label).join(', '));

            const totalRacks = workspaceData.buildings.reduce((acc, b) => acc + (b.racks?.length || 0), 0);
            const totalEq = workspaceData.buildings.reduce((acc, b) => acc + (b.equipment?.length || 0), 0);
            console.log('Total Racks:', totalRacks);
            console.log('Total Equipment:', totalEq);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkStore();
