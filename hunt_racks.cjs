
const fs = require('fs');

function hunt() {
    const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');
    console.log('--- HUNTING FOR THE 148-RACK STATE ---');

    // Search for "racks":[] or similar patterns
    // JSON strings in UTF-16LE will have 0x00 between characters.
    // We'll search for the sequence 'r' 0 'a' 0 'c' 0 'k' 0 's' 0
    const marker = Buffer.from('racks', 'utf16le');
    let pos = 0;
    while ((pos = buffer.indexOf(marker, pos)) !== -1) {
        console.log(`Potential match at byte ${pos}`);

        // Peek around
        const snippet = buffer.slice(Math.max(0, pos - 100), pos + 1000).toString('utf16le');
        // Clean out any really weird characters for the console
        const readable = snippet.replace(/[^\x20-\x7E\s]/g, '.');
        console.log('Snippet:', readable.substring(0, 200));

        // Count racks in this snippet
        const rackRegex = /"id":"R-/g;
        const matches = readable.match(rackRegex);
        if (matches) {
            console.log(`  - Found ${matches.length} rack starts in this 1KB snippet.`);
        }

        pos += marker.length;
    }
}

hunt();
