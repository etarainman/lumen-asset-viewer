
const fs = require('fs');

const data = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage_utf8.txt', 'utf8');

// The file seems to have a lot of noise. Let's try to find JSON objects.
try {
    // Look for AMBIFLO_WORKSPACE_STABLE_V1
    const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';
    const index = data.indexOf(marker);
    if (index !== -1) {
        console.log('Found marker at', index);
        // Find the start of the JSON value after the marker
        // Typical structure in localStorage dump: "...key":"{...}" or similar
        const sub = data.substring(index + marker.length);
        const start = sub.indexOf('{');
        // Simple brace counting to find the object
        let braces = 0;
        let end = -1;
        for (let i = start; i < sub.length; i++) {
            if (sub[i] === '{') braces++;
            if (sub[i] === '}') braces--;
            if (braces === 0 && start !== -1) {
                end = i;
                break;
            }
        }
        if (end !== -1) {
            const jsonStr = sub.substring(start, end + 1).replace(/\\"/g, '"');
            const ws = JSON.parse(jsonStr);
            console.log('--- Workspace Summary ---');
            console.log('Sites:', ws.sites?.length || 0);
            ws.sites?.forEach(s => console.log(`- ${s.name} (${s.id})`));
            console.log('Buildings:', ws.buildings?.length || 0);
            const bCounts = {};
            ws.buildings?.forEach(b => {
                bCounts[b.siteId] = (bCounts[b.siteId] || 0) + 1;
            });
            console.log('Buildings per site:', bCounts);
        }
    } else {
        console.log('Marker not found.');
    }
} catch (e) {
    console.error('Extraction failed:', e.message);
}
