
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcuxcvegeyfymizkiodb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';
const workspaceId = 'LUMEN_BIM_PRODUCTION_V1';

const supabase = createClient(supabaseUrl, supabaseKey);

const buildingMeta = [
    { id: 'B-1767515636454', siteId: 'A0001', label: '0001', name: 'Building 0001' },
    { id: 'B-1767515642457', siteId: 'A0001', label: '0002', name: 'Building 0002' },
    { id: 'B-1767515651632', siteId: 'A0001', label: '0003', name: 'Building 0003' },
    { id: 'B-1767444421325', siteId: 'A1002', label: '0001', name: 'Building 0001' },
    { id: 'B-1767970730013', siteId: 'A1002', label: '0002', name: 'Building 0002' },
    { id: 'B-1771843293947', siteId: 'A1002', label: '0003', name: 'Building 0003' },
    { id: 'B-1771843303018', siteId: 'A1002', label: '0004', name: 'Building 0004' },
    { id: 'B-1769863293709', siteId: 'A004', label: '0001', name: 'Building 0001' },
    { id: 'B-1769863372354', siteId: 'A004', label: '0002', name: 'Building 0002' },
    { id: 'B-1769863381661', siteId: 'A004', label: '0003', name: 'Building 0003' },
    { id: 'B-1769863389038', siteId: 'A004', label: '0004', name: 'Building 0004' }
];

async function hardWipe() {
    console.log('--- PERFORMING HARD WIPE TO STOP CONTAMINATION ---');

    const ws = {
        sites: [
            { id: 'A0001', customerId: 'CSRKCOCF', name: 'Castlerock', lat: 39.371693, lng: -104.865836, digitizedStatus: 'Digitized' },
            { id: 'A1002', customerId: 'PTVLCO03', name: 'Plateville', lat: 40.186075, lng: -104.817409, digitizedStatus: 'Not Digitized' },
            { id: 'A004', customerId: 'PLLKCO01', name: 'Palmer Lake', lat: 39.125068, lng: -104.907596, digitizedStatus: 'Not Digitized' }
        ],
        buildings: buildingMeta.map((b, i) => ({
            ...b,
            definitionId: 'TYPE_A', x: (i % 5) * 50, z: 0,
            racks: [], equipment: [], suites: [], status: 'RETAIN', ownerId: 'OWN_LUMEN'
        })),
        buildingDefs: [
            { id: 'TYPE_A', name: 'Type A (16 x 12)', width: 16, depth: 12, height: 10, color: '#d2c29d', roofColor: '#ffffff' }
        ],
        rackDefs: [], equipmentDefs: [], vendors: [], owners: [], statuses: [], history: [], proInventory: []
    };

    const { error } = await supabase
        .from('workspaces')
        .update({ data: ws, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

    if (error) console.error('Wipe failed:', error.message);
    else console.log('WORKSPACE WIPED. CLEAN BASELINE RESTORED.');
}

hardWipe();
