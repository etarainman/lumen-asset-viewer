
const fs = require('fs');

function deepScan() {
    console.log('--- PERFORMING DEEP TOKEN SCAN ---');
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');
    const text = buffer.toString('utf16le').replace(/[^\x20-\x7E\s]/g, '_');

    // Find Building IDs: B- followed by timestamp
    const bRegex = /B-\d+/g;
    const buildings = Array.from(new Set(text.match(bRegex)));
    console.log(`Potential Building IDs found: ${buildings.length}`);

    // Find Coordinates: Look for numeric pairs near building IDs or markers
    // Example: 39.371693, -104.865836
    const coordRegex = /(-?\d{1,3}\.\d{4,9})/g;
    const coords = Array.from(new Set(text.match(coordRegex)));
    console.log(`Found ${coords.length} geographic/coordinate tokens.`);

    // Find Labels: Numbers like 0001, 0002
    const labelRegex = /"label":"(\d+)"/g;
    const labels = [];
    let match;
    while ((match = labelRegex.exec(text)) !== null) {
        labels.push(match[1]);
    }
    console.log(`Found ${labels.length} specific building labels.`);

    // Find Floor Plans (Remote URLs)
    const fpRegex = /"url":"(https:\/\/[a-z0-9-]+\.scf\.usercontent\.goog\/[^"]+)"/g;
    const fps = [];
    while ((match = fpRegex.exec(text)) !== null) {
        fps.push(match[1]);
    }
    console.log(`Found ${fps.length} Floor Plan URLs.`);

    // Now let's try to map them by scanning the proximity in the raw buffer (UTF-16LE)
    const results = [];
    buildings.forEach(bid => {
        const idx = text.indexOf(bid);
        const snippet = text.substring(idx - 100, idx + 500);
        // Look for X/Z coordinates in the snippet
        // Format: "x":... "z":...
        const xMatch = snippet.match(/"x":\s*(-?\d+\.?\d*)/);
        const zMatch = snippet.match(/"z":\s*(-?\d+\.?\d*)/);
        const lMatch = snippet.match(/"label":"([^"]+)"/);
        const sMatch = snippet.match(/"siteId":"([^"]+)"/);

        if (xMatch || zMatch || lMatch) {
            results.push({
                id: bid,
                siteId: sMatch ? sMatch[1] : 'UNK',
                label: lMatch ? lMatch[1] : 'UNK',
                x: xMatch ? parseFloat(xMatch[1]) : 0,
                z: zMatch ? parseFloat(zMatch[1]) : 0
            });
        }
    });

    console.log('--- RECONSTRUCTED BUILDING LAYOUT (PROTOTYPE) ---');
    console.table(results);

    fs.writeFileSync('RECOVERED_TOKENS.json', JSON.stringify({ buildings: results, fps }, null, 2));
}

deepScan();
