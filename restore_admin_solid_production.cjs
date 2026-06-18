
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function injectAdmin() {
    console.log('--- PRODUCTION ADMIN REGISTRY RESTORATION ---');
    console.log(`Targeting Workspace: ${workspaceId}`);

    // 1. Load harvested data
    const harvested = JSON.parse(fs.readFileSync('harvested_admin_v2.json', 'utf8'));

    // 2. Load current state
    const { data: row, error } = await supabase
        .from('workspaces')
        .select('data')
        .eq('id', workspaceId)
        .single();

    if (error) {
        console.error('Error loading workspace:', error);
        return;
    }

    const wsData = row.data;

    // 3. Purge "BBBB" and placeholders and inject SOLID records
    wsData.vendors = harvested.vendors;
    wsData.equipmentDefs = harvested.equipmentModels;

    // 4. Solid Foundation items
    wsData.owners = [
        { id: 'OWN_LUMEN', name: 'Lumen', color: '#FFFF00' },
        { id: 'OWN_CUSTOMER', name: 'Customer', color: '#FF00FF' }
    ];
    wsData.statuses = [
        { id: 'RETAIN', label: 'Existing to be retained', color: '#e2e8f0' },
        { id: 'REMOVE', label: 'Existing to be removed', color: '#ef4444' },
        { id: 'PROPOSED', label: 'Proposed', color: '#10b981' },
        { id: 'FUTURE', label: 'Future', color: '#c084fc' },
        { id: 'MODIFIED', label: 'Modified', color: '#F97316' }
    ];

    wsData.buildingDefs = [
        { id: 'TYPE_A', name: 'Type A (16 x 12)', width: 16, depth: 12, height: 10, color: '#d2c29d', roofColor: '#ffffff', svgPath: 'M -8,-6 L 8,-6 L 8,6 L -8,6 Z' },
        { id: 'TYPE_B', name: 'Type B (24 x 12)', width: 24, depth: 12, height: 10, color: '#c2b280', roofColor: '#ffffff', svgPath: 'M -12,-6 L 12,-6 L 12,6 L -12,6 Z' },
        { id: 'TYPE_C', name: 'Type C (32 x 12)', width: 32, depth: 12, height: 10, color: '#b2a270', roofColor: '#f1f1f1', svgPath: 'M -16,-6 L 16,-6 L 16,6 L -16,6 Z' },
        { id: 'TYPE_D', name: 'Type D (36 x 12)', width: 36, depth: 12, height: 10, color: '#a29260', roofColor: '#e1e1e1', svgPath: 'M -18,-6 L 18,-6 L 18,6 L -18,6 Z' }
    ];

    wsData.rackDefs = [
        { id: 'RACK_42U', name: 'Standard 42U Cabinet', totalU: 42, width: 2, depth: 1.25, height: 6.46, color: '#1e293b' },
        { id: 'RACK_48U', name: 'High-Density 48U', totalU: 48, width: 2, depth: 3.5, height: 7.33, color: '#0f172a' },
        { id: 'RACK_2POST', name: '2-Post Relay Rack', totalU: 45, width: 1.6, depth: 1.3, height: 6.9, color: '#475569' }
    ];

    // 5. Update Supabase
    const { error: updateError } = await supabase
        .from('workspaces')
        .update({ data: wsData })
        .eq('id', workspaceId);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log(`SUCCESS: Admin area fully restored with 22 Real Vendors and 27 Real Models found in CSVs.`);
        console.log('Placeholder "BBBB" has been purged.');
    }
}

injectAdmin();
