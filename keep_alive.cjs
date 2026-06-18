
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Executing Supabase Keep-Alive...`);

    try {
        // Perform a simple activity: Update the updated_at timestamp for the workspace
        // This counts as real database activity and ensures the project stays active.
        const { data, error } = await supabase
            .from('workspaces')
            .update({ updated_at: timestamp })
            .eq('id', workspaceId)
            .select('id, updated_at');

        if (error) {
            console.error('Keep-alive failed:', error.message);
            process.exit(1);
        }

        if (data && data.length > 0) {
            console.log('SUCCESS: Keep-alive pulse sent.');
            console.log('Record updated:', data[0]);
        } else {
            console.warn('WARNING: No record found to update. Checking for existence...');
            const { data: checkData, error: checkError } = await supabase
                .from('workspaces')
                .select('id')
                .eq('id', workspaceId);
            
            if (checkError) {
                console.error('Check failed:', checkError.message);
            } else if (checkData.length === 0) {
                console.error(`ERROR: Workspace ID "${workspaceId}" not found.`);
            } else {
                console.log('Workspace exists but update returned no data (likely no change).');
            }
        }
    } catch (err) {
        console.error('Unexpected error during keep-alive:', err.message);
        process.exit(1);
    }
}

keepAlive();
