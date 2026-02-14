/**
 * ============================================================================
 * TTC DASHBOARD - WIDGET MAP IMAGE GENERATOR
 * ============================================================================
 * 
 * Generates a PNG image of the TTC subway map with live alert overlays.
 * Used by the Scriptable iOS widget to display a visual map.
 * 
 * Endpoint: /api/widget-map
 * Returns: PNG image (image/png)
 * 
 * Query params:
 *   ?size=small|medium|large  (default: medium)
 *   ?theme=dark|light         (default: dark)
 * 
 * ============================================================================
 */

const { Resvg } = require('@resvg/resvg-js');
const axios = require('axios');

// ============================================================================
// MAP DATA — Mirrors the frontend station coordinates
// ============================================================================

const LINE_COLORS = {
    "1": "#FFC425",
    "2": "#009639",
    "4": "#B5236B",
    "5": "#F37021",
    "6": "#9ca3af"
};

const rawMapData = [
    {
        line: "1",
        stations: [
            { name: "Vaughan Metropolitan Centre", x: 300, y: 50 },
            { name: "Highway 407", x: 300, y: 80 },
            { name: "Pioneer Village", x: 300, y: 110 },
            { name: "York University", x: 300, y: 140 },
            { name: "Finch West", x: 300, y: 170 },
            { name: "Downsview Park", x: 320, y: 200 },
            { name: "Sheppard West", x: 340, y: 230 },
            { name: "Wilson", x: 360, y: 260 },
            { name: "Yorkdale", x: 360, y: 290 },
            { name: "Lawrence West", x: 360, y: 320 },
            { name: "Glencairn", x: 360, y: 350 },
            { name: "Cedarvale", x: 360, y: 380 },
            { name: "St Clair West", x: 360, y: 410 },
            { name: "Dupont", x: 360, y: 440 },
            { name: "Spadina", x: 360, y: 480, interchange: true },
            { name: "St George", x: 400, y: 480, interchange: true },
            { name: "Museum", x: 400, y: 550 },
            { name: "Queen's Park", x: 400, y: 580 },
            { name: "St Patrick", x: 400, y: 610 },
            { name: "Osgoode", x: 400, y: 640 },
            { name: "St Andrew", x: 400, y: 670 },
            { name: "Union", x: 480, y: 700 },
            { name: "King", x: 560, y: 670 },
            { name: "Queen", x: 560, y: 640 },
            { name: "TMU", x: 560, y: 610 },
            { name: "College", x: 560, y: 580 },
            { name: "Wellesley", x: 560, y: 550 },
            { name: "Bloor-Yonge", x: 560, y: 492, interchange: true },
            { name: "Rosedale", x: 560, y: 472 },
            { name: "Summerhill", x: 560, y: 452 },
            { name: "St Clair", x: 560, y: 432 },
            { name: "Davisville", x: 560, y: 412 },
            { name: "Eglinton", x: 560, y: 380, interchange: true },
            { name: "Lawrence", x: 560, y: 348 },
            { name: "York Mills", x: 560, y: 316 },
            { name: "Sheppard-Yonge", x: 560, y: 292, interchange: true },
            { name: "North York Centre", x: 560, y: 268 },
            { name: "Finch", x: 560, y: 244 }
        ]
    },
    {
        line: "2",
        stations: [
            { name: "Kipling", x: 30, y: 492 },
            { name: "Islington", x: 53, y: 492 },
            { name: "Royal York", x: 76, y: 492 },
            { name: "Old Mill", x: 99, y: 492 },
            { name: "Jane", x: 122, y: 492 },
            { name: "Runnymede", x: 145, y: 492 },
            { name: "High Park", x: 168, y: 492 },
            { name: "Keele", x: 191, y: 492 },
            { name: "Dundas West", x: 214, y: 492 },
            { name: "Lansdowne", x: 237, y: 492 },
            { name: "Dufferin", x: 260, y: 492 },
            { name: "Ossington", x: 283, y: 492 },
            { name: "Christie", x: 306, y: 492 },
            { name: "Bathurst", x: 329, y: 492 },
            { name: "Spadina", x: 360, y: 492, interchange: true },
            { name: "St George", x: 400, y: 492, interchange: true },
            { name: "Bay", x: 510, y: 492 },
            { name: "Bloor-Yonge", x: 560, y: 492, interchange: true },
            { name: "Sherbourne", x: 585, y: 492 },
            { name: "Castle Frank", x: 610, y: 492 },
            { name: "Broadview", x: 635, y: 492 },
            { name: "Chester", x: 660, y: 492 },
            { name: "Pape", x: 685, y: 492 },
            { name: "Donlands", x: 710, y: 492 },
            { name: "Greenwood", x: 735, y: 492 },
            { name: "Coxwell", x: 760, y: 492 },
            { name: "Woodbine", x: 785, y: 492 },
            { name: "Main Street", x: 810, y: 492 },
            { name: "Victoria Park", x: 835, y: 455 },
            { name: "Warden", x: 860, y: 418 },
            { name: "Kennedy", x: 885, y: 380 }
        ]
    },
    {
        line: "4",
        stations: [
            { name: "Sheppard-Yonge", x: 560, y: 292, interchange: true },
            { name: "Bayview", x: 610, y: 292 },
            { name: "Bessarion", x: 660, y: 292 },
            { name: "Leslie", x: 710, y: 292 },
            { name: "Don Mills", x: 760, y: 292 }
        ]
    },
    {
        line: "5",
        stations: [
            { name: "Mount Dennis", x: 220, y: 380, interchange: true },
            { name: "Keelesdale", x: 250, y: 380 },
            { name: "Caledonia", x: 280, y: 380 },
            { name: "Fairbank", x: 310, y: 380 },
            { name: "Oakwood", x: 340, y: 380 },
            { name: "Cedarvale", x: 360, y: 380, interchange: true },
            { name: "Forest Hill", x: 390, y: 380 },
            { name: "Chaplin", x: 420, y: 380 },
            { name: "Avenue", x: 450, y: 380 },
            { name: "Eglinton", x: 560, y: 380, interchange: true },
            { name: "Mount Pleasant", x: 595, y: 380 },
            { name: "Leaside", x: 630, y: 380 },
            { name: "Laird", x: 665, y: 380 },
            { name: "Don Valley", x: 700, y: 380 },
            { name: "Wynford", x: 730, y: 380 },
            { name: "Sloane", x: 755, y: 380 },
            { name: "O'Connor", x: 780, y: 380 },
            { name: "Aga Khan Park & Museum", x: 805, y: 380 },
            { name: "Sunnybrook Park", x: 825, y: 380 },
            { name: "Pharmacy", x: 845, y: 400 },
            { name: "Birchmount", x: 860, y: 418 },
            { name: "Ionview", x: 872, y: 435 },
            { name: "Victoria Park", x: 835, y: 455, interchange: true },
            { name: "Kennedy", x: 885, y: 380, interchange: true }
        ]
    },
    {
        line: "6",
        stations: [
            { name: "Humber College", x: -125, y: 200 },
            { name: "Westmore", x: -100, y: 170 },
            { name: "Martin Grove", x: -75, y: 170 },
            { name: "Albion", x: -50, y: 170 },
            { name: "Stevenson", x: -25, y: 170 },
            { name: "Mount Olive", x: 0, y: 170 },
            { name: "Rowntree Mills", x: 25, y: 170 },
            { name: "Pearldale", x: 50, y: 170 },
            { name: "Duncanwoods", x: 75, y: 170 },
            { name: "Milvan Rumike", x: 100, y: 170 },
            { name: "Emery", x: 125, y: 170 },
            { name: "Signet Arrow", x: 150, y: 170 },
            { name: "Norfinch Oakdale", x: 175, y: 170 },
            { name: "Jane and Finch", x: 200, y: 170 },
            { name: "Driftwood", x: 225, y: 170 },
            { name: "Tobermory", x: 250, y: 170 },
            { name: "Sentinel", x: 275, y: 170 },
            { name: "Finch West", x: 300, y: 170, interchange: true }
        ]
    }
];


