lucide.createIcons();
let activeAlerts = [];
let upcomingAlerts = [];
let pollingInterval = null;
let currentTab = 'lines';
const mapRoot = document.getElementById('map-root');
const viewport = document.getElementById('viewport');
const tracksLayer = document.getElementById('tracks-layer');
const stationsLayer = document.getElementById('stations-layer');
const alertsLayer = document.getElementById('alerts-layer');
let mapDraggable = null;

// Navigation
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const hamburgerBtn = document.getElementById('hamburger-btn');

// Toggle sidebar on mobile
function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
}

hamburgerBtn.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (tab) {
            switchTab(tab);
            // Close sidebar on mobile after selecting a tab
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        }
    });
});

function switchTab(tab) {
    currentTab = tab;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Show/hide panels
    document.getElementById('viewport').style.display = (tab === 'lines') ? 'block' : 'none';
    document.getElementById('alerts-panel').classList.toggle('active', tab === 'alerts');
    document.getElementById('upcoming-panel').classList.toggle('active', tab === 'upcoming');
    document.getElementById('about-panel').classList.toggle('active', tab === 'about');
}

const rawMapData = [
    {
        // Line 1 Update: Vertical from Finch West up to VMC
        line: "1",
        stations: [
            { name: "Vaughan Metropolitan Centre", x: 300, y: 50, accessible: true }, // x changed to 300
            { name: "Highway 407", x: 300, y: 80, accessible: true }, // x changed to 300
            { name: "Pioneer Village", x: 300, y: 110, accessible: true }, // x changed to 300
            { name: "York University", x: 300, y: 140, accessible: true }, // x changed to 300
            { name: "Finch West", x: 300, y: 170, accessible: true }, // x changed to 300
            { name: "Downsview Park", x: 320, y: 200, accessible: true },
            { name: "Sheppard West", x: 340, y: 230, accessible: true },
            { name: "Wilson", x: 360, y: 260, accessible: true },
            { name: "Yorkdale", x: 360, y: 290, accessible: true },
            { name: "Lawrence West", x: 360, y: 320, accessible: true },
            { name: "Glencairn", x: 360, y: 350, accessible: false },
            { name: "Cedarvale", x: 360, y: 380, accessible: true },
            { name: "St Clair West", x: 360, y: 410, accessible: true },
            { name: "Dupont", x: 360, y: 440, accessible: true },
            { name: "Spadina", x: 360, y: 480, interchange: true, accessible: true },
            { name: "St George", x: 400, y: 480, interchange: true, accessible: true },
            { name: "Museum", x: 400, y: 550, accessible: false },
            { name: "Queen's Park", x: 400, y: 580, accessible: true },
            { name: "St Patrick", x: 400, y: 610, accessible: true },
            { name: "Osgoode", x: 400, y: 640, accessible: true },
            { name: "St Andrew", x: 400, y: 670, accessible: true },
            { name: "Union", x: 520, y: 700, accessible: true },
            { name: "King", x: 640, y: 670, accessible: false },
            { name: "Queen", x: 640, y: 640, accessible: true },
            { name: "TMU", x: 640, y: 610, accessible: true },
            { name: "College", x: 640, y: 580, accessible: false },
            { name: "Wellesley", x: 640, y: 550, accessible: true },
            { name: "Bloor-Yonge", x: 640, y: 492, interchange: true, accessible: true },
            { name: "Rosedale", x: 640, y: 460, accessible: false },
            { name: "Summerhill", x: 640, y: 430, accessible: false },
            { name: "St Clair", x: 640, y: 400, accessible: true },
            { name: "Davisville", x: 640, y: 350, accessible: true },
            { name: "Eglinton", x: 640, y: 380, accessible: true },
            { name: "Lawrence", x: 640, y: 310, accessible: true },
            { name: "York Mills", x: 640, y: 280, accessible: true },
            { name: "Sheppard-Yonge", x: 640, y: 200, interchange: true, accessible: true },
            { name: "North York Centre", x: 640, y: 150, accessible: true },
            { name: "Finch", x: 640, y: 100, accessible: true }
        ]
    },
    {
        line: "2",
        stations: [
            { name: "Kipling", x: 30, y: 492, accessible: true },
            { name: "Islington", x: 53, y: 492, accessible: false },
            { name: "Royal York", x: 76, y: 492, accessible: true },
            { name: "Old Mill", x: 99, y: 492, accessible: false },
            { name: "Jane", x: 122, y: 492, accessible: true },
            { name: "Runnymede", x: 145, y: 492, accessible: true },
            { name: "High Park", x: 168, y: 492, accessible: false },
            { name: "Keele", x: 191, y: 492, accessible: true },
            { name: "Dundas West", x: 214, y: 492, accessible: true },
            { name: "Lansdowne", x: 237, y: 492, accessible: false },
            { name: "Dufferin", x: 260, y: 492, accessible: true },
            { name: "Ossington", x: 283, y: 492, accessible: true },
            { name: "Christie", x: 306, y: 492, accessible: false },
            { name: "Bathurst", x: 329, y: 492, accessible: true },
            { name: "Spadina", x: 360, y: 492, interchange: true, accessible: true },
            { name: "St George", x: 400, y: 492, interchange: true, accessible: true },
            { name: "Bay", x: 520, y: 492, accessible: true },
            { name: "Bloor-Yonge", x: 640, y: 492, interchange: true, accessible: true },
            { name: "Sherbourne", x: 670, y: 492, accessible: true },
            { name: "Castle Frank", x: 695, y: 492, accessible: false },
            { name: "Broadview", x: 720, y: 492, accessible: true },
            { name: "Chester", x: 745, y: 492, accessible: true },
            { name: "Pape", x: 770, y: 492, accessible: true },
            { name: "Donlands", x: 795, y: 492, accessible: false },
            { name: "Greenwood", x: 820, y: 492, accessible: false },
            { name: "Coxwell", x: 845, y: 492, accessible: true },
            { name: "Woodbine", x: 870, y: 492, accessible: true },
            { name: "Main Street", x: 895, y: 492, accessible: true }, // Pivot point
            { name: "Victoria Park", x: 920, y: 450, accessible: true }, // Diagonal start
            { name: "Warden", x: 945, y: 410, accessible: false },
            { name: "Kennedy", x: 970, y: 370, accessible: true }
        ]
    },
    {
        line: "4",
        stations: [
            { name: "Sheppard-Yonge", x: 640, y: 200, interchange: true, accessible: true },
            { name: "Bayview", x: 690, y: 200, accessible: true },
            { name: "Bessarion", x: 740, y: 200, accessible: true },
            { name: "Leslie", x: 790, y: 200, accessible: true },
            { name: "Don Mills", x: 840, y: 200, accessible: true }
        ]
    },
    {
        line: "5",
        stations: [
            { name: "Mount Dennis", x: 220, y: 380, accessible: true },
            { name: "Kennedy", x: 970, y: 380, interchange: true, accessible: true }
        ]
    },
    {
        line: "6",
        stations: [
            { name: "Humber College", x: -125, y: 200, accessible: true },
            { name: "Westmore", x: -100, y: 170, accessible: true },
            { name: "Martin Grove", x: -75, y: 170, accessible: true },
            { name: "Albion", x: -50, y: 170, accessible: true },
            { name: "Stevenson", x: -25, y: 170, accessible: true },
            { name: "Mount Olive", x: 0, y: 170, accessible: true },
            { name: "Rowntree Mills", x: 25, y: 170, accessible: true },
            { name: "Pearldale", x: 50, y: 170, accessible: true },
            { name: "Duncanwoods", x: 75, y: 170, accessible: true },
            { name: "Milvan Rumike", x: 100, y: 170, accessible: true },
            { name: "Emery", x: 125, y: 170, accessible: true },
            { name: "Signet Arrow", x: 150, y: 170, accessible: true },
            { name: "Norfinch Oakdale", x: 175, y: 170, accessible: true },
            { name: "Jane and Finch", x: 200, y: 170, accessible: true },
            { name: "Driftwood", x: 225, y: 170, accessible: true },
            { name: "Tobermory", x: 250, y: 170, accessible: true },
            { name: "Sentinel", x: 275, y: 170, accessible: true },
            { name: "Finch West", x: 300, y: 170, interchange: true, accessible: true }
        ]
    }
];

