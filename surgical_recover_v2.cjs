
const fs = require('fs');

function surgicallyRecover() {
    console.log('--- FINAL SURGICAL RECOVERY ---');
    const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');

    // Step 1: Decode as UTF-16LE
    let text = buffer.toString('utf16le');

    // Step 2: Remove ONLY null bytes and check for marker
    let clean = text.replace(/\0/g, '');
    const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';
    let index = clean.indexOf(marker);

    if (index === -1) {
        // Try reversing the buffer if it was read with wrong endianness?
        console.log('Marker not found in direct UTF-16LE. Trying byte-by-byte shift...');
        // Sometimes UTF-16 starts at an odd offset
        text = buffer.slice(1).toString('utf16le');
        clean = text.replace(/\0/g, '');
        index = clean.indexOf(marker);
    }

    if (index !== -1) {
        console.log('Marker found at:', index);
        let start = clean.indexOf('{"sites":', index);
        if (start !== -1) {
            let braces = 0;
            let end = -1;
            for (let i = start; i < clean.length; i++) {
                if (clean[i] === '{') braces++;
                if (clean[i] === '}') braces--;
                if (braces === 0 && i > start) {
                    end = i;
                    break;
                }
            }
            if (end !== -1) {
                const jsonStr = clean.substring(start, end + 1);
                try {
                    // Try to repair common UTF-16 to UTF-8 corruption symbols
                    const repaired = jsonStr.replace(/[^\x20-\x7E\s]/g, '');
                    const ws = JSON.parse(repaired);
                    console.log('--- RECOVERY SUCCESSFUL! ---');
                    const racks = (ws.buildings || []).reduce((s, b) => s + (b.racks?.length || 0), 0);
                    const eq = (ws.buildings || []).reduce((s, b) => s + (b.equipment?.length || 0), 0);
                    console.log(`Verified State: Racks=${racks}, Equipment=${eq}`);

                    fs.writeFileSync('reversion_final.json', JSON.stringify(ws, null, 2));
                    console.log('Saved to reversion_final.json');
                    return;
                } catch (e) {
                    console.error('Final parse failed:', e.message);
                }
            }
        }
    }
    console.error('Recovery failed.');
}

surgicallyRecover();
