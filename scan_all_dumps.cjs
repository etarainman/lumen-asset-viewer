
const fs = require('fs');

function scan(file) {
    console.log(`\nScanning ${file}...`);
    if (!fs.existsSync(file)) return;
    const buffer = fs.readFileSync(file);
    const marker = Buffer.from('LUMEN_BIM_PRODUCTION_V1');
    let pos = 0;
    while ((pos = buffer.indexOf(marker, pos)) !== -1) {
        console.log(`Found ID at ${pos}`);
        // Look backward for "data":{"
        // We'll look for the first '{' within 1MB backward
        let start = -1;
        let braces = 1;
        for (let i = pos; i >= 0; i--) {
            if (buffer[i] === 0x7B) { // '{'
                // This might be the start. Let's try to parse from here.
                const candidate = buffer.slice(i, pos + 2000); // Take a chunk
                // Clean and check
                const text = candidate.toString('utf8').replace(/[^\x20-\x7E]/g, '');
                if (text.includes('"sites"')) {
                    console.log(`  - Potential start found at ${i}`);
                    start = i;
                    break;
                }
            }
        }
        pos += marker.length;
    }
}

scan('tmp_restore/backup_localstorage.txt');
scan('tmp_restore_2/backup_localstorage.txt');
scan('backup_localstorage.txt');