// ============================================================================
// PATH GENERATION — Same logic as frontend getPathFromStations
// ============================================================================

function getPathFromStations(stations, lineId) {
    let d = "";
    for (let i = 0; i < stations.length; i++) {
        const s = stations[i];
        if (i === 0) { d += `M ${s.x} ${s.y} `; continue; }
        if (lineId === '1') {
            if (s.name === 'Union') {
                const prev = stations[i - 1];
                if (prev && prev.name === 'St Andrew') { d += `Q 400 700, 480 700 `; continue; }
            }
            if (s.name === 'King') {
                const prev = stations[i - 1];
                if (prev && prev.name === 'Union') { d += `Q 560 700, 560 670 `; continue; }
            }
            if (s.name === 'St George') {
                const prev = stations[i - 1];
                if (prev && prev.name === 'Spadina') {
                    d += `L 385 480 Q 400 480, 400 495 `;
                    continue;
                }
            }
        }
        if (lineId === '6') {
            if (s.name === 'Westmore') {
                d += `L -125 185 Q -125 170, -110 170 `;
                d += `L ${s.x} ${s.y} `;
                continue;
            }
        }
        d += `L ${s.x} ${s.y} `;
    }
    return d;
}


// ============================================================================
// SVG GENERATION
// ============================================================================

