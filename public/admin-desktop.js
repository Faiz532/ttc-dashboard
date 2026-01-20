// Desktop Map Application - Toronto Transit Live
// Floating UI Version

lucide.createIcons();
let activeAlerts = [];
let upcomingAlerts = [];
let pollingInterval = null;
let currentTab = 'lines';
let manualAlertCounter = 1; // For generating unique IDs
const mapRoot = document.getElementById('map-root');
const viewport = document.getElementById('viewport');
const tracksLayer = document.getElementById('tracks-layer');
const stationsLayer = document.getElementById('stations-layer');
const alertsLayer = document.getElementById('alerts-layer');
let mapDraggable = null;

// ==========================================
// MENU PANEL TOGGLE
// ==========================================
const menuBtn = document.getElementById('btn-menu');
const menuPanel = document.getElementById('menu-panel');
const menuOverlay = document.getElementById('menu-overlay');
const leftFabStack = document.querySelector('.fab-stack.left');

function toggleMenu() {
    menuPanel.classList.toggle('hidden');
    menuOverlay.classList.toggle('hidden');
    // Shift left FAB buttons when menu opens
    if (leftFabStack) {
        leftFabStack.classList.toggle('menu-open');
    }
}

if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);

// Menu item navigation
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (tab) {
            switchTab(tab);
            toggleMenu();
        }
    });
});

function switchTab(tab) {
    currentTab = tab;

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Show/hide panels
    document.getElementById('alerts-panel').classList.toggle('active', tab === 'alerts');
    document.getElementById('upcoming-panel').classList.toggle('active', tab === 'upcoming');
    document.getElementById('about-panel').classList.toggle('active', tab === 'about');
    const createPanel = document.getElementById('create-panel');
    if (createPanel) createPanel.classList.toggle('active', tab === 'create');
}

// Close panel buttons
document.querySelectorAll('.close-panel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab('lines');
    });
});

// ==========================================
// LEGEND POPUP TOGGLE
// ==========================================
const legendBtn = document.getElementById('btn-legend');
const legendPopup = document.getElementById('legend-popup');

if (legendBtn) {
    legendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        legendPopup.classList.toggle('hidden');
    });
}

// Close legend when clicking outside
document.addEventListener('click', (e) => {
    if (legendPopup && !legendPopup.classList.contains('hidden') &&
        !legendPopup.contains(e.target) && !legendBtn.contains(e.target)) {
        legendPopup.classList.add('hidden');
    }
});

// ==========================================
// RECENTER BUTTON
// ==========================================
const recenterBtn = document.getElementById('btn-recenter');
if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
        if (mapRoot && typeof gsap !== 'undefined') {
            gsap.to(mapRoot, {
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: "power2.out",
                onComplete: () => updateMapBounds()
            });
        }
    });
}

// ==========================================
// CLOCK
// ==========================================
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const clockTime = document.querySelector('.clock-time');
    const clockDate = document.querySelector('.clock-date');
    if (clockTime) clockTime.textContent = timeStr;
    if (clockDate) clockDate.textContent = dateStr;
}

setInterval(updateClock, 1000);
updateClock();


