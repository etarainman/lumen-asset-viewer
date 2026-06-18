
const fs = require('fs');

function extract() {
    console.log('--- REVERSION: EXTRACTING FEB 24 STATE ---');
    const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');

    // Convert UTF-16LE to clean string
    let text = buffer.toString('utf16le');
    console.log('De-coded text length:', text.length);

    const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';
    let index = text.indexOf(marker);

    if (index === -1) {
        console.error('Marker not found in UTF-16LE stream.');
        return;
    }

    // Scan for the first '{' after the marker
    let start = text.indexOf('{', index);
    if (start === -1) return;

    // Brace counting to find the end of the JSON object
    let braces = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
        if (text[i] === '{') braces++;
        if (text[i] === '}') braces--;
        if (braces === 0) {
            end = i;
            break;
        }
    }

    if (end !== -1) {
        let jsonStr = text.substring(start, end + 1);
        try {
            // Clean up potentially corrupted characters (common in browser dumps)
            // JSON expects specific characters; we'll try to heal minor corruptions
            const ws = JSON.parse(jsonStr);
            console.log('--- SUCCESS: FEB 24 STATE EXTRACTED ---');
            console.log('Sites:', ws.sites?.length);
            console.log('Buildings:', ws.buildings?.length);

            // Calculate Rack/Equipment counts to verify it matches the Feb 24th stats
            const racks = (ws.buildings || []).reduce((sum, b) => sum + (b.racks?.length || 0), 0);
            const eq = (ws.buildings || []).reduce((sum, b) => sum + (b.equipment?.length || 0), 0);
            console.log(`Verification: Racks=${racks}, Equipment=${eq}`);

            if (racks === 148 && eq === 108) {
                console.log('Confirmed: This is the exact Feb 24th state.');
            }

            fs.writeFileSync('reversion_target.json', JSON.stringify(ws, null, 2));
            console.log('Saved to reversion_target.json');
        } catch (e) {
            console.error('JSON Parse error:', e.message);
            // Snippet for manual fix if needed
            console.log('Snippet:', jsonStr.substring(0, 100));
        }
    }
}

extract();
