
const fs = require('fs');

function scrape() {
    console.log('--- BIM FORENSICS: BUILDING & FLOOR PLAN EXTRACTION ---');
    const files = fs.readdirSync('.').filter(f => f.startsWith('RECOVERED_KEY_') && f.endsWith('.json'));

    const buildings = new Set();
    const floorPlans = new Set();
    const positions = [];

    files.forEach(f => {
        const text = fs.readFileSync(f, 'utf8').replace(/[^\x20-\x7E\s]/g, ' ');

        // Find Building IDs: B- followed by timestamp
        const bMatches = text.match(/B-\d+/g);
        if (bMatches) bMatches.forEach(m => buildings.add(m));

        // Find Floor Plans: https://...usercontent.goog/
        const fMatches = text.match(/https:\/\/[a-z0-9-]+\.scf\.usercontent\.goog\/[^\s\"\}]+/g);
        if (fMatches) fMatches.forEach(m => floorPlans.add(m));

        // Let's try to find X/Z coordinates
        // Look for "x": followed by a number
        const xzMatches = text.match(/"x":\s*-?\d+\.?\d*,\s*"z":\s*-?\d+\.?\d*/g);
        if (xzMatches) xzMatches.forEach(m => positions.push(m));
    });

    console.log('Detected Buildings:', Array.from(buildings));
    console.log('Detected Floor Plans:', Array.from(floorPlans));
    console.log('Detected Layout Samples:', positions.slice(0, 10));
}

scrape();
