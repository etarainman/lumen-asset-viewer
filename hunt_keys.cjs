
const fs = require('fs');

function huntKeys() {
    console.log('--- HUNTING FOR LOCALSTORAGE KEYS ---');
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');

    // Convert to UTF-16LE and find every occurrence of the marker "lumen_bim" or "AMBIFLO"
    const text = buffer.toString('utf16le');

    const searches = ['lumen_bim', 'AMBIFLO', 'A0001', 'A1002', 'A004', 'Building'];
    const foundKeys = new Set();

    searches.forEach(s => {
        let idx = 0;
        while ((idx = text.indexOf(s, idx)) !== -1) {
            // Found a mention. Let's look backward for the key start.
            // Keys in leveldb/localstorage often have a prefix or are separated by nulls.
            let start = idx;
            while (start > 0 && text[start - 1] !== '\0' && text[start - 1] !== ' ' && text[start - 1].match(/[a-zA-Z0-9_]/)) {
                start--;
            }
            const keyCandidate = text.substring(start, idx + 50).split(/[^a-zA-Z0-9_]/)[0];
            if (keyCandidate.length > 5) {
                foundKeys.add(keyCandidate);
            }
            idx += s.length;
        }
    });

    console.log('Detected Keys:', Array.from(foundKeys));

    // Now for each key, find its JSON value
    foundKeys.forEach(key => {
        let idx = text.indexOf(key);
        console.log(`\nKey: ${key} at ${idx}`);
        let jsonStart = text.indexOf('{', idx);
        if (jsonStart !== -1 && jsonStart < idx + 200) {
            let braces = 0;
            let end = -1;
            for (let i = jsonStart; i < text.length; i++) {
                if (text[i] === '{') braces++;
                if (text[i] === '}') braces--;
                if (braces === 0) {
                    end = i;
                    break;
                }
            }
            if (end !== -1) {
                const raw = text.substring(jsonStart, end + 1);
                // Scrub binary noise
                const clean = raw.replace(/[^\x20-\x7E\s]/g, '');
                console.log(`  Value Snippet (Cleaned): ${clean.substring(0, 100)}...`);

                // If it contains "buildings", "width", or "racks", save it!
                if (clean.includes('width') || clean.includes('buildings') || clean.includes('racks')) {
                    const filename = `RECOVERED_KEY_${key}.json`;
                    fs.writeFileSync(filename, raw); // Keep raw for advanced repair
                    console.log(`  !!! IMPORTANT DATA FOUND - saved to ${filename}`);
                }
            }
        }
    });
}

huntKeys();