const rawMapData = [
    {
        line: "1",
        stations: [
            { name: "Vaughan Metropolitan Centre", x: 300, y: 50, accessible: true },
            { name: "Highway 407", x: 300, y: 80, accessible: true },
            { name: "Pioneer Village", x: 300, y: 110, accessible: true },
            { name: "York University", x: 300, y: 140, accessible: true },
            { name: "Finch West", x: 300, y: 170, accessible: true },
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
            { name: "Union", x: 480, y: 700, accessible: true },
            { name: "King", x: 560, y: 670, accessible: false },
            { name: "Queen", x: 560, y: 640, accessible: true },
            { name: "TMU", x: 560, y: 610, accessible: true },
            { name: "College", x: 560, y: 580, accessible: false },
            { name: "Wellesley", x: 560, y: 550, accessible: true },
            { name: "Bloor-Yonge", x: 560, y: 492, interchange: true, accessible: true },
            { name: "Rosedale", x: 560, y: 472, accessible: false },
            { name: "Summerhill", x: 560, y: 452, accessible: false },
            { name: "St Clair", x: 560, y: 432, accessible: true },
            { name: "Davisville", x: 560, y: 412, accessible: true },
            { name: "Eglinton", x: 560, y: 380, interchange: true, accessible: true },
            { name: "Lawrence", x: 560, y: 348, accessible: true },
            { name: "York Mills", x: 560, y: 316, accessible: true },
            { name: "Sheppard-Yonge", x: 560, y: 292, interchange: true, accessible: true },
            { name: "North York Centre", x: 560, y: 268, accessible: true },
            { name: "Finch", x: 560, y: 244, accessible: true }
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
            { name: "Bay", x: 480, y: 492, accessible: true },
            { name: "Bloor-Yonge", x: 560, y: 492, interchange: true, accessible: true },
            { name: "Sherbourne", x: 585, y: 492, accessible: true },
            { name: "Castle Frank", x: 610, y: 492, accessible: false },
            { name: "Broadview", x: 635, y: 492, accessible: true },
            { name: "Chester", x: 660, y: 492, accessible: true },
            { name: "Pape", x: 685, y: 492, accessible: true },
            { name: "Donlands", x: 710, y: 492, accessible: false },
            { name: "Greenwood", x: 735, y: 492, accessible: false },
            { name: "Coxwell", x: 760, y: 492, accessible: true },
            { name: "Woodbine", x: 785, y: 492, accessible: true },
            { name: "Main Street", x: 810, y: 492, accessible: true },
            { name: "Victoria Park", x: 835, y: 455, accessible: true },
            { name: "Warden", x: 860, y: 418, accessible: false },
            { name: "Kennedy", x: 885, y: 380, accessible: true }
        ]
    },
    {
        line: "4",
        stations: [
            { name: "Sheppard-Yonge", x: 560, y: 292, interchange: true, accessible: true },
            { name: "Bayview", x: 610, y: 292, accessible: true },
            { name: "Bessarion", x: 660, y: 292, accessible: true },
            { name: "Leslie", x: 710, y: 292, accessible: true },
            { name: "Don Mills", x: 760, y: 292, accessible: true }
        ]
    },
    {
        line: "5",
        stations: [
            { name: "Mount Dennis", x: 220, y: 380, interchange: true, accessible: true },
            { name: "Kennedy", x: 885, y: 380, interchange: true, accessible: true }
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
    setupAdminForm(); // Admin: Setup form handling
    // ADMIN MODE: No API fetching
    // fetchData();
    // pollingInterval = setInterval(() => { fetchData(); }, 60000);
    renderAllAlerts(); // Initial render with empty alerts
    renderAlertsList();
    // updateBadges(); // Disabled in testing mode
}

function renderTracks() {
    tracksLayer.innerHTML = '';
    rawMapData.forEach(lineData => {
        const d = getPathFromStations(lineData.stations, lineData.line);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d); path.setAttribute("class", `track line-${lineData.line}`);
        tracksLayer.appendChild(path);

        // Line 4 label is rendered with the Don Mills terminal badge instead

        if (lineData.line === '5') {
            const maskId = "line-5-mask";
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
                    mask.setAttribute("maskUnits", "userSpaceOnUse");

                    const maskBase = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    maskBase.setAttribute("d", d);
                    maskBase.setAttribute("stroke", "white");
                    maskBase.setAttribute("stroke-width", "18");
                    maskBase.setAttribute("fill", "none");
                    mask.appendChild(maskBase);

                    const maskCutout = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    maskCutout.setAttribute("d", d);
                    maskCutout.setAttribute("stroke", "black");
                    maskCutout.setAttribute("stroke-width", "8");
                    maskCutout.setAttribute("fill", "none");
                    mask.appendChild(maskCutout);

                    defs.appendChild(mask);
                }
            }

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
                if (prev && prev.name === 'St Andrew') { d += `Q 400 700, 480 700 `; continue; }
            }
            if (s.name === 'King') {
                const prev = stations[i - 1];
                if (prev && prev.name === 'Union') { d += `Q 560 700, 560 670 `; continue; }
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

function getLineColor(lineId) {
    if (lineId === '1') return "#FFC425";
    if (lineId === '2') return "#009639";
    if (lineId === '4') return "#B5236B";
    if (lineId === '5') return "#F37021";
    if (lineId === '6') return "#9ca3af";
    return "#ffffff";
}

function getLineTextColor(lineId) { return (lineId === '1') ? "black" : "white"; }

function renderStations() {
    stationsLayer.innerHTML = '';
    const allStations = [];
    rawMapData.forEach(l => {
        const len = l.stations.length;
        l.stations.forEach((s, i) => { allStations.push({ ...s, line: l.line, isTerminal: (i === 0 || i === len - 1) }); });
    });

    allStations.forEach(s => {
        if (s.name === 'Spadina') return;
        if (s.name === 'St George') return;
        if (s.line === '2' && s.name === 'Bloor-Yonge') return;
        if (s.name === 'Kennedy') return; // Skip - handled by drawKennedy()

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${s.x}, ${s.y})`);

        if (s.interchange) {
            const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g"); gIcon.setAttribute("class", "station-marker");
            const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle"); sticker.setAttribute("r", 10); sticker.setAttribute("fill", "white"); gIcon.appendChild(sticker);
            const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); blackRing.setAttribute("r", 8); blackRing.setAttribute("fill", "black"); gIcon.appendChild(blackRing);
            const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle"); whiteGap.setAttribute("r", 5.8); whiteGap.setAttribute("fill", "white"); gIcon.appendChild(whiteGap);
            const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle"); blueBtn.setAttribute("r", 5); blueBtn.setAttribute("fill", "#528CCB"); gIcon.appendChild(blueBtn);
            const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z"); iconPath.setAttribute("fill", "white"); iconPath.setAttribute("transform", "translate(-2.5, -2.5) scale(0.35)"); gIcon.appendChild(iconPath);
            g.appendChild(gIcon);
        } else if (s.accessible) {
            const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g"); gIcon.setAttribute("class", "station-marker");
            const outerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); outerRing.setAttribute("r", "4.5"); outerRing.setAttribute("fill", "black"); gIcon.appendChild(outerRing);
            const midRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); midRing.setAttribute("r", "3.8"); midRing.setAttribute("fill", "white"); gIcon.appendChild(midRing);
            const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); innerCircle.setAttribute("r", "3"); innerCircle.setAttribute("fill", "#528CCB"); gIcon.appendChild(innerCircle);
            const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z"); iconPath.setAttribute("fill", "white"); iconPath.setAttribute("transform", "translate(-2, -2) scale(0.25)"); gIcon.appendChild(iconPath);
            g.appendChild(gIcon);
        } else {
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("r", 4); dot.setAttribute("class", "station-marker regular-station"); dot.setAttribute("fill", "white"); dot.setAttribute("stroke", "black"); dot.setAttribute("stroke-width", "1");
            g.appendChild(dot);
        }

        if (s.isTerminal) {
            const badgeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            let bdx = 0, bdy = 0;

            if (s.name === "Vaughan Metropolitan Centre") { bdx = 0; bdy = -25; }
            else if (s.name === "Finch") { bdx = 0; bdy = -25; }
            else if (s.name === "Kipling") { bdx = -97; bdy = 0; }
            else if (s.name === "Kennedy") {
                // Skip - handled by drawKennedy()
                bdx = 0; bdy = 0;
            }
            else if (s.name === "Sheppard-Yonge" && s.line === '4') { bdx = -175; bdy = -2; } // 10px left, 2px up
            else if (s.name === "Don Mills") { bdx = 120; bdy = -2; } // Badge far right
            else if (s.name === "Mount Dennis") { bdx = -160; bdy = 0; } // Badge far left
            else if (s.name === "Humber College") { bdx = 0; bdy = 30; } // Badge below station
            else if (s.name === "Finch West" && s.line === '6') { bdx = 135; bdy = 0; } // 10px left

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
            (s.line === '2' && ["Spadina", "St George", "Bloor-Yonge"].includes(s.name)) ||
            (s.line === '5' && s.name === "Kennedy") ||
            (s.line === '2' && s.name === "Kennedy") ||
            (s.line === '5' && s.name === "Finch West") ||
            (s.line === '1' && s.name === "Finch West");

        if (!isDup) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text"); text.textContent = s.name;
            if (s.isTerminal || s.name === "Spadina" || s.name === "St George" || s.name === "Bloor-Yonge" || s.name === "Union" || s.name === "Sheppard-Yonge") {
                text.setAttribute("class", "station-label terminal-label");
            } else {
                text.setAttribute("class", "station-label");
            }

            let tx = 12, ty = 4, rot = 0, anchor = "start";

            if (s.line === '6') {
                if (s.name === "Humber College") {
                    rot = 0; tx = 15; ty = 5; anchor = "start"; // Label to the right
                } else if (s.name === "Finch West") {
                    rot = 0; tx = 15; ty = 5; anchor = "start"; // Label to the right
                } else {
                    const topStations = ["Westmore", "Martin Grove", "Albion", "Stevenson", "Mount Olive", "Rowntree Mills", "Pearldale", "Duncanwoods"];
                    if (topStations.includes(s.name)) {
                        rot = -45; tx = 5; ty = -10; anchor = "start";
                    } else {
                        rot = 45; tx = 5; ty = 10; anchor = "start";
                    }
                }
            }
            else if (s.line === '1' && (s.name === "Downsview Park" || s.name === "Sheppard West")) { tx = 15; ty = 4; anchor = "start"; }
            else if (s.line === '1' && (s.name === "Sheppard-Yonge" || s.name === "Wellesley" || s.name === "St Andrew")) { tx = -15; ty = 4; anchor = "end"; }
            else if (s.line === '1' && s.name === "Bloor-Yonge") { tx = -15; ty = -15; anchor = "end"; }
            else if (s.line === '1' && s.name === "Union") { tx = 0; ty = 25; anchor = "middle"; }
            else if (s.line === '4' || s.y === 490) { rot = 45; tx = 10; ty = 10; anchor = "start"; }
            else if (s.line === '2') {
                if (s.name === 'St George') {
                    rot = 0; tx = -15; ty = -15; anchor = "end";
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

            if (s.name === "Vaughan Metropolitan Centre") { tx = 15; ty = 5; rot = 0; anchor = "start"; }
            else if (s.name === "Finch") { tx = 15; ty = 5; rot = 0; anchor = "start"; }
            else if (s.name === "Kipling") { rot = 0; tx = -18; ty = 5; anchor = "end"; }
            else if (s.name === "Kennedy") {
                // Skip - handled by drawKennedy()
            }
            else if (s.name === "Sheppard-Yonge" && s.line === '4') {
                rot = 0; tx = 15; ty = -15; anchor = "start";
            }
            else if (s.name === "Don Mills") { rot = 0; tx = 18; ty = 5; anchor = "start"; }
            else if (s.name === "Mount Dennis") { rot = 0; tx = -20; ty = 5; anchor = "end"; }
            else if (s.name === "Finch West" && s.line === '6') { rot = 0; tx = 15; ty = 5; anchor = "start"; }
            else if (s.name === "Yorkdale") { rot = 0; tx = -15; ty = 5; anchor = "end"; }

            // Apply transform - rotate first for proper alignment
            if (rot !== 0) {
                text.setAttribute("transform", `rotate(${rot}) translate(${tx}, ${ty})`);
            } else {
                text.setAttribute("transform", `translate(${tx}, ${ty})`);
            }
            text.setAttribute("text-anchor", anchor);
            g.appendChild(text);
        }
        stationsLayer.appendChild(g);
    });

    drawSpadinaTransfer();
    drawStGeorge();
    drawKennedy();
}

function drawSpadinaTransfer() {
    const x = 360;
    const y1 = 480;
    const y2 = 490;
    const yCenter = (y1 + y2) / 2;

    const outer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    outer.setAttribute("transform", `translate(${x}, ${yCenter})`);

    const inner = document.createElementNS("http://www.w3.org/2000/svg", "g");
    inner.setAttribute("class", "station-marker spadina-inner");

    const relY1 = y1 - yCenter;
    const relY2 = y2 - yCenter;

    const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const w = 22;
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

    const connector = document.createElementNS("http://www.w3.org/2000/svg", "line");
    connector.setAttribute("x1", 0);
    connector.setAttribute("y1", relY1);
    connector.setAttribute("x2", 0);
    connector.setAttribute("y2", relY2 + 5);
    connector.setAttribute("stroke", "white");
    connector.setAttribute("stroke-width", "4");
    inner.appendChild(connector);

    const topCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    topCircle.setAttribute("cx", 0);
    topCircle.setAttribute("cy", relY1);
    topCircle.setAttribute("r", 5.5);
    topCircle.setAttribute("fill", "white");
    inner.appendChild(topCircle);

    const bottomGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bottomGroup.setAttribute("transform", `translate(0, ${relY2 + 10})`);

    const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    sticker.setAttribute("r", 6.5);
    sticker.setAttribute("fill", "white");
    bottomGroup.appendChild(sticker);

    const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blackRing.setAttribute("r", 5.5);
    blackRing.setAttribute("fill", "black");
    bottomGroup.appendChild(blackRing);

    const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    whiteGap.setAttribute("r", 4);
    whiteGap.setAttribute("fill", "white");
    bottomGroup.appendChild(whiteGap);

    const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blueBtn.setAttribute("r", 3.2);
    blueBtn.setAttribute("fill", "#528CCB");
    bottomGroup.appendChild(blueBtn);

    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z");
    iconPath.setAttribute("fill", "white");
    iconPath.setAttribute("transform", "translate(-1.8, -1.8) scale(0.25)");
    bottomGroup.appendChild(iconPath);

    inner.appendChild(bottomGroup);
    outer.appendChild(inner);
    document.getElementById('stations-layer').appendChild(outer);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "Spadina";
    text.setAttribute("class", "station-label terminal-label");
    text.setAttribute("x", x - 15);
    text.setAttribute("y", y2 - 15);
    text.setAttribute("text-anchor", "end");
    document.getElementById('stations-layer').appendChild(text);
}

function drawStGeorge() {
    const x = 400;
    const y = 492;

    const outer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    outer.setAttribute("transform", `translate(${x}, ${y})`);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "station-marker st-george-inner");

    const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    sticker.setAttribute("r", 10);
    sticker.setAttribute("fill", "white");
    g.appendChild(sticker);

    const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blackRing.setAttribute("r", 8);
    blackRing.setAttribute("fill", "black");
    g.appendChild(blackRing);

    const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    whiteGap.setAttribute("r", 5.8);
    whiteGap.setAttribute("fill", "white");
    g.appendChild(whiteGap);

    const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blueBtn.setAttribute("r", 5);
    blueBtn.setAttribute("fill", "#528CCB");
    g.appendChild(blueBtn);

    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z");
    iconPath.setAttribute("fill", "white");
    iconPath.setAttribute("transform", "translate(-2.5, -2.5) scale(0.35)");
    g.appendChild(iconPath);

    outer.appendChild(g);
    document.getElementById('stations-layer').appendChild(outer);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "St George";
    text.setAttribute("class", "station-label terminal-label");
    text.setAttribute("x", x + 15);
    text.setAttribute("y", y - 15);
    text.setAttribute("text-anchor", "start");
    document.getElementById('stations-layer').appendChild(text);
}

function drawKennedy() {
    // Kennedy Custom Rendering - positioned where Line 2 meets Line 5
    const x = 885;
    const y = 380;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${x}, ${y})`);

    // Large interchange icon (matching Bloor-Yonge style)
    const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gIcon.setAttribute("class", "station-marker");
    const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    sticker.setAttribute("r", 10);
    sticker.setAttribute("fill", "white");
    gIcon.appendChild(sticker);
    const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blackRing.setAttribute("r", 8);
    blackRing.setAttribute("fill", "black");
    gIcon.appendChild(blackRing);
    const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    whiteGap.setAttribute("r", 5.8);
    whiteGap.setAttribute("fill", "white");
    gIcon.appendChild(whiteGap);
    const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blueBtn.setAttribute("r", 5);
    blueBtn.setAttribute("fill", "#528CCB");
    gIcon.appendChild(blueBtn);
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z");
    iconPath.setAttribute("fill", "white");
    iconPath.setAttribute("transform", "translate(-2.5, -2.5) scale(0.35)");
    gIcon.appendChild(iconPath);
    g.appendChild(gIcon);

    // Label "Kennedy" (to the right of station, close to track)
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "Kennedy";
    text.setAttribute("class", "station-label terminal-label");
    text.setAttribute("text-anchor", "start");
    text.setAttribute("x", 12);
    text.setAttribute("y", 4);
    g.appendChild(text);

    // Line 2 Badge (Green) - far right
    const g2 = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g2.setAttribute("transform", "translate(105, 0)");
    const bubble2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bubble2.setAttribute("r", 12);
    bubble2.setAttribute("fill", getLineColor('2'));
    bubble2.setAttribute("stroke", "white");
    bubble2.setAttribute("stroke-width", "2");
    g2.appendChild(bubble2);
    const num2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    num2.textContent = "2";
    num2.setAttribute("class", "terminal-text");
    num2.setAttribute("fill", "white");
    num2.setAttribute("dy", 1);
    num2.setAttribute("text-anchor", "middle");
    num2.setAttribute("dominant-baseline", "middle");
    g2.appendChild(num2);
    g.appendChild(g2);

    // Line 5 Badge (Orange) - even more right
    const g5 = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g5.setAttribute("transform", "translate(135, 0)");
    const bubble5 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bubble5.setAttribute("r", 12);
    bubble5.setAttribute("fill", getLineColor('5'));
    bubble5.setAttribute("stroke", "white");
    bubble5.setAttribute("stroke-width", "2");
    g5.appendChild(bubble5);
    const num5 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    num5.textContent = "5";
    num5.setAttribute("class", "terminal-text");
    num5.setAttribute("fill", "white");
    num5.setAttribute("dy", 1);
    num5.setAttribute("text-anchor", "middle");
    num5.setAttribute("dominant-baseline", "middle");
    g5.appendChild(num5);
    g.appendChild(g5);

    document.getElementById('stations-layer').appendChild(g);
}

function setupDragAndZoom() {
    if (typeof gsap === 'undefined' || typeof Draggable === 'undefined') return;
    gsap.set(mapRoot, { x: 0, y: 0, scale: 1 });
    mapDraggable = Draggable.create(mapRoot, {
        type: "x,y",
        inertia: true,
        trigger: viewport,
        edgeResistance: 0.65,
        onDragStart: () => updateMapBounds(),
    })[0];

    updateMapBounds();

    window.addEventListener('resize', updateMapBounds);

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

function focusOnAlert(alert) {
    // Find the affected station(s) coordinates (in SVG coordinate space)
    const lineObj = rawMapData.find(l => l.line === alert.line);
    if (!lineObj) return;

    const startStation = lineObj.stations.find(s => s.name === alert.start);
    const endStation = alert.end ? lineObj.stations.find(s => s.name === alert.end) : null;

    if (!startStation) return;

    let centerX, centerY;
    if (endStation) {
        // Center between start and end
        centerX = (startStation.x + endStation.x) / 2;
        centerY = (startStation.y + endStation.y) / 2;
    } else {
        // Single station
        centerX = startStation.x;
        centerY = startStation.y;
    }

    // Get viewport dimensions  
    const viewportRect = viewport.getBoundingClientRect();
    const viewWidth = viewportRect.width;
    const viewHeight = viewportRect.height;

    // SVG viewBox is "-200 0 1400 800"
    const viewBoxX = -200;
    const viewBoxWidth = 1400;
    const viewBoxHeight = 800;

    // Calculate the scale factor (how many pixels per SVG unit)
    // The SVG uses preserveAspectRatio="xMidYMid meet" so it scales uniformly
    const svgScale = Math.min(viewWidth / viewBoxWidth, viewHeight / viewBoxHeight);

    // Convert SVG coordinates to pixel position (at scale=1, x=0, y=0)
    // The SVG is centered in viewport due to xMidYMid
    const svgPixelWidth = viewBoxWidth * svgScale;
    const svgPixelHeight = viewBoxHeight * svgScale;
    const svgOffsetX = (viewWidth - svgPixelWidth) / 2;
    const svgOffsetY = (viewHeight - svgPixelHeight) / 2;

    // Alert position in pixels (relative to viewport)
    const alertPixelX = svgOffsetX + (centerX - viewBoxX) * svgScale;
    const alertPixelY = svgOffsetY + centerY * svgScale;

    // Zoom level for the alert view
    const ZOOM = 2.0;

    // To center the alert at screen center after zooming:
    // We want: viewportCenter = alertPixelPos * ZOOM + translation
    // So: translation = viewportCenter - alertPixelPos * ZOOM
    const targetX = (viewWidth / 2) - (alertPixelX * ZOOM);
    const targetY = (viewHeight / 2) - (alertPixelY * ZOOM);

    // Animate pan and zoom
    if (typeof gsap !== 'undefined' && mapRoot) {
        gsap.to(mapRoot, {
            x: targetX,
            y: targetY,
            scale: ZOOM,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => {
                updateMapBounds();
            }
        });
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

    let newX = mouseX - (mouseX - currentX) * (newScale / oldScale);
    let newY = mouseY - (mouseY - currentY) * (newScale / oldScale);

    const bounds = getMapBounds(newScale);

    newX = Math.min(Math.max(newX, bounds.minX), bounds.maxX);
    newY = Math.min(Math.max(newY, bounds.minY), bounds.maxY);

    gsap.to(mapRoot, {
        x: newX,
        y: newY,
        scale: newScale,
        duration: 0.3,
        ease: "power2.out",
        onUpdate: () => updateMapBounds(),
        onComplete: () => updateMapBounds()
    });
}

function getMapBounds(scale) {
    const mapWidth = 1400 * scale;  // Matches viewBox width
    const mapHeight = 800 * scale;
    const svgScale = Math.min(viewport.clientWidth / 1400, viewport.clientHeight / 800);
    const scaledViewportWidth = viewport.clientWidth / svgScale;
    const scaledViewportHeight = viewport.clientHeight / svgScale;

    let minX, maxX, minY, maxY;
    const WIGGLE_ROOM = 300;

    if (mapWidth < scaledViewportWidth) {
        const centerX = (scaledViewportWidth - mapWidth) / 2;
        minX = centerX - WIGGLE_ROOM - 200; // Extra 200px right padding
        maxX = centerX + WIGGLE_ROOM;
    } else {
        minX = scaledViewportWidth - mapWidth - WIGGLE_ROOM - 200; // Extra 200px right padding
        maxX = WIGGLE_ROOM;
    }

    if (mapHeight < scaledViewportHeight) {
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


async function fetchData() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');

    // Only show loading state if it's taking a perceptible amount of time
    // Show loading state if we don't have data yet
    if (!activeAlerts || activeAlerts.length === 0) {
        statusIndicator.classList.remove('live', 'error');
        statusIndicator.classList.add('loading');
        statusText.textContent = 'Loading';
    }

    try {
        const res = await fetch(`/api/data?t=${Date.now()}`);

        if (!res.ok) throw new Error("Server Error");

        const data = await res.json();

        // If server returns null (initializing), keep loading and retry
        if (data.alerts === null) {
            console.log("Server initializing... retrying in 1s");
            setTimeout(fetchData, 1000);
            return;
        }

        console.log("DEBUG: Raw API Data:", data);

        // Update Active Alerts
        activeAlerts = data.alerts || [];
        console.log("DEBUG: Active Alerts on Client:", activeAlerts);

        // If previewing, don't interrupt UI
        if (previewTimeout) {
            console.log("Skipping render due to active preview");
            return;
        }

        renderAllAlerts();
        renderAlertsList();

        // Update Upcoming Alerts
        upcomingAlerts = data.upcoming || [];
        updateUpcomingBadge();
        renderUpcomingList();

        // Update Status - ONLY NOW do we show Live
        statusIndicator.classList.remove('loading', 'error');
        statusIndicator.classList.add('live');
        statusText.textContent = 'Live';

    } catch (err) {
        console.warn("Backend unavailable.");

        statusIndicator.classList.remove('loading', 'live');
        statusIndicator.classList.add('error');
        statusText.textContent = 'Error';
        // Retry in 5s if error
        setTimeout(fetchData, 5000);
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

    const sortedAlerts = [...upcomingAlerts].sort((a, b) => {
        return (a.activeStartTime || 0) - (b.activeStartTime || 0);
    });

    listContainer.innerHTML = sortedAlerts.map((alert, index) => {
        const startTime = alert.activeStartTime ? new Date(alert.activeStartTime) : null;
        const endTime = alert.activeEndTime ? new Date(alert.activeEndTime) : null;

        const formatDate = (date) => {
            if (!date) return '';
            const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
            return date.toLocaleDateString('en-US', options);
        };

        const timeUntil = startTime ? getTimeUntil(startTime) : '';

        return `
        <div class="alert-card upcoming-alert-card" data-alert-index="${index}" style="border-left-color: var(--delay-color); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
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
            <button class="preview-btn" onclick="event.stopPropagation(); previewUpcomingAlert('${alert.id}');" style="margin-top: 12px; padding: 8px 16px; background: linear-gradient(135deg, var(--delay-color), #d97706); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; transition: transform 0.2s, opacity 0.2s;">
                <i class="fas fa-eye"></i> Preview on Map
            </button>
        </div>
    `;
    }).join('');

    // Add hover effects
    document.querySelectorAll('.upcoming-alert-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
    });
}

// Preview state
let previewTimeout = null;
let previewInterval = null;

function previewUpcomingAlert(alertId) {
    const alert = upcomingAlerts.find(a => a.id == alertId); // loose equality for string/number mix
    if (!alert) return;

    // Close all panels to show map
    document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));

    // Clear any existing preview
    if (previewTimeout) {
        clearTimeout(previewTimeout);
        clearInterval(previewInterval);
    }

    // 1. Update Map
    while (alertsLayer.firstChild) {
        alertsLayer.removeChild(alertsLayer.firstChild);
    }

    // Draw the preview alert
    const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';
    if (alert.singleStation) {
        drawStationAlert(alert.line, alert.start, isDelay, true);
    } else {
        const flow = calculateFlow(alert.line, alert.start, alert.end, alert.direction);
        drawAlertPath(alert.line, alert.start, alert.end, flow, alert.shuttle, isDelay, true);
    }

    // 2. Visual Feedback (Status Indicator)
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');

    statusIndicator.className = 'status-indicator preview';

    // Add cancel button if not already present
    let cancelBtn = statusIndicator.querySelector('.preview-cancel-btn');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.className = 'preview-cancel-btn';
        cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
        cancelBtn.onclick = endPreview;
        statusIndicator.appendChild(cancelBtn);
    }
    cancelBtn.style.display = 'inline-flex';

    statusText.textContent = 'Previewing (5s)';

    // Start Countdown
    let timeLeft = 5;
    previewInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            statusText.textContent = `Previewing (${timeLeft}s)`;
        } else {
            clearInterval(previewInterval);
        }
    }, 1000);

    // 3. Auto-clear after 5 seconds
    previewTimeout = setTimeout(() => {
        endPreview();
    }, 5000);

    // Zoom to fit - DISABLED per user request
    // focusOnAlert(alert);
}

