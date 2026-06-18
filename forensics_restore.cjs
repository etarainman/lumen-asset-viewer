
const fs = require('fs');

function forensics() {
    console.log('--- DEEP BINARY FORENSICS: RECOVERING FEBRUARY 23RD WORKSPACE ---');
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');

    const marker = Buffer.from('AMBIFLO_WORKSPACE_STABLE_V1', 'utf16le');
    const startIdx = buffer.indexOf(marker);

    if (startIdx === -1) {
        console.error('Marker not found.');
        return;
    }

    console.log('Found ID marker at byte:', startIdx);

    // Find the first '{' (7B 00) after the marker
    let jsonStart = -1;
    for (let i = startIdx; i < buffer.length - 1; i += 2) {
        if (buffer[i] === 0x7b && buffer[i + 1] === 0x00) {
            jsonStart = i;
            break;
        }
    }

    if (jsonStart === -1) {
        console.error('JSON start ({) not found.');
        return;
    }

    console.log('JSON structure starts at byte:', jsonStart);

    // Extract the stream, skipping high-byte noise
    let jsonStr = "";
    for (let i = jsonStart; i < buffer.length - 1; i += 2) {
        const charCode = buffer[i];
        const highByte = buffer[i + 1];

        if (highByte === 0x00) {
            // Check if it's a "sane" character for JSON
            // (printable ASCII plus some common extensions if needed)
            if (charCode >= 32 && charCode <= 126) {
                jsonStr += String.fromCharCode(charCode);
            }
        }
    }

    console.log('Extracted stream length:', jsonStr.length);

    // Now find the largest parseable JSON block
    function findBestObject(str) {
        let first = str.indexOf('{"sites"');
        if (first === -1) return null;

        let last = str.lastIndexOf('}');
        while (last > first) {
            try {
                const candidate = str.substring(first, last + 1);
                const parsed = JSON.parse(candidate);
                // Heuristic: it must have sites and buildings
                if (parsed.sites && parsed.buildings && parsed.buildings.length > 5) {
                    return parsed;
                }
            } catch (e) { }
            last = str.lastIndexOf('}', last - 1);
        }
        return null;
    }

    const ws = findBestObject(jsonStr);

    if (ws) {
        console.log('--- RECOVERY SUCCESSFUL! ---');
        console.log(`Buildings: ${ws.buildings.length}`);
        console.log(`Racks: ${ws.buildings.reduce((s, b) => s + (b.racks?.length || 0), 0)}`);

        // Show some proof of building dimensions to reassure the user
        const b = ws.buildings[0];
        console.log(`Verification: Building ${b.label} at X:${b.x}, Z:${b.z}. DefID: ${b.definitionId}`);

        fs.writeFileSync('RESTORED_VERSION_PREV.json', JSON.stringify(ws, null, 2));
        console.log('Saved to RESTORED_VERSION_PREV.json');
    } else {
        console.log('Could not parse extracted stream. Snippet of stream:');
        console.log(jsonStr.substring(0, 500));
    }
}

forensics();
