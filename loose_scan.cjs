
const fs = require('fs');

const file = 'RECOVERED_KEY_A0001eS.json';
if (!fs.existsSync(file)) {
    console.error('File missing.');
    process.exit(1);
}

const raw = fs.readFileSync(file, 'utf16le');
console.log('--- SCANNING RECOVERED BINARY BLOCK ---');

const patterns = {
    coords: /"x":\s*(-?\d+\.?\d*).*?"z":\s*(-?\d+\.?\d*)/g,
    labels: /"label":"([^"]+)"/g,
    names: /"name":"([^"]+)"/g,
    url: /"url":"(https:\/\/[^"]+)"/g,
    ids: /"id":"(B-\d+)"/g
};

const results = {
    coords: [], labels: [], names: [], urls: [], ids: []
};

Object.entries(patterns).forEach(([name, regex]) => {
    let match;
    while ((match = regex.exec(raw)) !== null) {
        results[name].push(match[1] + (match[2] ? ',' + match[2] : ''));
    }
});

console.log('Results:', results);
