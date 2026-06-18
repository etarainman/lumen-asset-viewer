
const fs = require('fs');

/**
 * recover_binary_pure.cjs
 * Reads the raw project data as Latin-1, searches for the workspace marker,
 * and extracts the full JSON object including all BIM arrangements.
 */
function pureExtraction() {
    console.log('--- PERFORMING PURE BINARY EXTRACTION ---');
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');

    // Convert to Latin1 to keep the byte values intact (1 byte = 1 character)
    const raw = buffer.toString('latin1');

    // Step 1: Find the WORKSPACE_KEY or '{"sites":'
    const marker = '{"sites":';
    let start = raw.indexOf(marker);
    if (start === -1) {
        // Try searching for the key itself
        const key = 'AMBIFLO_WORKSPACE_STABLE_V1';
        let keyIdx = raw.indexOf(key);
        if (keyIdx !== -1) {
            start = raw.indexOf('{', keyIdx);
        }
    }

    if (start === -1) {
        console.error('Marker not found in raw binary.');
        return;
    }

    console.log(`JSON start found at byte offset: ${start}`);

    // Step 2: Extract until the last balanced brace
    let braces = 0;
    let end = -1;
    for (let i = start; i < raw.length; i++) {
        if (raw[i] === '{') braces++;
        if (raw[i] === '}') braces--;
        if (braces === 0 && i > start) {
            end = i;
            break;
        }
    }

    if (end === -1) {
        console.error('Unbalanced braces or truncated JSON.');
        // Log a larger snippet for visual inspection
        console.log('Raw Snippet:', JSON.stringify(raw.substring(start, start + 1000)));
        return;
    }

    const payload = raw.substring(start, end + 1);
    console.log(`Extracted payload length: ${payload.length}`);

    // Step 3: Heuristic Repair of the "Mangling"
    // Witnessed mangling: 
    // "id":"A0001eS^t" should be "id":"A0001","lat"
    // "1002{ 40.186" should be "id":"A1002","lat":40.186

    // We will attempt to repair it by replacing common broken patterns
    let healed = payload
        .replace(/A0001eS\^t":/g, 'A0001","lat":')
        .replace(/{"eA1002/g, '{"id":"A1002"')
        .replace(/A1002>{ /g, 'A1002","lat":')
        .replace(/2{17409{plateville/g, ',"lng":-104.817409,"name":"Plateville"')
        .replace(/A004/g, 'A004');

    // To prevent data contamination, we will also try a "CLEAN UP" approach
    // that keeps only printable ASCII.
    let clean = "";
    for (let i = 0; i < healed.length; i++) {
        const c = healed[i];
        if ((c >= ' ' && c <= '~') || c === '\n' || c === '\r' || c === '\t') {
            clean += c;
        } else {
            // Replace binary noise with a placeholder to keep structure
            clean += ' ';
        }
    }

    // Save for verification
    fs.writeFileSync('RECONSTRUCTION_SOURCE.json', clean);
    console.log('Raw reconstruction source saved to RECONSTRUCTION_SOURCE.json');

    // Attempt to parse (might still fail, but we'll try)
    try {
        const data = JSON.parse(clean.replace(/\s+/g, ' '));
        console.log('--- RECOVERY VERIFIED ---');
        console.log(`Buildings: ${data.buildings?.length || 0}`);
        fs.writeFileSync('RESTORED_VERSION_AUTO.json', JSON.stringify(data, null, 2));
    } catch (e) {
        console.warn('Direct parse failed - manual repair required. (Error:', e.message, ')');
    }
}

pureExtraction();