function generateMapSVG(alerts, theme = 'dark') {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f1115' : '#f5f5f5';
    const stationFill = isDark ? 'white' : 'white';
    const stationStroke = isDark ? 'white' : '#333';
    const labelColor = isDark ? '#e0e0e0' : '#222';
    const interchangeFill = '#528CCB';

    // Build station lookup for alerts
    const stationLookup = {};
    rawMapData.forEach(lineData => {
        lineData.stations.forEach(s => {
            const key = `${lineData.line}-${s.name}`;
            stationLookup[key] = { x: s.x, y: s.y };
        });
    });

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 20 1080 720" width="1080" height="720">`;

    // Background
    svg += `<rect x="-150" y="20" width="1080" height="720" fill="${bgColor}" rx="16"/>`;

    // CSS for animations
    svg += `<style>
        @keyframes alertPulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 0.5; } }
        .alert-path { animation: alertPulse 1.5s ease-in-out infinite; }
        .station-label { font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif; font-size: 11px; fill: ${labelColor}; }
        .terminal-label { font-weight: 700; font-size: 13px; }
        .terminal-text { font-family: -apple-system, 'SF Pro Text', sans-serif; font-weight: 700; font-size: 13px; }
    </style>`;

    // ---- TRACKS ----
    rawMapData.forEach(lineData => {
        const d = getPathFromStations(lineData.stations, lineData.line);
        const color = LINE_COLORS[lineData.line];
        const strokeWidth = lineData.line === '5' || lineData.line === '6' ? 5 : 7;
        svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    });

    // ---- ALERT OVERLAYS ----
    if (alerts && alerts.length > 0) {
        alerts.forEach(alert => {
            if (alert.status !== 'active') return;

            const lineData = rawMapData.find(l => l.line === alert.line);
            if (!lineData) return;

            const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';
            const alertColor = isDelay ? '#f59e0b' : '#ef4444';

            // Find station indices
            let startIdx = -1, endIdx = -1;
            lineData.stations.forEach((s, i) => {
                if (s.name === alert.start) startIdx = i;
                if (s.name === alert.end) endIdx = i;
            });

            if (startIdx === -1 || endIdx === -1) return;
            if (startIdx > endIdx) [startIdx, endIdx] = [endIdx, startIdx];

            // Build sub-path for affected segment
            const subStations = lineData.stations.slice(startIdx, endIdx + 1);
            const subPath = getPathFromStations(subStations, alert.line);

            svg += `<path d="${subPath}" fill="none" stroke="${alertColor}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" class="alert-path"/>`;
        });
    }

    // ---- STATIONS ----
    rawMapData.forEach(lineData => {
        const len = lineData.stations.length;
        for (let i = 0; i < len; i++) {
            const s = lineData.stations[i];
            const isTerminal = (i === 0 || i === len - 1);

            if (s.interchange) {
                // Interchange station — larger circle
                svg += `<g transform="translate(${s.x}, ${s.y})">`;
                svg += `<circle r="8" fill="white"/>`;
                svg += `<circle r="6.5" fill="black"/>`;
                svg += `<circle r="4.5" fill="white"/>`;
                svg += `<circle r="3.8" fill="${interchangeFill}"/>`;
                svg += `</g>`;
            } else {
                // Regular station dot
                svg += `<circle cx="${s.x}" cy="${s.y}" r="3.5" fill="${stationFill}" stroke="${isDark ? 'black' : '#666'}" stroke-width="1"/>`;
            }

            // Terminal badges
            if (isTerminal) {
                const color = LINE_COLORS[lineData.line];
                const textColor = lineData.line === '1' ? 'black' : 'white';
                let bx = s.x, by = s.y;

                if (s.name === "Vaughan Metropolitan Centre") { by -= 22; }
                else if (s.name === "Finch") { by -= 22; }
                else if (s.name === "Kipling") { bx -= 22; }
                else if (s.name === "Kennedy") { bx += 22; }
                else if (s.name === "Don Mills") { bx += 22; }
                else if (s.name === "Mount Dennis") { bx -= 22; }
                else if (s.name === "Humber College") { by += 22; }
                else { continue; } // skip badge for unnamed terminals

                svg += `<circle cx="${bx}" cy="${by}" r="10" fill="${color}" stroke="white" stroke-width="1.5"/>`;
                svg += `<text x="${bx}" y="${by}" fill="${textColor}" text-anchor="middle" dominant-baseline="central" class="terminal-text">${lineData.line}</text>`;
            }
        }
    });

    // ---- STATION LABELS (key stations only for widget clarity) ----
    const labelStations = [
        "Vaughan Metropolitan Centre", "Finch", "Kipling", "Kennedy",
        "Union", "Bloor-Yonge", "St George", "Spadina", "Eglinton",
        "Sheppard-Yonge", "Don Mills", "Mount Dennis", "Humber College",
        "Finch West"
    ];

    rawMapData.forEach(lineData => {
        lineData.stations.forEach(s => {
            if (!labelStations.includes(s.name)) return;
            // Skip duplicates
            if (lineData.line === '2' && (s.name === 'Spadina' || s.name === 'St George' || s.name === 'Bloor-Yonge')) return;
            if (lineData.line === '4' && s.name === 'Sheppard-Yonge') return;
            if (lineData.line === '5' && (s.name === 'Kennedy' || s.name === 'Finch West' || s.name === 'Cedarvale' || s.name === 'Eglinton')) return;
            if (lineData.line === '1' && s.name === 'Finch West') return;
            if (lineData.line === '6' && s.name === 'Finch West') {
                // Show Finch West label only once, for Line 6
            }

            let tx = 14, ty = 4, anchor = "start";

            if (s.name === "Union") { tx = 0; ty = 22; anchor = "middle"; }
            else if (s.name === "Kipling") { tx = -14; anchor = "end"; }
            else if (s.name === "Kennedy") { tx = 14; }
            else if (s.name === "Vaughan Metropolitan Centre") { tx = 14; ty = 5; }
            else if (s.name === "Finch") { tx = 14; ty = 5; }
            else if (s.name === "Don Mills") { tx = 14; ty = 5; }
            else if (s.name === "Humber College") { tx = 14; ty = 5; }
            else if (s.name === "Mount Dennis") { tx = -14; ty = 5; anchor = "end"; }
            else if (s.name === "Bloor-Yonge") { tx = -14; ty = 18; anchor = "end"; }
            else if (s.name === "St George") { tx = -14; ty = -10; anchor = "end"; }
            else if (s.name === "Spadina") { tx = -14; ty = -10; anchor = "end"; }
            else if (s.name === "Sheppard-Yonge") { tx = -14; anchor = "end"; }
            else if (s.name === "Eglinton") { tx = 14; }

            const cls = labelStations.includes(s.name) ? "station-label terminal-label" : "station-label";
            svg += `<text x="${s.x + tx}" y="${s.y + ty}" text-anchor="${anchor}" class="${cls}">${escapeXml(s.name)}</text>`;
        });
    });

    // ---- STATUS WATERMARK ----
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' });
    svg += `<text x="900" y="720" text-anchor="end" fill="${isDark ? '#555' : '#aaa'}" font-family="-apple-system, sans-serif" font-size="10">subwaystatus.live · ${escapeXml(timeStr)}</text>`;

    svg += `</svg>`;
    return svg;
}

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ============================================================================
// FETCH ALERTS FROM OUR OWN API
// ============================================================================

async function fetchAlerts() {
    try {
        const resp = await axios.get('https://subwaystatus.live/api/data', { timeout: 8000 });
        return resp.data;
    } catch (e) {
        console.error('Failed to fetch alerts for widget map:', e.message);
        return null;
    }
}


// ============================================================================
// MAIN HANDLER
// ============================================================================

module.exports = async (req, res) => {
    try {
        const theme = req.query.theme || 'dark';

        // Fetch live alert data
        const data = await fetchAlerts();
        const alerts = data ? (data.alerts || []) : [];

        // Generate SVG
        const svgString = generateMapSVG(alerts, theme);

        // Convert SVG → PNG
        const resvg = new Resvg(svgString, {
            fitTo: {
                mode: 'width',
                value: 1080
            },
            font: {
                loadSystemFonts: false
            }
        });

        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        // Respond with PNG
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(pngBuffer);
    } catch (err) {
        console.error('Widget map error:', err);
        res.status(500).json({ error: 'Failed to generate map image', details: err.message });
    }
};
