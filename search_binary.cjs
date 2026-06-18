
const fs = require('fs');
const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');

function search(str) {
    console.log(`Searching for "${str}"...`);
    const marker = Buffer.from(str);
    const index = buffer.indexOf(marker);
    if (index !== -1) {
        console.log(`Found "${str}" at index ${index}`);
        return true;
    }
    // Try UTF-16LE
    const utf16 = Buffer.from(str, 'utf16le');
    const index16 = buffer.indexOf(utf16);
    if (index16 !== -1) {
        console.log(`Found "${str}" at index ${index16} (UTF-16LE)`);
        return true;
    }
    return false;
}

search('AMBIFLO');
search('LUMEN_BIM');
search('CSRKCOCF');
search('sites');
