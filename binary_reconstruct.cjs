
const fs = require('fs');

function decodeUTF16(buffer) {
    return buffer.toString('utf16le');
}

function scrapeData() {
    console.log('--- RECONSTRUCTING BIM LAYOUT FROM BINARY CODES ---');
    const buffer = fs.readFileSync('tmp_restore_2/tmp_restore/backup_localstorage.txt');
    const text = decodeUTF16(buffer);
    const clean = text.replace(/[^\x20-\x7E]/g, '_');

    // Pattern search: Find things that look like buildings
    // Format: "id":"B-176...","siteId":"...","label":"0001","name":"Building 0001",..."x":123.4,"z":567.8
    const bRegex = /"id":"(B-\d+)".*?"siteId":"([^"]+)".*?"label":"([^"]+)".*?"x":\s*(-?\d+\.?\d*).*?"z":\s*(-?\d+\.?\d*)/g;

    const results = [];
    let match;
    while ((match = bRegex.exec(clean)) !== null) {
        results.push({
            id: match[1],
            siteId: match[2],
            label: match[3],
            x: parseFloat(match[4]),
            z: parseFloat(match[5])
        });
    }

    console.log(`Found ${results.length} building placements.`);

    // Find Floor Plans (Blob or Remote)
    const fpRegex = /"floorPlans":\[{"id":"([^"]+)","url":"([^"]+)"/g;
    const fpMap = {};
    while ((match = fpRegex.exec(clean)) !== null) {
        fpMap[match[1]] = match[2];
    }
    console.log(`Found ${Object.keys(fpMap).length} floor plan attachments.`);

    fs.writeFileSync('RECOVERED_LAYOUT.json', JSON.stringify({ buildings: results, floorPlans: fpMap }, null, 2));

    // Also try to find a full "workspace" object just in case our clean up was too aggressive
    // We'll search for the specific IDs the user mentioned
    const importantSites = ['A0001', 'A1002', 'A004'];
    importantSites.forEach(sid => {
        if (clean.includes(sid)) {
            console.log(`Site ${sid} mentioned in dump.`);
        }
    });
}

scrapeData();
