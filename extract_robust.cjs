
const fs = require('fs');
const buffer = fs.readFileSync('c:/Users/Ray Henry/.gemini/antigravity/lumen-asset-viewer/backup_localstorage.txt');
console.log('Buffer length:', buffer.length);

// Look for AMBIFLO_WORKSPACE_STABLE_V1 string
const marker = Buffer.from('AMBIFLO_WORKSPACE_STABLE_V1');
const index = buffer.indexOf(marker);

if (index !== -1) {
    console.log('Found marker at:', index);

    // Scan ahead for '{'
    let start = -1;
    for (let i = index + marker.length; i < buffer.length; i++) {
        if (buffer[i] === 0x7B) { // '{'
            start = i;
            break;
        }
    }

    if (start !== -1) {
        let braces = 0;
        let end = -1;
        for (let i = start; i < buffer.length; i++) {
            if (buffer[i] === 0x7B) braces++;
            if (buffer[i] === 0x7D) braces--;
            if (braces === 0) {
                end = i;
                break;
            }
        }

        if (end !== -1) {
            const jsonBuffer = buffer.slice(start, end + 1);
            // Try to clean out any null bytes or non-printable junk if it's interleaved
            // Some JS console dumps might have nulls or be UTF-16
            let cleanString = "";
            for (let i = 0; i < jsonBuffer.length; i++) {
                const b = jsonBuffer[i];
                if (b >= 32 && b <= 126) {
                    cleanString += String.fromCharCode(b);
                } else if (b === 10 || b === 13) {
                    cleanString += String.fromCharCode(b);
                }
            }

            try {
                // If it's escaped JSON (common in localStorage dumps)
                let data = cleanString;
                if (data.startsWith('"') && data.endsWith('"')) {
                    data = JSON.parse(data);
                }

                // If the cleaned string is still not valid, try a more surgical regex approach
                // to find the largest valid JSON substring
                function extractJSON(str) {
                    let firstOpen = str.indexOf('{');
                    let lastClose = str.lastIndexOf('}');
                    while (firstOpen !== -1 && lastClose !== -1 && firstOpen < lastClose) {
                        try {
                            const candidate = str.substring(firstOpen, lastClose + 1);
                            return JSON.parse(candidate);
                        } catch (e) {
                            // Try shrinking from the ends
                            let nextOpen = str.indexOf('{', firstOpen + 1);
                            let prevClose = str.lastIndexOf('}', lastClose - 1);
                            if (nextOpen !== -1 && nextOpen < lastClose) {
                                firstOpen = nextOpen;
                            } else {
                                lastClose = prevClose;
                            }
                        }
                    }
                    throw new Error("No valid JSON found");
                }

                const ws = extractJSON(cleanString);
                console.log('--- RECOVERED WORKSPACE ---');
                fs.writeFileSync('recovered_workspace.json', JSON.stringify(ws, null, 2));
                console.log('Saved to recovered_workspace.json');
                console.log('Sites:', ws.sites?.length);
                ws.sites?.forEach(s => console.log(`- ${s.name}`));
            } catch (e) {
                console.error('Final JSON parse failed:', e.message);
                // Dump snippet for debugging
                console.log('Cleaned snippet:', cleanString.substring(0, 100));
            }
        }
    }
} else {
    console.log('Marker not found.');
}
