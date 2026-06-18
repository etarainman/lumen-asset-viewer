
const fs = require('fs');

/**
 * recover_v3.cjs
 * Performs a byte-level search and repair of mangled JSON in binary dumps.
 */
function forensics() {
    console.log('--- STARTING FORENSIC RECOVERY V3 ---');
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');

    // We search for the literal string '{"sites":' in any encoding (UTF-8 or UTF-16LE)
    const utf8Marker = Buffer.from('{"sites":', 'utf8');
    const utf16Marker = Buffer.from('{"sites":', 'utf16le');

    let startIdx = buffer.indexOf(utf8Marker);
    let encoding = 'utf8';

    if (startIdx === -1) {
        startIdx = buffer.indexOf(utf16Marker);
        encoding = 'utf16le';
    }

    if (startIdx === -1) {
        console.error('CRITICAL: Project state marker NOT FOUND in binary dump.');
        return;
    }

    console.log(`Marker found at byte ${startIdx} (Encoding: ${encoding})`);

    // Extract raw string based on encoding
    let text = "";
    if (encoding === 'utf16le') {
        // Skip high bytes if they are 0x00 to handle the "mangling"
        for (let i = startIdx; i < buffer.length - 1; i += 2) {
            const low = buffer[i];
            const high = buffer[i + 1];
            if (high === 0x00 && low >= 32 && low <= 126) {
                text += String.fromCharCode(low);
            } else if (low === 10 || low === 13) {
                text += String.fromCharCode(low);
            }
        }
    } else {
        text = buffer.slice(startIdx).toString('utf8');
    }

    console.log(`Extracted raw stream length: ${text.length}`);

    // Heuristic Repair: The data is "mangled" - we need to fix obvious field corruptions
    // witnessed in previous attempts (e.g. lat -> eS^t)
    let repaired = text
        .replace(/eS\^t/g, 'lat')
        .replace(/lng/g, 'lng')
        .replace(/Building/g, 'Building')
        .replace(/siteId/g, 'siteId')
        .replace(/A0001/g, 'A0001')
        .replace(/A1002/g, 'A1002')
        .replace(/A004/g, 'A004');

    // Find the largest valid JSON object starting from the marker
    let firstBrace = repaired.indexOf('{');
    if (firstBrace === -1) return console.error('No JSON object found.');

    let success = false;
    for (let end = repaired.lastIndexOf('}'); end > firstBrace; end = repaired.lastIndexOf('}', end - 1)) {
        const candidate = repaired.substring(firstBrace, end + 1);
        try {
            const data = JSON.parse(candidate);
            if (data.sites && data.buildings) {
                console.log('--- RECOVERY SUCCESSFUL ---');
                console.log(`Sites: ${data.sites.length}`);
                console.log(`Buildings: ${data.buildings.length}`);
                const rackCount = data.buildings.reduce((s, b) => s + (b.racks?.length || 0), 0);
                console.log(`Racks: ${rackCount}`);

                fs.writeFileSync('RECOVERED_FEB23_STATE.json', JSON.stringify(data, null, 2));
                console.log('Saved to RECOVERED_FEB23_STATE.json');
                success = true;
                break;
            }
        } catch (e) {
            // keep trying smaller windows
        }
    }

    if (!success) {
        console.error('FAILED to parse a valid workspace object from the mangled stream.');
        // Log a snippet for further adjustment
        console.log('Snippet of mangled text:', text.substring(0, 500));
    }
}

forensics();