function endPreview() {
    if (previewTimeout) clearTimeout(previewTimeout);
    if (previewInterval) clearInterval(previewInterval);
    previewTimeout = null;
    previewInterval = null;

    // Restore Status
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');

    // Hide cancel button
    const cancelBtn = statusIndicator.querySelector('.preview-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    statusIndicator.classList.remove('preview');
    statusIndicator.classList.add('live');
    statusText.textContent = 'Live';

    // Restore Map
    renderAllAlerts();

    // Update map bounds/zoom if needed, but usually leaving it zoomed in is fine or user resets
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

function mergeOverlappingAlerts(alerts) {
    // Group alerts by line and station range
    const alertsByKey = {};

    alerts.forEach(alert => {
        if (alert.singleStation) {
            // Keep single station alerts as-is
            const key = `${alert.line}-single-${alert.start}`;
            if (!alertsByKey[key]) alertsByKey[key] = [];
            alertsByKey[key].push(alert);
        } else {
            // Group path alerts by line and normalized station range
            const stations = [alert.start, alert.end].sort();
            const key = `${alert.line}-${stations[0]}-${stations[1]}`;
            if (!alertsByKey[key]) alertsByKey[key] = [];
            alertsByKey[key].push(alert);
        }
    });

    // Merge alerts with same key but different directions
    const mergedAlerts = [];
    Object.values(alertsByKey).forEach(group => {
        if (group.length === 1) {
            mergedAlerts.push(group[0]);
        } else {
            // Check if we have different directions
            const directions = new Set(group.map(a => a.direction));
            if (directions.size > 1 || directions.has('Northbound') && directions.has('Southbound')) {
                // Merge into Both Ways
                const merged = { ...group[0], direction: 'Both Ways' };
                mergedAlerts.push(merged);
            } else {
                // Same direction, just take first
                mergedAlerts.push(group[0]);
            }
        }
    });

    return mergedAlerts;
}

function renderAllAlerts() {
    while (alertsLayer.firstChild) {
        alertsLayer.removeChild(alertsLayer.firstChild);
    }
    const mapActiveAlerts = activeAlerts.filter(alert => alert.status === 'active');
    const mergedAlerts = mergeOverlappingAlerts(mapActiveAlerts);

    mergedAlerts.forEach(alert => {
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

    const sortedAlerts = [...activeAlerts].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
    });

    listContainer.innerHTML = sortedAlerts.map(alert => {
        const isCleared = alert.status === 'cleared';
        const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';
        const isManualAlert = alert.id && alert.id.toString().startsWith('manual-');

        let borderColor = 'var(--alert-color)';
        if (isCleared) borderColor = 'var(--l2-color)';
        else if (isDelay) borderColor = 'var(--delay-color)';

        const bgOpacity = isCleared ? '0.5' : '1';

        return `
        <div class="alert-card" style="border-left-color: ${borderColor}; opacity: ${bgOpacity};">
            <div class="alert-card-header">
                <div class="alert-line-badge line-${alert.line}">${alert.line}</div>
                <div class="alert-title" style="flex: 1;">${alert.reason}</div>
                ${isCleared ? '<span style="color: var(--l2-color); font-size: 12px; margin-left: auto;">✓ Cleared</span>' : ''}
                ${isManualAlert ? `
                <button onclick="deleteManualAlert('${alert.id}')" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-left: 8px;">
                    <i class="fas fa-trash"></i> Delete
                </button>` : ''}
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
    const idx1 = lineObj.stations.findIndex(s => s.name === startName);
    const idx2 = lineObj.stations.findIndex(s => s.name === endName);

    // Line 1 is North-South
    if (line === '1') {
        const unionIdx = 21; const midIdx = (idx1 + idx2) / 2;
        if (midIdx < unionIdx) {
            if (direction === 'Northbound') return 'reverse'; if (direction === 'Southbound') return 'forward';
        } else {
            if (direction === 'Northbound') return 'forward'; if (direction === 'Southbound') return 'reverse';
        }
    }

    // Lines 2, 4, 5, 6 are East-West
    // For horizontal lines: lower index = west, higher index = east
    // Eastbound = going from west to east = forward (idx1 < idx2 natural order)
    // Westbound = going from east to west = reverse
    if (direction === 'Eastbound') return 'forward';
    if (direction === 'Westbound') return 'reverse';

    // Default fallback based on station order
    if (idx1 < idx2) return 'forward';
    return 'reverse';
}

function drawAlertPath(line, startName, endName, flow, isShuttle, isDelay, isPreview = false) {
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return;
    const idx1 = lineObj.stations.findIndex(s => s.name === startName); const idx2 = lineObj.stations.findIndex(s => s.name === endName);
    if (idx1 === -1 || idx2 === -1) return;
    const segment = lineObj.stations.slice(Math.min(idx1, idx2), Math.max(idx1, idx2) + 1);
    const d = getPathFromStations(segment, line);

    if (isShuttle) {
        const shuttlePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        shuttlePath.setAttribute("d", d);
        shuttlePath.setAttribute("class", "shuttle-outline");
        if (isPreview) shuttlePath.classList.add("alert-preview");
        // Apply same animation class as alert for directional flows
        if (flow === 'both') shuttlePath.classList.add("pulse-solid");
        else if (flow === 'reverse') shuttlePath.classList.add("flow-reverse");
        else shuttlePath.classList.add("flow-forward");
        alertsLayer.appendChild(shuttlePath);
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d); path.setAttribute("class", "alert-base");
    if (isDelay) path.classList.add("delay");
    if (isPreview) path.classList.add("alert-preview");

    if (flow === 'both') path.classList.add("pulse-solid"); else if (flow === 'reverse') path.classList.add("flow-reverse"); else path.classList.add("flow-forward");
    alertsLayer.appendChild(path);
}

function drawStationAlert(line, stationName, isDelay, isPreview = false) {
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return;
    const s = lineObj.stations.find(st => st.name === stationName); if (!s) return;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", s.x); circle.setAttribute("cy", s.y); circle.setAttribute("r", 10); circle.setAttribute("class", "station-alert-glow");
    if (isDelay) circle.style.stroke = "var(--delay-color)";
    if (isDelay) circle.style.fill = "var(--delay-color)";
    if (isPreview) circle.classList.add("alert-preview");
    alertsLayer.appendChild(circle);
}

// ==========================================
// VANTA.JS ANIMATED BACKGROUND
// ==========================================
let vantaEffect = null;

function initVanta(theme) {
    const isLight = theme === 'light';
    const bg = isLight ? 0xe5e7eb : 0x0f1115;
    const color = isLight ? 0x374151 : 0xffffff;

    if (!vantaEffect) {
        if (typeof VANTA !== 'undefined') {
            vantaEffect = VANTA.NET({
                el: "#vanta-bg",
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                color: color,
                backgroundColor: bg,
                maxDistance: 25.00,
                spacing: 30.00,
                points: 8.0
            });
        }
    } else {
        vantaEffect.setOptions({
            color: color,
            backgroundColor: bg
        });
    }
}

// ==========================================
// THEME TOGGLE
// ==========================================
const themeBtn = document.getElementById('btn-theme');
const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;

function updateThemeIcon(theme) {
    if (!themeIcon) return;
    if (theme === 'light') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    updateThemeIcon(theme);
    initVanta(theme);
    localStorage.setItem('theme', theme);
}

// Initialize theme from localStorage or default to dark
let currentTheme = localStorage.getItem('theme') || 'dark';
setTheme(currentTheme);

// Theme toggle button click handler
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        // Rotate icon animation
        if (themeIcon) {
            themeIcon.style.transform = 'rotate(360deg)';
            setTimeout(() => { themeIcon.style.transform = 'none'; }, 500);
        }

        // Toggle theme
        if (document.body.classList.contains('light-mode')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    });
}

window.onload = initMap;

// === ADMIN MODE: Form Handling ===
function setupAdminForm() {
    const lineSelect = document.getElementById('line-select');
    const startSelect = document.getElementById('start-select');
    const endSelect = document.getElementById('end-select');
    const directionSelect = document.getElementById('direction-select');
    const form = document.getElementById('alert-form');

    if (!lineSelect || !form) {
        console.warn('Admin form elements not found');
        return;
    }

    // Direction options based on line orientation
    const northSouthOptions = `
        <option value="Both Ways">Both Ways</option>
        <option value="Northbound">Northbound</option>
        <option value="Southbound">Southbound</option>
    `;
    const eastWestOptions = `
        <option value="Both Ways">Both Ways</option>
        <option value="Eastbound">Eastbound</option>
        <option value="Westbound">Westbound</option>
    `;

    // Populate stations and update direction options when line changes
    lineSelect.addEventListener('change', () => {
        const lineId = lineSelect.value;
        const lineData = rawMapData.find(l => l.line === lineId);

        if (!lineData) {
            startSelect.innerHTML = '<option value="">Select Line First</option>';
            endSelect.innerHTML = '<option value="">Select Line First</option>';
            startSelect.disabled = true;
            endSelect.disabled = true;
            return;
        }

        const options = lineData.stations.map(s =>
            `<option value="${s.name}">${s.name}</option>`
        ).join('');

        startSelect.innerHTML = '<option value="">Select Station</option>' + options;
        endSelect.innerHTML = '<option value="">Select Station</option>' + options;
        startSelect.disabled = false;
        endSelect.disabled = false;

        // Update direction options based on line
        // Line 1 is North-South, Lines 2/4/5/6 are East-West
        if (lineId === '1') {
            directionSelect.innerHTML = northSouthOptions;
        } else {
            directionSelect.innerHTML = eastWestOptions;
        }
    });

    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const alert = {
            id: 'manual-' + manualAlertCounter++,
            line: lineSelect.value,
            start: startSelect.value,
            end: endSelect.value,
            direction: directionSelect.value,
            effect: document.getElementById('effect-select').value,
            reason: document.getElementById('reason-input').value || 'Test Alert',
            shuttle: document.getElementById('shuttle-check').checked,
            singleStation: startSelect.value === endSelect.value,
            status: 'active',
            originalText: 'Manual test alert'
        };

        activeAlerts.push(alert);
        renderAllAlerts();
        renderAlertsList();
        // updateBadges(); // Disabled in testing mode

        // Reset form
        form.reset();
        startSelect.disabled = true;
        endSelect.disabled = true;

        // Close the create panel and go to map (lines view)
        switchTab('lines');

        // Close menu if open
        if (menuPanel && !menuPanel.classList.contains('hidden')) {
            toggleMenu();
        }

        // Zoom disabled for testing
        // zoomToAlert(alert);
    });
}

// Function to zoom to an alert on the map
function zoomToAlert(alert) {
    const lineObj = rawMapData.find(l => l.line === alert.line);
    if (!lineObj) return;

    const startStation = lineObj.stations.find(s => s.name === alert.start);
    const endStation = alert.end ? lineObj.stations.find(s => s.name === alert.end) : null;

    if (!startStation) return;

    let centerX, centerY;
    if (endStation && endStation.name !== startStation.name) {
        centerX = (startStation.x + endStation.x) / 2;
        centerY = (startStation.y + endStation.y) / 2;
    } else {
        centerX = startStation.x;
        centerY = startStation.y;
    }

    // Get viewport dimensions
    const viewportRect = viewport.getBoundingClientRect();
    const viewWidth = viewportRect.width;
    const viewHeight = viewportRect.height;

    // SVG viewBox is "-200 0 1400 800" 
    const viewBoxX = -200;
    const viewBoxWidth = 1400;
    const viewBoxHeight = 800;

    // Scale to zoom in on the alert
    const targetScale = 2;

    // Calculate pixel position relative to SVG coordinate system
    const scaleX = viewWidth / viewBoxWidth;
    const scaleY = viewHeight / viewBoxHeight;
    const scale = Math.min(scaleX, scaleY);

    // Center of viewport in SVG coordinates
    const svgCenterX = viewBoxX + viewBoxWidth / 2;
    const svgCenterY = viewBoxHeight / 2;

    // Offset to center the alert
    const offsetX = (svgCenterX - centerX) * scale * targetScale;
    const offsetY = (svgCenterY - centerY) * scale * targetScale;

    if (typeof gsap !== 'undefined' && mapRoot) {
        gsap.to(mapRoot, {
            x: offsetX,
            y: offsetY,
            scale: targetScale,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => updateMapBounds()
        });
    }
}

// Function to delete a manual alert
function deleteManualAlert(id) {
    activeAlerts = activeAlerts.filter(a => a.id !== id);
    renderAllAlerts();
    renderAlertsList();
    // updateBadges(); // Disabled in testing mode
}
