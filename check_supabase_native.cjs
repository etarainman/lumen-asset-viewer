
const https = require('https');

const url = 'https://kcuxcvegeyfymizkiodb.supabase.co/rest/v1/workspaces?id=eq.LUMEN_BIM_PRODUCTION_V1&select=data,updated_at';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY';

const options = {
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.length > 0) {
                const workspace = json[0];
                console.log('Last Updated:', workspace.updated_at);
                const wsData = workspace.data;
                console.log('Sites:', wsData.sites?.length || 0);
                console.log('Buildings:', wsData.buildings?.length || 0);
                if (wsData.sites) {
                    wsData.sites.forEach(s => console.log(`- Site: ${s.name} (${s.id})`));
                }
                if (wsData.buildings) {
                    console.log('Total Racks:', wsData.buildings.reduce((acc, b) => acc + (b.racks?.length || 0), 0));
                }
            } else {
                console.log('No data found for this ID.');
            }
        } catch (e) {
            console.error('Error parsing response:', e.message);
            console.log('Raw output:', data);
        }
    });
}).on('error', (err) => {
    console.error('Request error:', err.message);
});
