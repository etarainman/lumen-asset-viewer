
const fs = require('fs');

const data = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt', 'latin1');
console.log('File size:', data.length);

const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';
let index = data.indexOf(marker);

while (index !== -1) {
    console.log('Found marker at', index);
    const sub = data.substring(index + marker.length);
    const start = sub.indexOf('{');
    console.log('JSON start found at', start);
    if (start !== -1) {
        let braces = 0;
        let found = false;
        let end = -1;
        for (let i = start; i < sub.length; i++) {
            if (sub[i] === '{') braces++;
            if (sub[i] === '}') braces--;
            if (braces === 0 && i > start) {
                end = i;
                found = true;
                break;
            }
        }
        console.log('Brace counting found end at', end);
        if (found) {
            const jsonStr = sub.substring(start, end + 1);
            console.log('Extracting JSON string of length', jsonStr.length);
            try {
                // Remove some potential noise
                const cleanJson = jsonStr.replace(/[^\x20-\x7E]/g, '');
                console.log('Cleaned length:', cleanJson.length);
                const ws = JSON.parse(cleanJson);
                console.log('--- Valid Workspace Found ---');
                console.log('Sites:', ws.sites?.length || 0);
                ws.sites?.forEach(s => console.log(`- ${s.name} (${s.id})`));
                console.log('Buildings:', ws.buildings?.length || 0);
                break;
            } catch (e) {
                console.log('Invalid JSON:', e.message.substring(0, 100));
            }
        }
    }
    index = data.indexOf(marker, index + 1);
}