function initMap() {
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch (e) { }
    console.log("Checking for legend:", document.getElementById('map-legend'));
    renderTracks();
    renderStations();
    setupDragAndZoom();
    setupPinchZoom();
    fetchAlerts();
    fetchUpcomingAlerts();
    pollingInterval = setInterval(() => {
        fetchAlerts();
        fetchUpcomingAlerts();
    }, 60000);
}

function renderTracks() {
    tracksLayer.innerHTML = '';
    rawMapData.forEach(lineData => {
        const d = getPathFromStations(lineData.stations, lineData.line);

        // Base track
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d); path.setAttribute("class", `track line-${lineData.line}`);
        tracksLayer.appendChild(path);

        // Add line number bubble on the left for Line 4
        if (lineData.line === '4' && lineData.stations.length > 0) {
            const firstStation = lineData.stations[0];
            const labelX = firstStation.x - 120; // 120px left of first station
            const labelY = firstStation.y;

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${labelX}, ${labelY})`);

            const bubble = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            bubble.setAttribute("r", 14);
            bubble.setAttribute("fill", getLineColor('4'));
            bubble.setAttribute("stroke", "white");
            bubble.setAttribute("stroke-width", "3");
            g.appendChild(bubble);

            const num = document.createElementNS("http://www.w3.org/2000/svg", "text");
            num.textContent = "4";
            num.setAttribute("class", "terminal-text");
            num.setAttribute("fill", "white");
            g.appendChild(num);

            tracksLayer.appendChild(g);
        }

        // Line 5 Hollow Effect using SVG Mask for True Transparency
        if (lineData.line === '5') {
            const maskId = "line-5-mask";
            // Create Defs/Mask if not exists
            let svg = tracksLayer.closest("svg");
            if (svg) {
                let defs = svg.querySelector("defs");
                if (!defs) {
                    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                    svg.prepend(defs);
                }

                if (!document.getElementById(maskId)) {
                    const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
                    mask.setAttribute("id", maskId);
                    // Mask coordinate system
                    mask.setAttribute("maskUnits", "userSpaceOnUse");

                    // Mask Base (White = Visible)
                    const maskBase = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    maskBase.setAttribute("d", d);
                    maskBase.setAttribute("stroke", "white");
                    maskBase.setAttribute("stroke-width", "18");
                    maskBase.setAttribute("fill", "none");
                    mask.appendChild(maskBase);

                    // Mask Cutout (Black = Hidden/Transparent)
                    const maskCutout = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    maskCutout.setAttribute("d", d);
                    maskCutout.setAttribute("stroke", "black");
                    maskCutout.setAttribute("stroke-width", "8"); // Width of the hole
                    maskCutout.setAttribute("fill", "none");
                    mask.appendChild(maskCutout);

                    defs.appendChild(mask);
                }
            }

            // Apply mask to the main orange path
            path.setAttribute("mask", `url(#${maskId})`);
        }
    });
}

