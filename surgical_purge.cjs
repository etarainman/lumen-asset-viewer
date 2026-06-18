
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function surgicalPurge() {
    console.log('--- SURGICAL ADMIN PURGE ---');

    // 1. Define IDs to remove based on user's CSVs
    const vendorsToRemove = [
        'V_OSPOCP', 'V_OSPFDP', 'V_OSPOSX', 'V_TBDOSX', 'V_0004', 'V_H101',
        'V_GWYOSX', 'V_ISPR45', 'V_0002', 'V_VARIOUS', 'V_GWYFDP', 'V_TXCFDP', 'V_TWRC'
    ];

    const equipmentToRemove = [
        'EQ_OSPOCP_001', 'EQ_OSPFDP_001', 'EQ_OSPOSX_001', 'EQ_TBDOSX_001',
        'EQ_0004_', 'EQ_H101_', 'EQ_GWYOSX_001', 'EQ_ISPR45_001', 'EQ_0002_230',
        'EQ_VARIOUS_FAP', 'EQ_GWYFDP_001', 'EQ_TXCFDP_001', 'EQ_TWRC_'
    ];

    // 2. Load current workspace data
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

    // 3. Filter out the specific vendors and equipment
    const initialVendorCount = wsData.vendors.length;
    const initialEqCount = wsData.equipmentDefs.length;

    wsData.vendors = wsData.vendors.filter(v => !vendorsToRemove.includes(v.id));
    wsData.equipmentDefs = wsData.equipmentDefs.filter(e => !equipmentToRemove.includes(e.id));

    // Also purge any generic "BBBB" or "GENERIC" manufacturer stuff that might have slipped in
    wsData.vendors = wsData.vendors.filter(v => v.id !== 'V_BBBB' && v.name !== 'BBBB');
    wsData.equipmentDefs = wsData.equipmentDefs.filter(e => e.manufacturer !== 'BBBB' && e.id.includes('GENERIC') === false);

    console.log(`Vendors: ${initialVendorCount} -> ${wsData.vendors.length} (Removed ${initialVendorCount - wsData.vendors.length})`);
    console.log(`Equipment: ${initialEqCount} -> ${wsData.equipmentDefs.length} (Removed ${initialEqCount - wsData.equipmentDefs.length})`);

    // 4. Push back to Supabase
    const { error: updateError } = await supabase
        .from('workspaces')
        .update({ data: wsData })
        .eq('id', workspaceId);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('SUCCESS: Surgical purge complete. Admin area cleaned.');
    }
}

surgicalPurge();
