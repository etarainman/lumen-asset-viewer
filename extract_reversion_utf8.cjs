
const fs = require('fs');

function extract() {
    console.log('--- REVERSION: ATTEMPTING UTF-8 EXTRACTION ---');
    const text = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage_utf8.txt', 'utf8');
    console.log('Text length:', text.length);

    const marker = 'AMBIFLO_WORKSPACE_STABLE_V1';
    let index = text.indexOf(marker);

    if (index === -1) {
        console.error('Marker not found in UTF-8 file.');
        return;
    }

    let start = text.indexOf('{', index);
    if (start === -1) return;

    let braces = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
        if (text[i] === '{') braces++;
        if (text[i] === '}') braces--;
        if (braces === 0 && i > start) {
            end = i;
            break;
        }
    }

    if (end !== -1) {
        let jsonStr = text.substring(start, end + 1);
        try {
            // Very aggressive cleanup of non-json characters
            const cleanJson = jsonStr.replace(/[^\x20-\x7E\s]/g, '');
            const ws = JSON.parse(cleanJson);

            console.log('--- SUCCESS: DATA RECOVERED ---');
            const racks = (ws.buildings || []).reduce((sum, b) => sum + (b.racks?.length || 0), 0);
            const eq = (ws.buildings || []).reduce((sum, b) => sum + (b.equipment?.length || 0), 0);
            console.log(`Contents: Sites=${ws.sites?.length}, Racks=${racks}, Equipment=${eq}`);

            fs.writeFileSync('reversion_target.json', JSON.stringify(ws, null, 2));
            console.log('Saved to reversion_target.json');
        } catch (e) {
            console.error('JSON Parse error:', e.message);
            // Try to find the first valid JSON substring if the whole thing is messy
            for (let i = 0; i < jsonStr.length; i++) {
                if (jsonStr[i] === '{') {
                    try {
                        const snippet = jsonStr.substring(i);
                        // try to find first closing brace that works
                        let lastBrace = snippet.lastIndexOf('}');
                        while (lastBrace > 0) {
                            try {
                                const candidate = snippet.substring(0, lastBrace + 1).replace(/[^\x20-\x7E\s]/g, '');
                                const parsed = JSON.parse(candidate);
                                if (parsed.sites) {
                                    fs.writeFileSync('reversion_target.json', JSON.stringify(parsed, null, 2));
                                    console.log('Recovered via partial sweep!');
                                    return;
                                }
                            } catch (err) { }
                            lastBrace = snippet.lastIndexOf('}', lastBrace - 1);
                        }
                    } catch (err) { }
                }
            }
        }
    }
}

extract();
