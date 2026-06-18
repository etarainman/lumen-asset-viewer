
const fs = require('fs');

function deepRecover() {
    console.log('--- REVERSION: BINARY-SAFE RECOVERY ---');
    const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');

    // Convert to a clean ASCII string by skipping every second byte if it's null (UTF-16LE)
    // or just filtering for printable characters.
    let text = "";
    for (let i = 0; i < buffer.length; i++) {
        const b = buffer[i];
        if (b >= 32 && b <= 126) {
            text += String.fromCharCode(b);
        } else if (b === 10 || b === 13) {
            text += String.fromCharCode(b);
        }
    }

    console.log('Cleaned text length:', text.length);

    // Look for the specific "148 racks" state. 
    // We'll search for "AMBIFLO_WORKSPACE_STABLE_V1"
    const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';
    let index = 0;
    let foundWorkspaces = [];

    while ((index = text.indexOf(marker, index)) !== -1) {
        let start = text.indexOf('{"sites":[', index);
        if (start !== -1) {
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
                const jsonStr = text.substring(start, end + 1);
                try {
                    const ws = JSON.parse(jsonStr);
                    const rackCount = (ws.buildings || []).reduce((s, b) => s + (b.racks?.length || 0), 0);
                    const eqCount = (ws.buildings || []).reduce((s, b) => s + (b.equipment?.length || 0), 0);

                    console.log(`Candidate found at index ${index}: Racks=${rackCount}, Eq=${eqCount}`);
                    foundWorkspaces.push({ ws, rackCount, eqCount });
                } catch (e) { }
            }
        }
        index += 1;
    }

    // Select the one that matches 148 Racks / 108 Equipment
    const target = foundWorkspaces.find(item => item.rackCount === 148 && item.eqCount === 108)
        || foundWorkspaces[0]; // fallback to best candidate

    if (target) {
        console.log(`\nSELECTED WORKSPACE: Racks=${target.rackCount}, Equipment=${target.eqCount}`);
        fs.writeFileSync('final_reversion_target.json', JSON.stringify(target.ws, null, 2));
        console.log('Saved to final_reversion_target.json');
    } else {
        console.error('Could not find the Feb 24th state in the dump.');
    }
}

deepRecover();