function getPathFromStations(stations, lineId) {
    let d = "";
    for (let i = 0; i < stations.length; i++) {
        const s = stations[i];
        if (i === 0) { d += `M ${s.x} ${s.y} `; continue; }
        if (lineId === '1') {
            if (s.name === 'Union') {
                const prev = stations[i - 1];
                if (prev && prev.name === 'St Andrew') { d += `Q 400 700, 520 700 `; continue; }
            }
            if (s.name === 'King') {
                const prev = stations[i - 1];
                if (prev && prev.name === 'Union') { d += `Q 640 700, 640 670 `; continue; }
            }
        }
        d += `L ${s.x} ${s.y} `;
    }
    return d;
}

function getLineColor(lineId) { if (lineId === '1') return "#FFC425"; if (lineId === '2') return "#009639"; if (lineId === '4') return "#B5236B"; if (lineId === '5') return "#F37021"; if (lineId === '6') return "#9ca3af"; return "#ffffff"; }
function getLineTextColor(lineId) { return (lineId === '1') ? "black" : "white"; }

function renderStations() {
    stationsLayer.innerHTML = '';
    const allStations = [];
    rawMapData.forEach(l => {
        const len = l.stations.length;
        l.stations.forEach((s, i) => { allStations.push({ ...s, line: l.line, isTerminal: (i === 0 || i === len - 1) }); });
    });

    allStations.forEach(s => {
        // Skip Spadina - handled by custom drawSpadinaTransfer
        if (s.name === 'Spadina') return;
        // Skip St George - handled by custom drawStGeorge
        if (s.name === 'St George') return;
        // Skip Line 2 Bloor-Yonge (Line 1 renders the icon)
        if (s.line === '2' && s.name === 'Bloor-Yonge') return;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${s.x}, ${s.y})`);

        if (s.interchange) {
            // Interchange style takes priority over terminal
            const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g"); gIcon.setAttribute("class", "station-marker");
            const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle"); sticker.setAttribute("r", 10); sticker.setAttribute("fill", "white"); gIcon.appendChild(sticker);
            const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); blackRing.setAttribute("r", 8); blackRing.setAttribute("fill", "black"); gIcon.appendChild(blackRing);
            const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle"); whiteGap.setAttribute("r", 5.8); whiteGap.setAttribute("fill", "white"); gIcon.appendChild(whiteGap);
            const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle"); blueBtn.setAttribute("r", 5); blueBtn.setAttribute("fill", "#528CCB"); gIcon.appendChild(blueBtn);
            const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z"); iconPath.setAttribute("fill", "white"); iconPath.setAttribute("transform", "translate(-2, -2) scale(0.25)"); gIcon.appendChild(iconPath);
            g.appendChild(gIcon);

            // Terminals that are accessible (e.g. Vaughan, Finch, Kipling) - will get detached badge below
        } else if (s.accessible) {
            const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g"); gIcon.setAttribute("class", "station-marker");
            const outerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); outerRing.setAttribute("r", "4.5"); outerRing.setAttribute("fill", "black"); gIcon.appendChild(outerRing);
            const midRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); midRing.setAttribute("r", "3.8"); midRing.setAttribute("fill", "white"); gIcon.appendChild(midRing);
            const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); innerCircle.setAttribute("r", "3"); innerCircle.setAttribute("fill", "#528CCB"); gIcon.appendChild(innerCircle);
            const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z"); iconPath.setAttribute("fill", "white"); iconPath.setAttribute("transform", "translate(-2, -2) scale(0.25)"); gIcon.appendChild(iconPath);
            g.appendChild(gIcon);

            // Terminals that are accessible (e.g. Vaughan, Finch, Kipling) - will get detached badge below
        } else {
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("r", 4); dot.setAttribute("class", "station-marker regular-station"); dot.setAttribute("fill", "white"); dot.setAttribute("stroke", "black"); dot.setAttribute("stroke-width", "1");
            g.appendChild(dot);
        }

        // Detached Terminal Badges (Line Number to the side)
        if (s.isTerminal) {
            const badgeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            let bdx = 0, bdy = 0;

            // Desktop specific positioning logic
            if (s.name === "Vaughan Metropolitan Centre") { bdx = 0; bdy = -25; } // Top
            else if (s.name === "Finch") { bdx = 0; bdy = -25; } // Top
            else if (s.name === "Kipling") { bdx = -97; bdy = 0; } // Moved another 7px left per user request (was -90)
            else if (s.name === "Kennedy") {
                if (s.line === '2') { bdx = 90; bdy = 0; } // Right (after text)
                else if (s.line === '5') { bdx = 120; bdy = 0; } // Farther Right (after Line 2 badge)
            }
            else if (s.name === "Sheppard-Yonge" && s.line === '4') { bdx = -25; bdy = 0; } // Left of Line 4 start
            else if (s.name === "Don Mills") { bdx = 25; bdy = 0; } // Right
            else if (s.name === "Mount Dennis") { bdx = -25; bdy = 0; } // Left
            else if (s.name === "Humber College") { bdx = 0; bdy = 25; } // Bottom
            else if (s.name === "Finch West" && s.line === '6') { bdx = 25; bdy = 0; } // Right

            // Only render badge if we set a position (filters out non-visible terminals like Line 1 Sheppard-Yonge)
            if (bdx !== 0 || bdy !== 0) {
                badgeG.setAttribute("transform", `translate(${bdx}, ${bdy})`);

                const badgeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                badgeCircle.setAttribute("r", 12);
                badgeCircle.setAttribute("fill", getLineColor(s.line));
                badgeCircle.setAttribute("stroke", "white");
                badgeCircle.setAttribute("stroke-width", 2);
                badgeG.appendChild(badgeCircle);

                const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                badgeText.textContent = s.line;
                badgeText.setAttribute("class", "terminal-text");
                badgeText.setAttribute("fill", s.line === '1' ? 'black' : 'white');
                badgeText.setAttribute("dy", 1);
                badgeText.setAttribute("text-anchor", "middle");
                badgeText.setAttribute("dominant-baseline", "middle");
                badgeG.appendChild(badgeText);

                g.appendChild(badgeG);
            }
        }

        const isDup = (s.line === '4' && s.name === "Sheppard-Yonge") ||
            (s.line === '1' && ["Spadina", "St George"].includes(s.name)) ||
            (s.line === '2' && ["Spadina", "St George", "Bloor-Yonge"].includes(s.name)) ||  // Skip Line 2 duplicates
            (s.line === '5' && s.name === "Kennedy") ||  // Kennedy is rendered by Line 2
            (s.line === '1' && s.name === "Finch West");  // Finch West is on Line 6

        if (!isDup) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text"); text.textContent = s.name;
            // Apply bold class for terminal stations
            if (s.isTerminal || s.name === "Spadina" || s.name === "St George" || s.name === "Bloor-Yonge" || s.name === "Union") {
                text.setAttribute("class", "station-label terminal-label");
            } else {
                text.setAttribute("class", "station-label");
            }

            let tx = 12, ty = 4, rot = 0, anchor = "start";

            // Line 6 label positioning (to avoid overlap with tracks)
            if (s.line === '6') {
                if (s.name === "Humber College") {
                    rot = 0; tx = 25; ty = 5; anchor = "start";  // Name on Right, Badge Bottom
                } else if (s.name === "Finch West") {
                    rot = 0; tx = 20; ty = 5; anchor = "start"; // Name on Right
                } else {
                    // Stations to show on TOP (above track)
                    const topStations = ["Westmore", "Martin Grove", "Albion", "Stevenson", "Mount Olive", "Rowntree Mills", "Pearldale", "Duncanwoods"];
                    if (topStations.includes(s.name)) {
                        rot = -45; tx = 5; ty = -10; anchor = "start";
                    } else {
                        rot = 45; tx = 5; ty = 10; anchor = "start";
                    }
                }
            }
            // Existing Line 1, 2, 4 positioning
            else if (s.line === '1' && (s.name === "Downsview Park" || s.name === "Sheppard West")) { tx = 15; ty = 4; anchor = "start"; }
            else if (s.line === '1' && (s.name === "Sheppard-Yonge" || s.name === "Wellesley" || s.name === "St Andrew")) { tx = -15; ty = 4; anchor = "end"; }
            else if (s.line === '1' && s.name === "Bloor-Yonge") { tx = -15; ty = -15; anchor = "end"; }  // Above Line 2, left of Line 1
            else if (s.line === '1' && s.name === "Union") { tx = 0; ty = 25; anchor = "middle"; }
            else if (s.line === '4' || s.y === 490) { rot = 45; tx = 10; ty = 10; anchor = "start"; }
            else if (s.line === '2') {
                if (s.name === 'St George') {
                    rot = -45; tx = 10; ty = -10; anchor = "start";
                } else if (s.name === 'Spadina') {
                    rot = 45; tx = -10; ty = -10; anchor = "end";
                } else if (s.name === 'Keele') {
                    rot = 45; tx = 10; ty = 10; anchor = "start";
                } else {
                    rot = 45; tx = 10; ty = 10; anchor = "start";
                }
            }
            else if (s.line === '1' && s.x < 360) { tx = -12; ty = 4; anchor = "end"; }
            else if (s.line === '1' && s.x >= 640 && s.y < 500) { tx = 12; ty = 4; anchor = "start"; }

            // Custom overrides for specific stations
            if (s.name === "Vaughan Metropolitan Centre") { tx = 15; ty = 5; rot = 0; anchor = "start"; } // Straight, Right of track
            else if (s.name === "Finch") { tx = 15; ty = 5; rot = 0; anchor = "start"; } // Straight, Right of track
            else if (s.name === "Kipling") { rot = 0; tx = -18; ty = 5; anchor = "end"; } // Moved 10px to the left per user request (was -8)
            else if (s.name === "Kennedy") {
                if (s.line === '2') { rot = 0; tx = 25; ty = 5; anchor = "start"; } // Straight, Right of badge (Line 2)
            }
            else if (s.name === "Sheppard-Yonge" && s.line === '4') {
                rot = 0; tx = 15; ty = -15; anchor = "start"; // Above line/badge
            }
            else if (s.name === "Don Mills") { rot = 0; tx = 25; ty = 5; anchor = "start"; } // Straight, Right of badge
            else if (s.name === "Mount Dennis") { rot = 0; tx = -25; ty = 5; anchor = "end"; } // Straight, Left of badge
            else if (s.name === "Finch West" && s.line === '6') { rot = 0; tx = 25; ty = 5; anchor = "start"; } // Label right of badge (Line 6)

            text.setAttribute("transform", `translate(${tx}, ${ty}) rotate(${rot})`);
            text.setAttribute("text-anchor", anchor);
            g.appendChild(text);
        }
        stationsLayer.appendChild(g);
    });

    // Custom station rendering
    drawSpadinaTransfer();
    drawStGeorge();
}

function drawSpadinaTransfer() {
    // Spadina: Line 1 (Yellow) at y=480, Line 2 (Green) at y=500. x=360.
    // Capsule design: white circle top, Bloor-Yonge style accessibility at bottom, connected by white line
    const x = 360;
    const y1 = 480; // Line 1 (Yellow)
    const y2 = 490; // Line 2 (Green)
    const yCenter = (y1 + y2) / 2; // Center point for positioning

    // Outer group for positioning (uses SVG transform attribute)
    const outer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    outer.setAttribute("transform", `translate(${x}, ${yCenter})`);

    // Inner group for hover effect (uses CSS transform - won't conflict)
    const inner = document.createElementNS("http://www.w3.org/2000/svg", "g");
    inner.setAttribute("class", "station-marker spadina-inner");

    // Relative coordinates (relative to center at yCenter=490)
    const relY1 = y1 - yCenter; // -10
    const relY2 = y2 - yCenter; // +10

    // 1. The Capsule Container (White stroke, Black fill)
    const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const w = 22; // Narrower pill
    const h = 42;
    pill.setAttribute("x", -w / 2);
    pill.setAttribute("y", relY1 - 10);
    pill.setAttribute("width", w);
    pill.setAttribute("height", h);
    pill.setAttribute("rx", w / 2);
    pill.setAttribute("fill", "black");
    pill.setAttribute("stroke", "white");
    pill.setAttribute("stroke-width", "3");
    inner.appendChild(pill);

    // 2. Vertical White Connector Line
    const connector = document.createElementNS("http://www.w3.org/2000/svg", "line");
    connector.setAttribute("x1", 0);
    connector.setAttribute("y1", relY1);
    connector.setAttribute("x2", 0);
    connector.setAttribute("y2", relY2 + 5);  // Extend down further (moved bottom down 2px)
    connector.setAttribute("stroke", "white");
    connector.setAttribute("stroke-width", "4");
    inner.appendChild(connector);

    // 3. Top Circle (White filled - empty circle for Line 1 connection)
    const topCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    topCircle.setAttribute("cx", 0);
    topCircle.setAttribute("cy", relY1);
    topCircle.setAttribute("r", 5.5); // Smaller top circle (reduced by 1px radius)
    topCircle.setAttribute("fill", "white");
    inner.appendChild(topCircle);

    // 4. Bottom Group (Bloor-Yonge style interchange + accessibility)
    const bottomGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bottomGroup.setAttribute("transform", `translate(0, ${relY2 + 10})`);  // Moved down 2px (from 8 to 10)

    // White sticker (outer) - match size of top circle (r=6.5)
    const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    sticker.setAttribute("r", 6.5);
    sticker.setAttribute("fill", "white");
    bottomGroup.appendChild(sticker);

    // Black ring
    const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blackRing.setAttribute("r", 5.5);
    blackRing.setAttribute("fill", "black");
    bottomGroup.appendChild(blackRing);

    // Using just a blue button inside black ring (simpler look for small size)
    // or maintaining the rings but much smaller. Let's try rings first.
    const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    whiteGap.setAttribute("r", 4);
    whiteGap.setAttribute("fill", "white");
    bottomGroup.appendChild(whiteGap);

    // Blue button
    const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blueBtn.setAttribute("r", 3.2);
    blueBtn.setAttribute("fill", "#528CCB");
    bottomGroup.appendChild(blueBtn);

    // Wheelchair Accessibility Icon (White) - scaled down even further
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z");
    iconPath.setAttribute("fill", "white");
    iconPath.setAttribute("transform", "translate(-1.8, -1.8) scale(0.25)");
    bottomGroup.appendChild(iconPath);

    inner.appendChild(bottomGroup);
    outer.appendChild(inner);
    document.getElementById('stations-layer').appendChild(outer);

    // Spadina Label (Top left - above Line 2, left of Line 1)
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "Spadina";
    text.setAttribute("class", "station-label");
    text.setAttribute("x", x - 15);
    text.setAttribute("y", y2 - 15);
    text.setAttribute("text-anchor", "end");
    document.getElementById('stations-layer').appendChild(text);
}

function drawStGeorge() {
    // St George: Line 1 (Yellow) at y=480, Line 2 (Green) at y=500. x=400.
    // Use exact Bloor-Yonge style interchange design
    const x = 400;
    const y = 492; // Positioned on Line 2 (intersection with Line 1)

    // Outer group for positioning (uses SVG transform attribute)
    const outer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    outer.setAttribute("transform", `translate(${x}, ${y})`);

    // Inner group for hover effect (uses CSS transform - won't conflict)
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "station-marker st-george-inner");

    // White sticker (outer) - match interchange style
    const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    sticker.setAttribute("r", 10);
    sticker.setAttribute("fill", "white");
    g.appendChild(sticker);

    // Black ring
    const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blackRing.setAttribute("r", 8);
    blackRing.setAttribute("fill", "black");
    g.appendChild(blackRing);

    // White gap
    const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    whiteGap.setAttribute("r", 5.8);
    whiteGap.setAttribute("fill", "white");
    g.appendChild(whiteGap);

    // Blue button
    const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blueBtn.setAttribute("r", 5);
    blueBtn.setAttribute("fill", "#528CCB");
    g.appendChild(blueBtn);

    // Wheelchair Accessibility Icon (White) - match interchange scale
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z");
    iconPath.setAttribute("fill", "white");
    iconPath.setAttribute("transform", "translate(-2.5, -2.5) scale(0.35)");
    g.appendChild(iconPath);

    outer.appendChild(g);
    document.getElementById('stations-layer').appendChild(outer);

    // St George Label (Top right - above Line 2, right of Line 1)
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "St George";
    text.setAttribute("class", "station-label");
    text.setAttribute("x", x + 15);
    text.setAttribute("y", y - 15);
    text.setAttribute("text-anchor", "start");
    document.getElementById('stations-layer').appendChild(text);
}


function setupDragAndZoom() {
    if (typeof gsap === 'undefined' || typeof Draggable === 'undefined') return;
    gsap.set(mapRoot, { x: 0, y: 0, scale: 1 });
    mapDraggable = Draggable.create(mapRoot, {
        type: "x,y",
        inertia: true,
        trigger: viewport,
        edgeResistance: 0.65,
        onDragStart: () => updateMapBounds(), // Ensure bounds are fresh
    })[0];

    // Initial bounds setup
    updateMapBounds();

    window.addEventListener('resize', updateMapBounds);

    // Mouse wheel zoom
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomMapRelative(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });
}

function setupPinchZoom() {
    let initialDistance = 0;
    let initialScale = 1;

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = getDistance(e.touches[0], e.touches[1]);
            initialScale = gsap.getProperty(mapRoot, "scale");
        }
    });

    viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const scale = (currentDistance / initialDistance) * initialScale;
            const clampedScale = Math.min(Math.max(0.4, scale), 8);

            // Simple scale set. Ideally we should zoom towards the center of the pinch, 
            // but for now let's just ensure bounds are respected.
            gsap.set(mapRoot, { scale: clampedScale });
            updateMapBounds();
        }
    }, { passive: false });

    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

function zoomMapRelative(factor, clientX, clientY) {
    const oldScale = gsap.getProperty(mapRoot, "scale");
    const newScale = Math.min(Math.max(0.4, oldScale * factor), 8);

    const rect = viewport.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const currentX = gsap.getProperty(mapRoot, "x");
    const currentY = gsap.getProperty(mapRoot, "y");

    // Calculate target position to keep mouse point stable
    let newX = mouseX - (mouseX - currentX) * (newScale / oldScale);
    let newY = mouseY - (mouseY - currentY) * (newScale / oldScale);

    // Get valid bounds for the NEW scale
    const bounds = getMapBounds(newScale);

    // Clamp target position to valid bounds
    newX = Math.min(Math.max(newX, bounds.minX), bounds.maxX);
    newY = Math.min(Math.max(newY, bounds.minY), bounds.maxY);

    gsap.to(mapRoot, {
        x: newX,
        y: newY,
        scale: newScale,
        duration: 0.3,
        ease: "power2.out",
        onUpdate: () => updateMapBounds(), // Keep draggable bounds in sync during animation
        onComplete: () => updateMapBounds()
    });
}

function getMapBounds(scale) {
    const mapWidth = 1000 * scale;
    const mapHeight = 800 * scale;

    // Calculate the current visual scale of the SVG relative to the viewport
    // The SVG uses preserveAspectRatio="xMidYMid meet"
    const svgScale = Math.min(viewport.clientWidth / 1000, viewport.clientHeight / 800);

    // Convert viewport dimensions to SVG user units
    const scaledViewportWidth = viewport.clientWidth / svgScale;
    const scaledViewportHeight = viewport.clientHeight / svgScale;

    let minX, maxX, minY, maxY;

    const WIGGLE_ROOM = 300; // Pixels of wiggle room

    // Horizontal Bounds (in SVG User Units)
    if (mapWidth < scaledViewportWidth) {
        // Center map if smaller than viewport but allow wiggle
        const centerX = (scaledViewportWidth - mapWidth) / 2;
        minX = centerX - WIGGLE_ROOM;
        maxX = centerX + WIGGLE_ROOM;
    } else {
        minX = scaledViewportWidth - mapWidth - WIGGLE_ROOM;
        maxX = WIGGLE_ROOM;
    }

    // Vertical Bounds (in SVG User Units)
    if (mapHeight < scaledViewportHeight) {
        // Center map vertically but allow wiggle
        const centerY = (scaledViewportHeight - mapHeight) / 2;
        minY = centerY - WIGGLE_ROOM;
        maxY = centerY + WIGGLE_ROOM;
    } else {
        minY = scaledViewportHeight - mapHeight - WIGGLE_ROOM;
        maxY = WIGGLE_ROOM;
    }

    return { minX, maxX, minY, maxY };
}

function updateMapBounds(specificScale) {
    if (!mapDraggable) return;

    const currentScale = gsap.getProperty(mapRoot, "scale");
    const scale = specificScale || currentScale;

    const bounds = getMapBounds(scale);

    mapDraggable.applyBounds(bounds);

    // If we are not currently animating (e.g. pinch zoom or window resize), 
    // and the specificScale matches current (or wasn't provided), 
    // enforce bounds on the element position immediately.
    // This prevents "stuck out of bounds" state which causes rubber banding on next drag.
    if (!gsap.isTweening(mapRoot) && (!specificScale || Math.abs(specificScale - currentScale) < 0.001)) {
        const currX = gsap.getProperty(mapRoot, "x");
        const currY = gsap.getProperty(mapRoot, "y");

        let fixX = currX;
        let fixY = currY;

        if (fixX < bounds.minX) fixX = bounds.minX;
        if (fixX > bounds.maxX) fixX = bounds.maxX;
        if (fixY < bounds.minY) fixY = bounds.minY;
        if (fixY > bounds.maxY) fixY = bounds.maxY;

        if (fixX !== currX || fixY !== currY) {
            gsap.set(mapRoot, { x: fixX, y: fixY });
        }
    }
}

async function fetchAlerts() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');

    // Set loading state
    statusIndicator.classList.remove('live');
    statusIndicator.classList.add('loading');
    statusText.textContent = 'Loading';

    try {
        const res = await fetch('/api/alerts');
        if (!res.ok) throw new Error("Server Error");
        const alerts = await res.json();
        activeAlerts = alerts;
        renderAllAlerts();
        renderAlertsList();

        // Set live state after successful fetch
        statusIndicator.classList.remove('loading');
        statusIndicator.classList.add('live');
        statusText.textContent = 'Live';
    } catch (err) {
        console.warn("Backend unavailable.");
        statusText.textContent = 'Error';
        if (pollingInterval) clearInterval(pollingInterval);
    }
}

async function fetchUpcomingAlerts() {
    try {
        const res = await fetch('/api/upcoming-alerts');
        if (!res.ok) throw new Error("Server Error");
        const alerts = await res.json();
        upcomingAlerts = alerts;
        updateUpcomingBadge();
        renderUpcomingList();
    } catch (err) {
        console.warn("Could not fetch upcoming alerts.");
    }
}

function updateUpcomingBadge() {
    const badge = document.getElementById('upcoming-badge');
    if (upcomingAlerts.length > 0) {
        badge.textContent = upcomingAlerts.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderUpcomingList() {
    const listContainer = document.getElementById('upcoming-list');
    if (upcomingAlerts.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 16px; color: var(--l2-color);"></i>
                <p style="font-size: 16px;">No upcoming service changes scheduled.</p>
            </div>
        `;
        return;
    }

    // Sort by start time (soonest first)
    const sortedAlerts = [...upcomingAlerts].sort((a, b) => {
        return (a.activeStartTime || 0) - (b.activeStartTime || 0);
    });

    listContainer.innerHTML = sortedAlerts.map(alert => {
        const startTime = alert.activeStartTime ? new Date(alert.activeStartTime) : null;
        const endTime = alert.activeEndTime ? new Date(alert.activeEndTime) : null;

        const formatDate = (date) => {
            if (!date) return '';
            const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
            return date.toLocaleDateString('en-US', options);
        };

        const timeUntil = startTime ? getTimeUntil(startTime) : '';

        return `
        <div class="alert-card" style="border-left-color: var(--delay-color);">
            <div class="alert-card-header">
                <div class="alert-line-badge line-${alert.line}">${alert.line}</div>
                <div class="alert-title">${alert.reason}</div>
                <span style="background: rgba(245, 158, 11, 0.2); color: var(--delay-color); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: auto;">
                    ${timeUntil}
                </span>
            </div>
            <div class="alert-meta">
                ${alert.direction} • ${alert.singleStation ? `At: ${alert.start}` : `${alert.start} ↔ ${alert.end}`}
            </div>
            ${startTime ? `
            <div style="margin-top: 8px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 13px;">
                <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
                    <i class="fas fa-calendar-alt"></i>
                    <span><strong>Starts:</strong> ${formatDate(startTime)}</span>
                </div>
                ${endTime ? `
                <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); margin-top: 4px;">
                    <i class="fas fa-calendar-check"></i>
                    <span><strong>Ends:</strong> ${formatDate(endTime)}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
            <div class="alert-description" style="margin-top: 8px;">${alert.originalText || ''}</div>
            ${alert.shuttle ? '<div class="shuttle-badge"><i class="fas fa-bus"></i> Shuttle buses will run</div>' : ''}
        </div>
    `;
    }).join('');
}

function getTimeUntil(date) {
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return 'Starting soon';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `In ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        const minutes = Math.floor(diff / (1000 * 60));
        return `In ${minutes} min${minutes > 1 ? 's' : ''}`;
    }
}

function renderAllAlerts() {
    // Properly clear SVG children
    while (alertsLayer.firstChild) {
        alertsLayer.removeChild(alertsLayer.firstChild);
    }
    // Only render active alerts on the map
    const mapActiveAlerts = activeAlerts.filter(alert => alert.status === 'active');
    mapActiveAlerts.forEach(alert => {
        const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';
        if (alert.singleStation) drawStationAlert(alert.line, alert.start, isDelay);
        else {
            const flow = calculateFlow(alert.line, alert.start, alert.end, alert.direction);
            drawAlertPath(alert.line, alert.start, alert.end, flow, alert.shuttle, isDelay);
        }
    });
}

function renderAlertsList() {
    const listContainer = document.getElementById('alerts-list');
    if (activeAlerts.length === 0) {
        listContainer.innerHTML = '<p style="color: var(--text-muted);">No active alerts at this time.</p>';
        return;
    }

    // Sort: active alerts first, then cleared
    const sortedAlerts = [...activeAlerts].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
    });

    listContainer.innerHTML = sortedAlerts.map(alert => {
        const isCleared = alert.status === 'cleared';
        const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';

        let borderColor = 'var(--alert-color)';
        if (isCleared) borderColor = 'var(--l2-color)';
        else if (isDelay) borderColor = 'var(--delay-color)';

        const bgOpacity = isCleared ? '0.5' : '1';

        return `
        <div class="alert-card" style="border-left-color: ${borderColor}; opacity: ${bgOpacity};">
            <div class="alert-card-header">
                <div class="alert-line-badge line-${alert.line}">${alert.line}</div>
                <div class="alert-title">${alert.reason}</div>
                ${isCleared ? '<span style="color: var(--l2-color); font-size: 12px; margin-left: auto;">✓ Cleared</span>' : ''}
            </div>
            <div class="alert-meta">
                ${alert.direction} • ${alert.singleStation ? `At: ${alert.start}` : `${alert.start} ↔ ${alert.end}`}
            </div>
            <div class="alert-description">${alert.originalText || ''}</div>
            ${alert.shuttle ? '<div class="shuttle-badge"><i class="fas fa-bus"></i> Shuttle buses running</div>' : ''}
        </div>
    `;
    }).join('');
}

function calculateFlow(line, startName, endName, direction) {
    if (direction === 'Both Ways') return 'both';
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return 'forward';
    const idx1 = lineObj.stations.findIndex(s => s.name === startName); const idx2 = lineObj.stations.findIndex(s => s.name === endName);
    if (direction && line === '1') {
        const unionIdx = 21; const midIdx = (idx1 + idx2) / 2;
        if (midIdx < unionIdx) {
            if (direction === 'Northbound') return 'reverse'; if (direction === 'Southbound') return 'forward';
        } else {
            if (direction === 'Northbound') return 'forward'; if (direction === 'Southbound') return 'reverse';
        }
    }
    if (idx1 < idx2) return 'forward'; return 'reverse';
}



function drawAlertPath(line, startName, endName, flow, isShuttle, isDelay) {
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return;
    const idx1 = lineObj.stations.findIndex(s => s.name === startName); const idx2 = lineObj.stations.findIndex(s => s.name === endName);
    if (idx1 === -1 || idx2 === -1) return;
    const segment = lineObj.stations.slice(Math.min(idx1, idx2), Math.max(idx1, idx2) + 1);
    const d = getPathFromStations(segment, line);
    if (isShuttle) {
        const shuttlePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        shuttlePath.setAttribute("d", d); shuttlePath.setAttribute("class", "shuttle-outline"); alertsLayer.appendChild(shuttlePath);
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d); path.setAttribute("class", "alert-base");
    if (isDelay) path.classList.add("delay");

    if (flow === 'both') path.classList.add("pulse-solid"); else if (flow === 'reverse') path.classList.add("flow-reverse"); else path.classList.add("flow-forward");
    alertsLayer.appendChild(path);
}

function drawStationAlert(line, stationName, isDelay) {
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return;
    const s = lineObj.stations.find(st => st.name === stationName); if (!s) return;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", s.x); circle.setAttribute("cy", s.y); circle.setAttribute("r", 10); circle.setAttribute("class", "station-alert-glow");
    if (isDelay) circle.style.stroke = "var(--delay-color)";
    if (isDelay) circle.style.fill = "var(--delay-color)";
    alertsLayer.appendChild(circle);
}

window.onload = initMap;
