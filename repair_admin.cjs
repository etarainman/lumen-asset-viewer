
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- RECOVERY DATA FROM constants.ts ---
const INITIAL_BUILDING_DEFS = [
    { id: 'TYPE_A', name: 'Type A (16 x 12)', width: 16, depth: 12, height: 10, color: '#d2c29d', roofColor: '#ffffff', svgPath: 'M -8,-6 L 8,-6 L 8,6 L -8,6 Z' },
    { id: 'TYPE_B', name: 'Type B (24 x 12)', width: 24, depth: 12, height: 10, color: '#c2b280', roofColor: '#ffffff', svgPath: 'M -12,-6 L 12,-6 L 12,6 L -12,6 Z' },
    { id: 'TYPE_C', name: 'Type C (32 x 12)', width: 32, depth: 12, height: 10, color: '#b2a270', roofColor: '#f1f1f1', svgPath: 'M -16,-6 L 16,-6 L 16,6 L -16,6 Z' },
    { id: 'TYPE_D', name: 'Type D (36 x 12)', width: 36, depth: 12, height: 10, color: '#a29260', roofColor: '#e1e1e1', svgPath: 'M -18,-6 L 18,-6 L 18,6 L -18,6 Z' },
];

const INITIAL_RACK_DEFS = [
    { id: 'RACK_42U', name: 'Standard 42U Cabinet', totalU: 42, width: 2.0, depth: 1.25, height: 6.46, color: '#1e293b' },
    { id: 'RACK_48U', name: 'High-Density 48U', totalU: 48, width: 2.0, depth: 3.5, height: 7.33, color: '#0f172a' },
    { id: 'RACK_2POST', name: '2-Post Relay Rack', totalU: 45, width: 1.6, depth: 1.3, height: 6.9, color: '#475569' },
];

const INITIAL_EQUIPMENT_DEFS = [
    { id: 'EQ_SERVER_1U', name: 'Generic 1U Server', heightU: 1, depth: 1.15, powerWatts: 450, color: '#3b82f6', category: 'SERVER', manufacturer: 'BBBB' },
    { id: 'EQ_SERVER_2U', name: 'Dual-Node 2U Server', heightU: 2, depth: 1.15, powerWatts: 1200, color: '#6366f1', category: 'SERVER', manufacturer: 'BBBB' },
    { id: 'EQ_SWITCH_1U', name: '48-Port Edge Switch', heightU: 1, depth: 0.8, powerWatts: 150, color: '#06b6d4', category: 'NETWORK', manufacturer: 'BBBB' },
    { id: 'EQ_STORAGE_4U', name: '60-Bay Storage Array', heightU: 4, depth: 1.2, powerWatts: 2400, color: '#14b8a6', category: 'STORAGE', manufacturer: 'BBBB' },
    { id: 'EQ_PATCH_1U', name: '24-Port Patch Panel', heightU: 1, depth: 0.1, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
    { id: 'EQ_ADVA_FSP_3000R7', name: 'FSP 3000R7', heightU: 6, depth: 1.0, powerWatts: 500, color: '#0ea5e9', category: 'NETWORK', manufacturer: 'BBBB' },
    { id: 'EQ_ADVA_FSP_3000RE', name: 'FSP 3000RE', heightU: 1, depth: 1.0, powerWatts: 200, color: '#0ea5e9', category: 'NETWORK', manufacturer: 'BBBB' },
    { id: 'EQ_CANOGA_CP9101', name: 'CP9101', heightU: 1, depth: 0.83, powerWatts: 100, color: '#f59e0b', category: 'NETWORK', manufacturer: 'BBBB' },
    { id: 'EQ_CIENA_6500', name: '6500 Packet-Optical', heightU: 14, depth: 1.66, powerWatts: 1500, color: '#06b6d4', category: 'NETWORK', manufacturer: 'BBBB' },
    { id: 'EQ_CISCO_2811', name: 'Cisco 2811', heightU: 1, depth: 1.33, powerWatts: 300, color: '#6366f1', category: 'NETWORK', manufacturer: 'BBBB' },
    { id: 'EQ_FRAME_GWYOSX', name: 'Optical Gateway (GWYOSX)', heightU: 42, depth: 1.0, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
    { id: 'EQ_FRAME_OSP_OCP', name: 'OSP OCP Frame', heightU: 42, depth: 1.0, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
    { id: 'EQ_FRAME_ISPR', name: 'ISPR Frame', heightU: 42, depth: 1.0, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
    { id: 'EQ_PANEL_FAP', name: 'Fiber Adapter Panel', heightU: 4, depth: 0.33, powerWatts: 0, color: '#cbd5e1', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
    { id: 'EQ_PANEL_OSPOSX', name: 'Optical Splitter', heightU: 6, depth: 0.66, powerWatts: 0, color: '#cbd5e1', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
    { id: 'EQ_PANEL_FDP', name: 'Fiber Dist Panel', heightU: 6, depth: 1.0, powerWatts: 0, color: '#cbd5e1', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
];

const INITIAL_VENDORS = [
    { id: 'V_CIENA', name: 'Ciena', color: '#06b6d4' },
    { id: 'V_CISCO', name: 'Cisco', color: '#6366f1' },
    { id: 'V_JUNIPER', name: 'Juniper', color: '#14b8a6' },
    { id: 'V_BBBB', name: 'BBBB', color: '#64748b' },
    { id: 'V_OTHER', name: 'Other', color: '#64748b' },
];

const INITIAL_OWNERS = [
    { id: 'OWN_LUMEN', name: 'Lumen', color: '#FFFF00' },
    { id: 'OWN_CUSTOMER', name: 'Customer', color: '#FF00FF' },
];

const INITIAL_STATUSES = [
    { id: 'RETAIN', label: 'Existing to be retained', color: '#e2e8f0' },
    { id: 'REMOVE', label: 'Existing to be removed', color: '#ef4444' },
    { id: 'PROPOSED', label: 'Proposed', color: '#10b981' },
    { id: 'FUTURE', label: 'Future', color: '#c084fc' },
    { id: 'MODIFIED', label: 'Modified', color: '#F97316' },
];

async function repairAdmin() {
    console.log('--- STARTING EMERGENCY ADMIN REPAIR ---');

    // 1. Fetch Current Workspace
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

    // 2. Re-inject all Registries
    data.buildingDefs = INITIAL_BUILDING_DEFS;
    data.rackDefs = INITIAL_RACK_DEFS;
    data.equipmentDefs = INITIAL_EQUIPMENT_DEFS;
    data.vendors = INITIAL_VENDORS;
    data.owners = INITIAL_OWNERS;
    data.statuses = INITIAL_STATUSES;

    console.log('Admin registries successfully re-injected.');

    // 3. Update Supabase
    const { error: updateError } = await supabase
        .from('workspaces')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

    if (updateError) {
        console.error('Failed to update workspace:', updateError.message);
    } else {
        console.log('--- ADMIN AREA REPAIRED SUCCESSFULLY ---');
        console.log(`Building Types: ${data.buildingDefs.length}`);
        console.log(`Rack Types: ${data.rackDefs.length}`);
        console.log(`Vendors: ${data.vendors.length}`);
    }
}

repairAdmin();
