
const fs = require('fs');

function extract() {
    // Read raw buffer to handle nulls and mixed encodings
    const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');

    // Convert to string but filter non-printable (except whitespace)
    let text = "";
    for (let i = 0; i < buffer.length; i++) {
        const b = buffer[i];
        if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
            text += String.fromCharCode(b);
        } else if (b === 0) {
            // ignore nulls (common in UTF-16)
        }
    }

    console.log('Cleaned text length:', text.length);

    // Search for "sites" and "buildings"
    let index = 0;
    while ((index = text.indexOf('{"sites":[', index)) !== -1) {
        console.log('Candidate JSON found at:', index);
        // Find matching brace
        let braces = 0;
        let end = -1;
        for (let i = index; i < text.length; i++) {
            if (text[i] === '{') braces++;
            if (text[i] === '}') braces--;
            if (braces === 0) {
                end = i;
                break;
            }
        }

        if (end !== -1) {
            const jsonStr = text.substring(index, end + 1);
            try {
                const ws = JSON.parse(jsonStr);
                if (ws.sites && ws.buildings) {
                    console.log('--- FOUND POTENTIAL WORKSPACE ---');
                    console.log('Sites:', ws.sites.length);
                    console.log('Buildings:', ws.buildings.length);

                    // Check for Plateville or Palmer Lake
                    const hasPlateville = ws.sites.some(s => s.name.toLowerCase().includes('plateville'));
                    const hasPalmer = ws.sites.some(s => s.name.toLowerCase().includes('palmer'));

                    if (hasPlateville || hasPalmer) {
                        console.log('Workspace contains target sites!');
                        fs.writeFileSync('recovered_workspace.json', JSON.stringify(ws, null, 2));
                        console.log('Saved to recovered_workspace.json');
                    }
                }
            } catch (e) {
                // Not valid JSON
            }
        }
        index++;
    }
}

extract();
