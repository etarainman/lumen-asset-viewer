
const fs = require('fs');

function extract() {
    console.log('--- RECOVERING BINARY JSON ---');
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');

    // The data is UTF-16LE, but has weird characters like 0x8D, 0xAF, etc.
    // We will extract strictly valid JSON characters and skip nulls.
    let text = "";
    for (let i = 0; i < buffer.length; i++) {
        const b = buffer[i];
        // JSON valid characters are roughly 32-126, plus 10, 13
        if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
            text += String.fromCharCode(b);
        }
    }

    console.log('Extracted stream length:', text.length);

    const marker = '{"sites":';
    let start = text.indexOf(marker);
    if (start === -1) {
        console.error('JSON marker not found.');
        return;
    }

    // Try multiple start points if the first one fails
    let searchIdx = start;
    while (searchIdx !== -1) {
        let braces = 0;
        let end = -1;
        for (let i = searchIdx; i < text.length; i++) {
            if (text[i] === '{') braces++;
            if (text[i] === '}') braces--;
            if (braces === 0 && i > searchIdx) {
                end = i;
                break;
            }
        }

        if (end !== -1) {
            const jsonStr = text.substring(searchIdx, end + 1);
            try {
                // Try to heal corrupted keys (e.g. eS...t instead of "lat")
                // Based on hex: 41 30 30 30 31 65 53 f0 5e 74 22 3a 33 39
                // It looks like "lat" became "eS^t" or similar.
                // We will use a regex to fix obvious field names
                let healed = jsonStr
                    .replace(/eS\^t/g, 'lat')
                    .replace(/lng/g, 'lng')
                    .replace(/name/g, 'name')
                    .replace(/customerId/g, 'customerId')
                    .replace(/digitizedStatus/g, 'digitizedStatus')
                    .replace(/buildings/g, 'buildings')
                    .replace(/racks/g, 'racks')
                    .replace(/equipment/g, 'equipment');

                const ws = JSON.parse(healed);
                console.log('--- SUCCESS: REAL SNAPSHOT RECOVERED ---');
                const rackCount = (ws.buildings || []).reduce((s, b) => s + (b.racks?.length || 0), 0);
                const eqCount = (ws.buildings || []).reduce((s, b) => s + (b.equipment?.length || 0), 0);
                console.log(`Snapshot Stats: Racks=${rackCount}, Equipment=${eqCount}, Buildings=${ws.buildings?.length}`);

                fs.writeFileSync('FINAL_REAL_BACKUP.json', JSON.stringify(ws, null, 2));
                return;
            } catch (e) {
                // Not a valid JSON yet
            }
        }
        searchIdx = text.indexOf(marker, searchIdx + 1);
    }
    console.error('Could not find a valid parseable JSON object.');
}

extract();
