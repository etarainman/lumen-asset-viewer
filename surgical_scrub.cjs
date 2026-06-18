
const fs = require('fs');

function scrub() {
    const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');
    const marker = Buffer.from('LUMEN_BIM_PRODUCTION_V1', 'utf16le');
    const index = buffer.indexOf(marker);

    if (index === -1) {
        console.log('Marker not found in binary.');
        return;
    }

    console.log('Found marker at byte:', index);

    // Take a huge chunk around the marker (100KB before, 200KB after if possible)
    const startByte = Math.max(0, index - 100000);
    const endByte = Math.min(buffer.length, index + 200000);
    const chunk = buffer.slice(startByte, endByte);

    // SCRUBBING LOGIC:
    // Browser local storage dumps often interleave metadata or use UTF-16.
    // We will look for anything that looks like a JSON property start: "something":

    let text = "";
    for (let i = 0; i < chunk.length; i++) {
        const b = chunk[i];
        if (b >= 32 && b <= 126) {
            text += String.fromCharCode(b);
        } else if (b === 10 || b === 13) {
            text += String.fromCharCode(b);
        }
    }

    console.log('Scrubbed text length:', text.length);

    // Look for the largest valid JSON block in this scrubbed text
    function extractFirstValidJSON(str) {
        let first = str.indexOf('{"sites":');
        if (first === -1) return null;

        let last = str.lastIndexOf('}');
        while (last > first) {
            try {
                const candidate = str.substring(first, last + 1);
                const parsed = JSON.parse(candidate);
                if (parsed.sites && parsed.buildings) return parsed;
            } catch (e) { }
            last = str.lastIndexOf('}', last - 1);
        }
        return null;
    }

    const ws = extractFirstValidJSON(text);
    if (ws) {
        const racks = (ws.buildings || []).reduce((s, b) => s + (b.racks?.length || 0), 0);
        const eq = (ws.buildings || []).reduce((s, b) => s + (b.equipment?.length || 0), 0);
        console.log(`--- RECOVERED ---`);
        console.log(`Racks: ${racks}, Eq: ${eq}`);
        fs.writeFileSync('reversion_final.json', JSON.stringify(ws, null, 2));
        console.log('Saved to reversion_final.json');
    } else {
        console.log('No valid JSON structure found in scrubbed chunk.');
        // Debug snippet
        console.log('Snippet:', text.substring(0, 500));
    }
}

scrub();
