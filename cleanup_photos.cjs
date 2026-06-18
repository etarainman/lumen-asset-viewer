
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupPhotos() {
    console.log('--- CLEANING UP PHOTOS AND FLOOR PLANS ---');

    const { data: workspace, error: fetchError } = await supabase
        .from('workspaces')
        .select('data')
        .eq('id', workspaceId)
        .single();

    if (fetchError || !workspace) {
        console.error('Failed to fetch workspace:', fetchError?.message);
        return;
    }

    const data = workspace.data;

    // 1. Remove all floor plans from all buildings
    data.buildings.forEach(b => {
        b.floorPlans = [];
        b.activeFloorPlanId = null;
    });

    console.log(`Cleaned floor plans for ${data.buildings.length} buildings.`);

    const { error: updateError } = await supabase
        .from('workspaces')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

    if (updateError) {
        console.error('Failed to update workspace:', updateError.message);
    } else {
        console.log('--- PHOTOS REMOVED SUCCESSFULLY ---');
    }
}

cleanupPhotos();
