
const fs = require('fs');

function huntFragments(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Look for patterns like "EQ_..." or "V_..." or "OWN_..."
    const patterns = [
        /EQ_[A-Z0-9_]+/g,
        /RACK_[A-Z0-9_]+/g,
        /TYPE_[A-Z0-9_]+/g,
        /V_[A-Z0-9_]+/g,
        /OWN_[A-Z0-9_]+/g
    ];

    const found = new Set();
    patterns.forEach(p => {
        const matches = content.match(p) || [];
        matches.forEach(m => found.add(m));
    });

    console.log('--- FOUND FRAGMENTS ---');
    console.log(Array.from(found).sort().join('\n'));
}

huntFragments('backup_localstorage.txt');
huntFragments('RECOVERED_KEY_A0001eS.json');
