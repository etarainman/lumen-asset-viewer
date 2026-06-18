
const https = require('https');

const workspaceIds = ['LUMEN_BIM_PRODUCTION_V1', 'LUMEN_BIM_WORKSPACE_STABLE_V1', 'AMBIFLO_WORKSPACE_STABLE_V1'];
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

function checkId(id) {
    return new Promise((resolve) => {
        const url = `https://kcuxcvegeyfymizkiodb.supabase.co/rest/v1/workspaces?id=eq.${id}&select=data,updated_at`;
        const options = {
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.length > 0) {
                        const workspace = json[0];
                        resolve({ id, updated_at: workspace.updated_at, sites: workspace.data.sites?.length || 0, buildings: workspace.data.buildings?.length || 0 });
                    } else {
                        resolve({ id, error: 'Not found' });
                    }
                } catch (e) {
                    resolve({ id, error: 'Parse error: ' + e.message, raw: data.substring(0, 100) });
                }
            });
        }).on('error', (err) => {
            resolve({ id, error: 'Request error: ' + err.message });
        });
    });
}

async function run() {
    console.log('Checking multiple workspace IDs...');
    for (const id of workspaceIds) {
        const result = await checkId(id);
        console.log(JSON.stringify(result, null, 2));
    }
}

run();
