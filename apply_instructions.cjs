
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyInstructions() {
    console.log('--- APPLYING FEB 23RD INVENTORY INSTRUCTIONS ---');

    // 1. Load Current Workspace
    const { data: workspace, error: fetchError } = await supabase
        .from('workspaces')
        .select('data')
        .eq('id', workspaceId)
        .single();

    if (fetchError || !workspace) return console.error('Fetch error:', fetchError?.message);
    const data = workspace.data;

    const instructionFiles = {
        'A0001': 'Ray notes and files/Outputs/260223 - Castlerock_Inventory_Instructions.json',
        'A1002': 'Ray notes and files/Outputs/260223 - Plateville_Inventory_Instructions.json',
        'A004': 'Ray notes and files/Outputs/260223 - Plateville_Inventory_Instructions.json' // Use Plateville mapping as proxy if missing
    };

    let totalDeleted = 0;
    let totalCreated = 0;

    for (const [siteNo, filePath] of Object.entries(instructionFiles)) {
        console.log(`Processing instructions for Site ${siteNo}...`);

        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            continue;
        }

        let instructions;
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            if (raw.trim().startsWith('<!doctype')) {
                console.warn(`Skipping HTML file: ${filePath}`);
                // Heuristic for Palmer Lake if JSON is missing:
                if (siteNo === 'A004') {
                    const ignored = ['0005', 'H101', 'TWRC'];
                    data.buildings.forEach(b => {
                        if (b.siteId === siteNo && ignored.includes(b.label)) {
                            console.log(`[IGNORE] Wiping Building ${b.label} in ${siteNo}`);
                            totalDeleted += b.racks.length;
                            b.racks = [];
                            b.equipment = [];
                        }
                    });
                }
                continue;
            }
            instructions = JSON.parse(raw);
        } catch (e) {
            console.error(`Parse error in ${filePath}:`, e.message);
            continue;
        }

        // --- STEP 1: Handle Ignored Buildings ---
        const ignored = instructions.safeguards?.ignoredBuildings || [];
        data.buildings.forEach(b => {
            if (b.siteId === siteNo && ignored.includes(b.label)) {
                console.log(`[IGNORE] Wiping Building ${b.label} in ${siteNo}`);
                totalDeleted += b.racks.length;
                b.racks = [];
                b.equipment = [];
            }
        });

        // --- STEP 2: Handle Explicit Deletes ---
        const deletes = instructions.operations?.delete || [];
        deletes.forEach(del => {
            const building = data.buildings.find(b => b.siteId === siteNo && b.label === del.original?.building);
            if (!building) return;

            // Find by proInventoryId or name matching
            const rackIdx = building.racks.findIndex(r => r.label === del.original?.label || r.id.includes(del.id));
            if (rackIdx !== -1) {
                building.racks.splice(rackIdx, 1);
                console.log(`[DELETE] Removed Rack ${del.original?.label} from ${building.label}`);
                totalDeleted++;
            }

            const eqIdx = building.equipment.findIndex(e => e.id.includes(del.id) || e.name === del.original?.name);
            if (eqIdx !== -1) {
                building.equipment.splice(eqIdx, 1);
                totalDeleted++;
            }
        });

        // --- STEP 3: Handle Explicit Creates ---
        const creates = instructions.operations?.create || [];
        creates.forEach(create => {
            if (create.type === 'RACK') {
                const building = data.buildings.find(b => b.siteId === siteNo && b.label === create.attributes?.building);
                if (!building) return;

                // Check if already exists (avoid duplicates)
                const exists = building.racks.find(r => r.label === create.attributes?.label);
                if (!exists) {
                    building.racks.push({
                        id: `R-CREATION-${Math.random().toString(36).substr(2, 9)}`,
                        label: create.attributes.label,
                        definitionId: 'RACK_42U',
                        x: (building.racks.length % 5) * 2,
                        y: Math.floor(building.racks.length / 5) * 2.5,
                        lineUp: create.attributes.lineUp,
                        bayNo: create.attributes.bayNo,
                        ownerId: create.attributes.ownerId,
                        status: create.attributes.status || 'RETAIN'
                    });
                    totalCreated++;
                }
            }
        });
    }

    console.log(`Summary: Deleted ${totalDeleted} items, Created ${totalCreated} items.`);

    // --- 5. Push Final State ---
    const { error: updateError } = await supabase
        .from('workspaces')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

    if (updateError) console.error('Update error:', updateError.message);
    else console.log('--- SURGICAL CLEAN COMPLETE ---');
}

applyInstructions();
