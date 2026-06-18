
const fs = require('fs');

function extract() {
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');
    const text = buffer.toString('utf16le');

    // Find "LUMEN_BIM_WORKSPACE_STABLE_V1"
    const key = "LUMEN_BIM_WORKSPACE_STABLE_V1";
    let start = text.indexOf(key);
    if (start === -1) return console.log('Key not found.');

    // Look for the next "{" after the key
    let jsonStart = text.indexOf('{', start);
    if (jsonStart === -1) return console.log('JSON start not found.');

    // Extract up to 200KB
    let frag = text.substring(jsonStart, jsonStart + 100000);

    // Scrub the noise - we'll only keeps chars that look like valid JSON
    // but we'll be lenient.
    let clean = "";
    for (let i = 0; i < frag.length; i++) {
        const c = frag[i];
        if (c === '{' || c === '}' || c === '[' || c === ']' || c === '"' || c === ':' || c === ',' || c === '.' || c === '-' || (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === ' ') {
            clean += c;
        }
    }

    console.log('Cleaned length:', clean.length);
    console.log('Snippet:', clean.substring(0, 500));

    fs.writeFileSync('CLEAN_SCOOP.txt', clean);
}

extract();
