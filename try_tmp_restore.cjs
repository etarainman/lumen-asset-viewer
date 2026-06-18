
const fs = require('fs');

function tryRestore() {
    const file = 'c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/tmp_restore/backup_localstorage.txt';
    if (!fs.existsSync(file)) return console.log('File not found');

    const buffer = fs.readFileSync(file);
    const text = buffer.toString('utf16le').replace(/\0/g, '');
    const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';

    const index = text.indexOf(marker);
    if (index !== -1) {
        let start = text.indexOf('{"sites":', index);
        let braces = 0;
        let end = -1;
        for (let i = start; i < text.length; i++) {
            if (text[i] === '{') braces++;
            if (text[i] === '}') braces--;
            if (braces === 0 && i > start) {
                end = i;
                break;
            }
        }

        if (end !== -1) {
            const jsonStr = text.substring(start, end + 1).replace(/[^\x20-\x7E\s]/g, '');
            try {
                const ws = JSON.parse(jsonStr);
                const racks = (ws.buildings || []).reduce((s, b) => s + (b.racks?.length || 0), 0);
                console.log(`--- RESTORED FROM TMP_RESTORE ---`);
                console.log(`Racks: ${racks}`);
                fs.writeFileSync('THE_RESTORATION.json', JSON.stringify(ws, null, 2));
                return true;
            } catch (e) {
                console.log('Parse failed on tmp_restore version too.');
            }
        }
    }
    return false;
}

tryRestore();
