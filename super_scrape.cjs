
const fs = require('fs');

function extract() {
    const buffer = fs.readFileSync('tmp_revert_source/backup_localstorage.txt');
    const text = buffer.toString('utf16le');

    // Find EVERY string that looks like a building object
    const buildings = [];
    const bRegex = /"id":"(B-\d+)","siteId":"([^"]+)","label":"([^"]+)","name":"([^"]+)"/g;

    // Scrape coordinates
    const coords = [];
    const cRegex = /"id":"(B-\d+)".*?"x":(-?\d+\.?\d*).*?"z":(-?\d+\.?\d*)/g;

    // Scan the clean text first (ignoring non-json chars)
    const clean = text.replace(/[^\x20-\x7E]/g, ' ');

    let match;
    while ((match = bRegex.exec(clean)) !== null) {
        buildings.push({ id: match[1], siteId: match[2], label: match[3], name: match[4] });
    }

    let cMatch;
    while ((cMatch = cRegex.exec(clean)) !== null) {
        coords.push({ id: cMatch[1], x: parseFloat(cMatch[2]), z: parseFloat(cMatch[3]) });
    }

    console.log('Building IDs Found:', buildings.length);
    console.log('Coordinate Sets Found:', coords.length);

    // Find Floor Plans
    const fpRegex = /"url":"(https:\/\/[^"]+)"/g;
    const fps = [];
    while ((match = fpRegex.exec(clean)) !== null) {
        fps.push(match[1]);
    }
    console.log('Floor Plan URLs Found:', fps.length);

    // Find Rack Mappings
    const rRegex = /"id":"(R-\d+)".*?"label":"([^"]+)"/g;
    const racks = [];
    while ((match = rRegex.exec(clean)) !== null) {
        racks.push({ id: match[1], label: match[2] });
    }
    console.log('Rack IDs Found:', racks.length);
}

extract();
