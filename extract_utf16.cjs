
const fs = require('fs');

async function extract() {
    const data = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt', 'utf16le');
    console.log('Total characters:', data.length);

    const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';
    let index = data.indexOf(marker);

    if (index !== -1) {
        console.log('Found marker at character index:', index);
        const sub = data.substring(index + marker.length);
        const start = sub.indexOf('{');
        if (start !== -1) {
            let braces = 0;
            let end = -1;
            for (let i = start; i < sub.length; i++) {
                if (sub[i] === '{') braces++;
                if (sub[i] === '}') braces--;
                if (braces === 0 && i > start) {
                    end = i;
                    break;
                }
            }
            if (end !== -1) {
                const jsonStr = sub.substring(start, end + 1);
                try {
                    const ws = JSON.parse(jsonStr);
                    console.log('--- VALID WORKSPACE EXTRACTED ---');
                    console.log('Sites:', ws.sites?.length);
                    ws.sites?.forEach(s => console.log(`- ${s.name} (${s.id})`));

                    fs.writeFileSync('recovered_workspace.json', JSON.stringify(ws, null, 2));
                    console.log('Saved to recovered_workspace.json');
                } catch (e) {
                    console.error('JSON Parse error:', e.message);
                }
            }
        }
    } else {
        console.log('Marker not found in character stream.');
    }
}

extract();
