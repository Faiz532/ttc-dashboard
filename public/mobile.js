/**
 * ============================================================================
 * TTC DASHBOARD - MOBILE MAP APPLICATION
 * ============================================================================
 * 
 * This is the main JavaScript file for the mobile version of the TTC
 * real-time subway alerts dashboard. It's optimized for touch devices with:
 * 
 * 1. TOUCH-OPTIMIZED MAP - Smooth drag and pinch-to-zoom on the subway map
 * 2. SWIPE-UP SHEETS - Bottom sheets for alerts that slide up from the footer
 * 3. MOBILE NAVIGATION - Bottom tab bar for switching between views
 * 4. RESPONSIVE LAYOUT - Fits well on phone screens
 * 
 * The map is built using SVG and animated with GSAP/Draggable.
 * Alert data is fetched from /api/data and rendered as animated paths.
 * 
 * KEY DIFFERENCES FROM DESKTOP:
 * - Bottom navigation bar instead of side menu
 * - Swipe-up sheets instead of side panels
 * - Larger touch targets for station markers
 * - Different initial zoom/pan to fit mobile viewport
 * 
 * KEY DEPENDENCIES:
 * - GSAP (GreenSock Animation Platform) for smooth animations
 * - Draggable (GSAP plugin) for map drag functionality
 * - VANTA.js for animated background
 * 
 * Author: Faiz Prasla
 * ============================================================================
 */

// ============================================================================
// STATE MANAGEMENT - Global variables tracking the app's current state
// ============================================================================

let activeTab = 'map';           // Current active tab: 'map', 'alerts', or 'upcoming'
let activeAlerts = [];           // Currently active subway alerts from the API
let upcomingAlerts = [];         // Future scheduled alerts
let mapDraggable = null;         // GSAP Draggable instance for map panning
let pollingInterval = null;      // Reference to the 60-second polling timer
let isSubwayCurrentlyClosed = false;  // True if subway is outside operating hours


// ============================================================================
// SUBWAY OPERATING HOURS (Toronto time)
// ============================================================================
// Mon-Sat: 6:00 AM - 2:00 AM (next day)
// Sunday: 8:00 AM - 2:00 AM (next day)
// During closed hours, we don't fetch data and show a "closed" message

/**
 * Check if the subway is currently closed based on Toronto time
 * @returns {boolean} - True if subway is closed
 */
function isSubwayClosed() {
    const now = new Date();
    // Convert to Toronto time
    const torontoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const hour = torontoTime.getHours();
    const day = torontoTime.getDay(); // 0 = Sunday

    // Closed hours: 2:00 AM - 6:00 AM (Mon-Sat), 2:00 AM - 8:00 AM (Sunday)
    if (day === 0) {
        // Sunday: closed from 2 AM to 8 AM
        return hour >= 2 && hour < 8;
    } else {
        // Monday-Saturday: closed from 2 AM to 6 AM
        return hour >= 2 && hour < 6;
    }
}

/**
 * Get the time when subway will reopen (for display)
 * @returns {string} - "6:00 AM" or "8:00 AM" depending on day
 */
function getNextOpenTime() {
    const now = new Date();
    const torontoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const day = torontoTime.getDay();

    if (day === 0) {
        return '8:00 AM';  // Sunday
    } else {
        return '6:00 AM';  // Monday-Saturday
    }
}


// ============================================================================
// MAP CONFIGURATION - Easy-to-adjust settings for map positioning
// ============================================================================

const MAP_CONFIG = {
    // Visual center point on the map (SVG coordinates)
    centerX: 430,            // Horizontal center of the map SVG
    centerY: 375,            // Vertical center of the map SVG

    // Offset to fine-tune screen position (pixels)
    offsetX: 200,            // Positive = shift right
    offsetY: 200,            // Positive = shift down

    // Zoom settings
    zoomMultiplier: 2.0,     // 1.0 = fit width, 2.0 = 2x zoom

    // UI element sizes
    bottomNavHeight: 100,    // Height of bottom navigation bar (pixels)
    boundsPadding: 1000      // Extra padding for pan bounds (pixels)
};


// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const mapRoot = document.getElementById('map-root');       // Root container for map transforms
const viewport = document.getElementById('map-viewport');  // Visible map area

// Bottom sheet panels (swipe up from navigation)
const sheets = {
    alerts: document.getElementById('sheet-alerts'),       // Active alerts sheet
    upcoming: document.getElementById('sheet-upcoming')    // Upcoming alerts sheet
};

// Notification badges that show counts
const badges = {
    active: document.getElementById('badge-active'),       // Badge on Alerts tab
    upcoming: document.getElementById('badge-upcoming')    // Badge on Upcoming tab
};


// ============================================================================
// SUBWAY MAP DATA - Station coordinates and metadata
// ============================================================================
// This is the same data structure as desktop, but may have different
// coordinates optimized for the mobile viewport.

const rawMapData = [
    {
        line: "5",
        stations: [
            { name: "Mount Dennis", x: 220, y: 380, interchange: true, accessible: true },
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
    },
    {
        line: "1",
        stations: [
            { name: "Vaughan Metropolitan Centre", x: 240, y: 50, accessible: true },
            { name: "Highway 407", x: 240, y: 80, accessible: true },
            { name: "Pioneer Village", x: 260, y: 110, accessible: true },
            { name: "York University", x: 280, y: 140, accessible: true },
            { name: "Finch West", x: 300, y: 170, accessible: true },
            { name: "Downsview Park", x: 320, y: 200, accessible: true },
            { name: "Sheppard West", x: 340, y: 230, accessible: true },
            { name: "Wilson", x: 360, y: 260, accessible: true },
            { name: "Yorkdale", x: 360, y: 290, accessible: true },
            { name: "Lawrence West", x: 360, y: 320, accessible: true },
            { name: "Glencairn", x: 360, y: 350, accessible: true },
            { name: "Cedarvale", x: 360, y: 380, interchange: true, accessible: true },
            { name: "St Clair West", x: 360, y: 410, accessible: true },
            { name: "Dupont", x: 360, y: 440, accessible: true },
            { name: "Spadina", x: 360, y: 480, interchange: true, accessible: false }, // Offset -20px
            { name: "St George", x: 400, y: 480, interchange: true, accessible: true }, // Offset -20px
            { name: "Museum", x: 400, y: 550, accessible: false },
            { name: "Queen's Park", x: 400, y: 580, accessible: true },
            { name: "St Patrick", x: 400, y: 610, accessible: true },
            { name: "Osgoode", x: 400, y: 640, accessible: true },
            { name: "St Andrew", x: 400, y: 670, accessible: true },
            { name: "Union", x: 520, y: 700, accessible: true },
            { name: "King", x: 640, y: 670, accessible: false },
            { name: "Queen", x: 640, y: 640, accessible: true },
            { name: "Dundas", displayName: "TMU", x: 640, y: 610, accessible: true },
            { name: "College", x: 640, y: 580, accessible: false },
            { name: "Wellesley", x: 640, y: 550, accessible: true },
            { name: "Bloor-Yonge", x: 640, y: 500, interchange: true, accessible: true },
            { name: "Rosedale", x: 640, y: 475, accessible: true },
            { name: "Summerhill", x: 640, y: 455, accessible: true },
            { name: "St Clair", x: 640, y: 430, accessible: true },
            { name: "Davisville", x: 640, y: 405, accessible: true },
            { name: "Eglinton", x: 640, y: 380, interchange: true, accessible: true },
            { name: "Lawrence", x: 640, y: 340, accessible: true },
            { name: "York Mills", x: 640, y: 280, accessible: true },
            { name: "Sheppard-Yonge", x: 640, y: 200, interchange: true, accessible: true },
            { name: "North York Centre", x: 640, y: 150, accessible: true },
            { name: "Finch", x: 640, y: 100, accessible: true }
        ]
    },
    {
        line: "2",
        stations: [
            { name: "Kipling", x: 30, y: 500, accessible: true },
            { name: "Islington", x: 53, y: 500, accessible: false },
            { name: "Royal York", x: 76, y: 500, accessible: true },
            { name: "Old Mill", x: 99, y: 500, accessible: false },
            { name: "Jane", x: 122, y: 500, accessible: true },
            { name: "Runnymede", x: 145, y: 500, accessible: true },
            { name: "High Park", x: 168, y: 500, accessible: true },
            { name: "Keele", x: 191, y: 500, accessible: true },
            { name: "Dundas West", x: 214, y: 500, accessible: true },
            { name: "Lansdowne", x: 237, y: 500, accessible: true },
            { name: "Dufferin", x: 260, y: 500, accessible: true },
            { name: "Ossington", x: 283, y: 500, accessible: true },
            { name: "Christie", x: 306, y: 500, accessible: true },
            { name: "Bathurst", x: 329, y: 500, accessible: true },
            { name: "Spadina", x: 360, y: 500, interchange: true, accessible: true },
            { name: "St George", x: 400, y: 500, interchange: true, accessible: true },
            { name: "Bay", x: 520, y: 500, accessible: true },
            { name: "Bloor-Yonge", x: 640, y: 500, interchange: true, accessible: true },
            { name: "Sherbourne", x: 670, y: 500, accessible: true },
            { name: "Castle Frank", x: 695, y: 500, accessible: true },
            { name: "Broadview", x: 720, y: 500, accessible: true },
            { name: "Chester", x: 745, y: 500, accessible: true },
            { name: "Pape", x: 770, y: 500, accessible: true },
            { name: "Donlands", x: 795, y: 500, accessible: true },
            { name: "Greenwood", x: 820, y: 500, accessible: false },
            { name: "Coxwell", x: 845, y: 500, accessible: true },
            { name: "Woodbine", x: 870, y: 500, accessible: true },
            { name: "Main Street", x: 895, y: 500, accessible: true }, // Pivot point
            { name: "Victoria Park", x: 920, y: 460, accessible: true }, // Diagonal start
            { name: "Warden", x: 945, y: 420, accessible: true },
            { name: "Kennedy", x: 970, y: 380, accessible: true }
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
    }
];


// --- Initialization ---

function init() {
    console.log("MOBILE INIT STARTED");

    renderMap();
    setupDragAndZoom(); // Now handles all dragging setup including initial positioning
    setupPinchZoom();
    setupSheetGestures();

    // Check subway status and start polling
    checkSubwayStatusAndFetch();
    pollingInterval = setInterval(checkSubwayStatusAndFetch, 60000);

    console.log("MOBILE INIT FINISHED");
}

function checkSubwayStatusAndFetch() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator ? statusIndicator.querySelector('.status-text') : null;

    if (isSubwayClosed()) {
        // Subway is closed - don't make API calls
        isSubwayCurrentlyClosed = true;
        if (statusIndicator) {
            statusIndicator.classList.remove('live', 'loading');
            statusIndicator.classList.add('closed');
        }
        if (statusText) {
            statusText.textContent = `Closed until ${getNextOpenTime()}`;
        }

        // Clear any existing alerts from the map
        const alertsLayer = document.getElementById('alerts-layer');
        if (alertsLayer) alertsLayer.innerHTML = '';
        activeAlerts = [];
        upcomingAlerts = [];
        updateAlertsList([]);
        updateUpcomingList([]);

        console.log('Subway closed - skipping API call');
    } else {
        // Subway is open - fetch data
        if (isSubwayCurrentlyClosed) {
            // Just reopened - reset status
            isSubwayCurrentlyClosed = false;
            console.log('Subway reopened - resuming API calls');
        }
        fetchData();
    }
}

// Recenter Button - animate back to initial fit
document.getElementById('btn-recenter').addEventListener('click', () => {
    const viewWidth = viewport.clientWidth;
    const viewHeight = viewport.clientHeight;

    const availableHeight = viewHeight - MAP_CONFIG.bottomNavHeight;
    const newScale = (viewWidth / 1000) * MAP_CONFIG.zoomMultiplier;

    const screenCenterX = viewWidth / 2;
    const screenCenterY = availableHeight / 2;

    const newX = screenCenterX - (MAP_CONFIG.centerX * newScale) + MAP_CONFIG.offsetX;
    const newY = screenCenterY - (MAP_CONFIG.centerY * newScale) + MAP_CONFIG.offsetY;

    gsap.to(mapRoot, {
        x: newX,
        y: newY,
        scale: newScale,
        duration: 0.6,
        ease: "power2.out",
        force3D: false,
        onComplete: () => {
            currentScale = newScale;
            currentX = newX;
            currentY = newY;
            updateMapBounds();
        }
    });
});
console.log("Events Attached");

// --- Navigation Logic ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tab) {
    // Update Icons
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-tab="${tab}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Handle Sheets
    Object.values(sheets).forEach(s => s.classList.remove('active'));
    if (tab === 'alerts' || tab === 'upcoming') {
        if (sheets[tab]) {
            sheets[tab].classList.add('active');
            // Reset any random drag position
            gsap.set(sheets[tab], { clearProps: "transform" });
        }
    }

    activeTab = tab;
}

// --- Draggable Sheets Logic ---
function setupSheetGestures() {
    if (typeof Draggable === 'undefined') return;

    Object.values(sheets).forEach(sheet => {
        if (!sheet) return;
        Draggable.create(sheet, {
            type: "y",
            trigger: sheet.querySelector('.sheet-handle-area'),
            bounds: { minY: 0, maxY: window.innerHeight },
            inertia: true,
            zIndexBoost: false, // Prevent sheet from covering footer
            onDragEnd: function () {
                if (this.y > 80) {
                    // Dragged down enough -> Close
                    switchTab('map');
                    // Clear props to let CSS transition take over for hiding
                    gsap.set(this.target, { clearProps: "transform,zIndex" });
                } else {
                    // Snap back to open position
                    gsap.to(this.target, { y: 0, duration: 0.3, ease: "power2.out" });
                }
            }
        });
    });
}

// --- Map Rendering ---
function renderMap() {
    try {
        const tracks = document.getElementById('tracks-layer');
        const stations = document.getElementById('stations-layer');
        console.log("renderMap called. Data length:", rawMapData ? rawMapData.length : "UNDEFINED");

        // Render Tracks
        rawMapData.forEach(lineData => {
            console.log("Rendering line:", lineData.line);
            const d = getPathFromStations(lineData.stations, lineData.line);
            console.log("Path d:", d);

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", d);
            path.setAttribute("class", `track line-${lineData.line}`);
            tracks.appendChild(path);

            // Line 5 Hollow Effect (Inner Line)
            if (lineData.line === '5') {
                const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                innerPath.setAttribute("d", getPathFromStations(lineData.stations, lineData.line));
                innerPath.setAttribute("class", "line-5-inner");
                tracks.appendChild(innerPath);
            }
        });

        // Render Stations
        rawMapData.forEach(l => {
            l.stations.forEach((s, i) => {
                // Skip Spadina standard rendering (handled by drawSpadinaTransfer)
                if (s.name === 'Spadina') return;
                // Skip St George on Line 1
                if (s.name === 'St George' && l.line === '1') return;
                // Skip Kennedy on Line 5
                if (s.name === 'Kennedy' && l.line === '5') return;
                // Skip Kennedy on Line 2
                if (s.name === 'Kennedy' && l.line === '2') return;
                // Skip Finch West on Line 1 (use Line 6 interchange marker)
                if (s.name === 'Finch West' && l.line === '1') return;

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("transform", `translate(${s.x}, ${s.y})`);

                // Markers - Standard Logic for all (Terminals use standard markers now)
                if (s.interchange) {
                    const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g"); gIcon.setAttribute("class", "station-marker");
                    const sticker = document.createElementNS("http://www.w3.org/2000/svg", "circle"); sticker.setAttribute("r", 13); sticker.setAttribute("fill", "white"); gIcon.appendChild(sticker);
                    const blackRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); blackRing.setAttribute("r", 11); blackRing.setAttribute("fill", "black"); gIcon.appendChild(blackRing);
                    const whiteGap = document.createElementNS("http://www.w3.org/2000/svg", "circle"); whiteGap.setAttribute("r", 7.5); whiteGap.setAttribute("fill", "white"); gIcon.appendChild(whiteGap);
                    const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle"); blueBtn.setAttribute("r", 6); blueBtn.setAttribute("fill", "#528CCB"); gIcon.appendChild(blueBtn);
                    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z"); iconPath.setAttribute("fill", "white"); iconPath.setAttribute("transform", "translate(-4.8, -4.8) scale(0.6)"); gIcon.appendChild(iconPath);
                    g.appendChild(gIcon);
                } else if (s.accessible) {
                    const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    const outerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); outerRing.setAttribute("r", "7"); outerRing.setAttribute("fill", "black"); gIcon.appendChild(outerRing);
                    const midRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); midRing.setAttribute("r", "5.5"); midRing.setAttribute("fill", "white"); gIcon.appendChild(midRing);
                    const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); innerCircle.setAttribute("r", "5"); innerCircle.setAttribute("fill", "#528CCB"); gIcon.appendChild(innerCircle);
                    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z"); iconPath.setAttribute("fill", "white"); iconPath.setAttribute("transform", "translate(-3, -3) scale(0.4)"); gIcon.appendChild(iconPath);
                    g.appendChild(gIcon);
                } else {
                    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    c.setAttribute("r", 5.5); c.setAttribute("fill", "white");
                    c.setAttribute("stroke", "black"); c.setAttribute("stroke-width", "1.5");
                    g.appendChild(c);
                }

                // Detached Terminal Badges (Line Number to the side)
                if (i === 0 || i === l.stations.length - 1) {
                    const badgeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    let bdx = 0, bdy = 0;

                    // Positioning Logic
                    // Positioning Logic
                    if (s.name === "Mount Dennis") {
                        bdx = -150; // 10px more left
                    } else if (s.name === "Humber College") {
                        bdx = -30; // Left side
                    } else if (s.name === "Sheppard-Yonge") {
                        bdx = -140; // Far left for long name
                    } else if (s.name === "Kipling") {
                        bdx = -105; // Special horizontal layout
                    } else if (s.name === "Kennedy") {
                        bdx = 100; bdy = -10; // Detached from track, to the right
                    } else if (s.name === "Don Mills") {
                        bdx = 120; // Far right, detached from track
                    } else if (s.name === "Finch West" && l.line !== '6') {
                        bdx = 30; // Right side
                    } else if (s.name === "Vaughan Metropolitan Centre" || s.name === "Finch") {
                        bdx = 0; bdy = -35; // Top side
                    }

                    // Specific adjustments
                    if (s.name === "Humber College") { bdx = 0; bdy = 35; } // Badge below station (tip of line)
                    if (s.name === "Finch West" && l.line === '6') { bdx = 122; bdy = -2; } // Pixel perfect adjustment (incremental)

                    badgeG.setAttribute("transform", `translate(${bdx}, ${bdy})`);

                    const badgeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    badgeCircle.setAttribute("r", 12);
                    badgeCircle.setAttribute("fill", getLineColor(l.line));
                    badgeCircle.setAttribute("stroke", "white");
                    badgeCircle.setAttribute("stroke-width", 2);
                    badgeG.appendChild(badgeCircle);

                    const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    badgeText.textContent = l.line;
                    badgeText.setAttribute("class", "terminal-text");
                    badgeText.setAttribute("fill", l.line === '1' ? 'black' : 'white');
                    badgeText.setAttribute("dy", 1);
                    badgeText.setAttribute("text-anchor", "middle");
                    badgeText.setAttribute("dominant-baseline", "middle");
                    badgeG.appendChild(badgeText);

                    g.appendChild(badgeG);
                }


                // Labels - Restoring comprehensive logic
                // Labels - Prevent duplicates at interchanges
                // Skip Line 4 Sheppard-Yonge (use Line 1)
                // Skip Line 1 Spadina, St George, Bloor-Yonge (use Line 2 rotated)
                // Skip Line 6 Finch West (use Line 1)
                const sName = s.name.trim(); // Sanitize name
                const isDup = (l.line === '4' && sName === "Sheppard-Yonge") ||
                    (l.line === '1' && ["Spadina", "St George", "Bloor-Yonge"].includes(sName));

                if (!isDup) {
                    // Use displayName if available, otherwise use name
                    const labelName = s.displayName || sName;
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.textContent = labelName;
                    if (i === 0 || i === l.stations.length - 1 || sName === "Finch West" || sName === "St George" || sName === "Spadina") {
                        text.setAttribute("class", "station-label terminal-label");
                    } else {
                        text.setAttribute("class", "station-label");
                    }

                    let tx = 15, ty = 5, rot = 0, anchor = "start";

                    // Custom adjustments for specific lines and layout areas
                    if (l.line === '1') {
                        if (s.name === "Union") { tx = 0; ty = 28; anchor = "middle"; }
                        else if (s.name === "St Andrew" || s.name === "Wellesley" || s.name === "Sheppard-Yonge") { tx = -15; ty = 5; anchor = "end"; }
                        else if (s.name === "Downsview Park" || s.name === "Sheppard West" || s.name === "Finch West" || s.name === "Vaughan Metropolitan Centre" || s.name === "Highway 407" || s.name === "Pioneer Village" || s.name === "York University") { tx = 15; ty = 5; anchor = "start"; }  // Right of track
                        else if (s.x < 360) { tx = -15; ty = 5; anchor = "end"; } // West side of U
                        else if (s.x >= 640 && s.y < 500) { tx = 15; ty = 5; anchor = "start"; } // East side of U
                    } else if (l.line === '2') {
                        // Rotate Line 2 labels to avoid track collision
                        if (s.name === 'Kipling') {
                            rot = 0; tx = -25; ty = 5; anchor = "end";
                        } else if (sName === 'St George') {
                            rot = 0; tx = 15; ty = -17; anchor = "start"; // 3px Down adjustment
                        } else if (sName === 'Spadina') {
                            rot = 45; tx = -28; ty = -10; anchor = "end"; // Bold & shifted left more
                            text.setAttribute("data-debug", "spadina-hit-clean");
                        } else {
                            rot = 45; tx = 10; ty = 10; anchor = "start";
                        }
                    } else if (l.line === '4') {
                        // Line 4 stations - labels above the track
                        if (s.name === 'Don Mills') {
                            rot = 0; tx = 20; ty = 5; anchor = "start"; // Horizontal, to the right
                            text.setAttribute("class", "station-label terminal-label"); // Bold
                        } else {
                            tx = 0; ty = -15; anchor = "middle";
                        }
                    } else if (l.line === '5') {
                        // Line 5 stations - labels above the track
                        if (s.name === 'Mount Dennis') {
                            rot = 0; tx = -20; ty = 5; anchor = "end"; // 15px more right
                        } else {
                            rot = -45; tx = 0; ty = -15; anchor = "end";
                        }
                    } else if (l.line === '6') {
                        // Line 6 stations - label positioning
                        if (s.name === "Humber College") {
                            rot = 0; tx = 25; ty = 5; anchor = "start";  // Humber College: Name on Right, Badge Bottom
                        } else if (sName === "Finch West") {
                            rot = 0; tx = 20; ty = 5; anchor = "start"; // Finch West: Name on Right
                        } else {
                            // Stations to show on TOP (above track)
                            const topStations = ["Westmore", "Martin Grove", "Albion", "Stevenson", "Mount Olive", "Rowntree Mills", "Pearldale", "Duncanwoods"];

                            if (topStations.includes(s.name)) {
                                rot = -45; tx = 10; ty = -5; anchor = "start"; // Above track, angled up
                            } else {
                                rot = 45; tx = 10; ty = 10; anchor = "start"; // Others (Start from Milvan Rumike): Below track
                            }
                        }
                    }

                    // Line 4 diagonal (except Don Mills which is horizontal)
                    if ((l.line === '4' && s.name !== 'Don Mills') || (l.line === '1' && s.y > 680 && s.name !== 'Union')) {
                        // No diagonal rotation for Line 1 bottom curve usually, but Line 4 needs it
                        if (l.line === '4' && s.name !== 'Don Mills') { rot = 45; tx = 10; ty = 10; anchor = "start"; }
                    }

                    text.setAttribute("text-anchor", anchor);
                    if (rot !== 0) text.setAttribute("transform", `rotate(${rot}) translate(${tx}, ${ty})`);
                    else text.setAttribute("transform", `translate(${tx}, ${ty})`);

                    // Group text in a g to handle position relative to station g
                    const tg = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    tg.appendChild(text);
                    g.appendChild(tg);
                }

                stations.appendChild(g);
            });
        });
        drawSpadinaTransfer();
        drawKennedy();
    } catch (e) { console.error("renderMap Error:", e); }
}

function drawSpadinaTransfer() {
    // Spadina: Line 1 (Yellow) is at y=480, Line 2 (Green) is at y=500. x=360.
    // We want a vertical pill connecting them.
    const x = 360;
    const y1 = 480; // Line 1
    const y2 = 500; // Line 2

    const pillGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    pillGroup.setAttribute("class", "station-marker spadina-transfer");

    // 1. The Pill Container (White stroke, Black fill) - Smaller to fit tracks
    const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const w = 24;   // Reduced from 32
    const h = 40;   // Reduced from 52
    pill.setAttribute("x", x - w / 2);
    pill.setAttribute("y", y1 - 12);  // Extended upwards by 4px
    pill.setAttribute("width", w);
    pill.setAttribute("height", h);
    pill.setAttribute("rx", w / 2); // Full rounded
    pill.setAttribute("fill", "black");
    pill.setAttribute("stroke", "white");
    pill.setAttribute("stroke-width", "3");
    pillGroup.appendChild(pill);

    // 2. Vertical White Connector Line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "white");
    line.setAttribute("stroke-width", "4");
    pillGroup.appendChild(line);

    // 3. Top Circle (White filled - Line 1) - Smaller to match pill
    const topCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    topCircle.setAttribute("cx", x);
    topCircle.setAttribute("cy", y1);
    topCircle.setAttribute("r", 7);  // Reduced from 9
    topCircle.setAttribute("fill", "white");
    pillGroup.appendChild(topCircle);

    // 4. Bottom Circle (Blue Access Icon - Line 2)
    const bottomGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bottomGroup.setAttribute("transform", `translate(${x}, ${y2 - 2})`);  // Moved up 2px more

    // Access icon background (Blue circle) - with white border
    const blueBtn = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    blueBtn.setAttribute("r", 6);  // Reduced from 8
    blueBtn.setAttribute("fill", "#528CCB");
    blueBtn.setAttribute("stroke", "white");
    blueBtn.setAttribute("stroke-width", "2");
    bottomGroup.appendChild(blueBtn);

    // Access Icon Path (White) - LARGER
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z");
    iconPath.setAttribute("fill", "white");
    iconPath.setAttribute("transform", "translate(-3.5, -4.5) scale(0.45)");  // Moved 1px right
    bottomGroup.appendChild(iconPath);

    pillGroup.appendChild(bottomGroup);

    // Spadina Label (Top Left) - Bold and shifted left
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "Spadina";
    text.setAttribute("class", "station-label terminal-label");
    text.setAttribute("transform", `translate(${x - 25}, ${y1 + 4})`);
    text.setAttribute("text-anchor", "end");

    document.getElementById('stations-layer').appendChild(pillGroup);
    document.getElementById('stations-layer').appendChild(text);
}

function drawKennedy() {
    // Kennedy Custom Rendering
    // Position: 970, 380 (Same as desktop)
    const x = 970;
    const y = 380;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${x}, ${y})`);

    // 0. Station marker (accessible - 1.5px border thickness)
    const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const outerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); outerRing.setAttribute("r", "7"); outerRing.setAttribute("fill", "black"); gIcon.appendChild(outerRing);
    const midRing = document.createElementNS("http://www.w3.org/2000/svg", "circle"); midRing.setAttribute("r", "5.5"); midRing.setAttribute("fill", "white"); gIcon.appendChild(midRing);
    const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); innerCircle.setAttribute("r", "5"); innerCircle.setAttribute("fill", "#528CCB"); gIcon.appendChild(innerCircle);
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); iconPath.setAttribute("d", "M12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-.663 2.146a1.5 1.5 0 0 0-.47-2.115l-2.5-1.508a1.5 1.5 0 0 0-1.676.086l-2.329 1.75a.866.866 0 0 0 1.051 1.375L7.361 3.37l.922.71-2.038 2.445A4.73 4.73 0 0 0 2.628 7.67l1.064 1.065a3.25 3.25 0 0 1 4.574 4.574l1.064 1.063a4.73 4.73 0 0 0 1.09-3.998l1.043-.292-.187 2.991a.872.872 0 1 0 1.741.098l.206-4.121A1 1 0 0 0 12.224 8h-2.79zM3.023 9.48a3.25 3.25 0 0 0 4.496 4.496l1.077 1.077a4.75 4.75 0 0 1-6.65-6.65z"); iconPath.setAttribute("fill", "white"); iconPath.setAttribute("transform", "translate(-3, -3) scale(0.4)"); gIcon.appendChild(iconPath);
    g.appendChild(gIcon);

    // 1. Label "Kennedy" (To the right, bold)
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "Kennedy";
    text.setAttribute("class", "station-label terminal-label");
    text.setAttribute("text-anchor", "start");
    text.setAttribute("x", 20);
    text.setAttribute("y", 5);
    g.appendChild(text);

    // 2. Green Marker (2) - Detached from track, to the right
    const g2 = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g2.setAttribute("transform", "translate(120, 0)");
    const bubble2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bubble2.setAttribute("r", 14); bubble2.setAttribute("fill", getLineColor('2')); bubble2.setAttribute("stroke", "white"); bubble2.setAttribute("stroke-width", "3");
    const num2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    num2.textContent = "2"; num2.setAttribute("class", "terminal-text"); num2.setAttribute("fill", "white"); num2.setAttribute("dy", 1);
    num2.setAttribute("text-anchor", "middle");
    num2.setAttribute("dominant-baseline", "middle");
    g2.appendChild(bubble2); g2.appendChild(num2);
    g.appendChild(g2);

    // 3. Orange Marker (5) - To the right of Line 2 badge
    const g5 = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g5.setAttribute("transform", "translate(155, 0)");
    const bubble5 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bubble5.setAttribute("r", 14); bubble5.setAttribute("fill", getLineColor('5')); bubble5.setAttribute("stroke", "white"); bubble5.setAttribute("stroke-width", "3");
    const num5 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    num5.textContent = "5"; num5.setAttribute("class", "terminal-text"); num5.setAttribute("fill", "white"); num5.setAttribute("dy", 1);
    num5.setAttribute("text-anchor", "middle");
    num5.setAttribute("dominant-baseline", "middle");
    g5.appendChild(bubble5); g5.appendChild(num5);
    g.appendChild(g5);

    document.getElementById('stations-layer').appendChild(g);
}


// --- Path Logic (with Union Curve Fix) ---
function getPathFromStations(stations, lineId) {
    let d = "";
    for (let i = 0; i < stations.length; i++) {
        const s = stations[i];
        if (i === 0) { d += `M ${s.x} ${s.y} `; continue; }

        // Curve Logic
        if (lineId === '1') {
            if (s.name === 'Union') {
                // Curve into Union from St Andrew
                d += `Q 400 700, 520 700 `;
                continue;
            }
            if (s.name === 'King') {
                // Curve out of Union to King
                d += `Q 640 700, 640 670 `;
                continue;
            }
            if (s.name === 'St George') {
                const prev = stations[i - 1];
                if (prev && prev.name === 'Spadina') {
                    // Spadina (360, 480) -> St George (400, 480)
                    // Stop short and curve down towards Museum (400, 550)
                    d += `L 385 480 Q 400 480, 400 495 `;
                    continue;
                }
            }
        }
        if (lineId === '6') {
            if (s.name === 'Westmore') {
                // Curve from Humber College (y=200) up to Westmore (y=170)
                // Humber is at -125, 200. Westmore is at -100, 170.
                // Draw vertical line up to 185, then curve right
                d += `L -125 185 Q -125 170, -110 170 `;
                // Then continue to Westmore L
                d += `L ${s.x} ${s.y} `;
                continue;
            }
        }
        d += `L ${s.x} ${s.y} `;
    }
    return d;
}

function getLineColor(id) {
    if (id === '1') return '#FFC425';
    if (id === '2') return '#009639';
    if (id === '4') return '#B11D8C';
    if (id === '5') return '#F37021';
    if (id === '6') return '#9ca3af';  // Finch West LRT - Grey
    return 'white';
}


// --- Data Fetching ---
async function fetchData() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');

    // Show loading state if we don't have data yet
    if (!activeAlerts || activeAlerts.length === 0) {
        statusIndicator.classList.remove('live', 'error');
        statusIndicator.classList.add('loading');
        statusText.textContent = 'Loading...';
    }

    try {
        const res = await fetch(`/api/data?t=${Date.now()}`);

        const data = await res.json();

        // If server returns null (initializing), keep loading and retry
        if (data.alerts === null) {
            console.log("Server initializing... retrying in 1s");
            setTimeout(fetchData, 1000);
            return;
        }

        // Update Active Alerts
        activeAlerts = data.alerts || [];

        // Update Upcoming Alerts
        upcomingAlerts = data.upcoming || [];

        // Render everything
        renderAlertsOnMap();
        renderLists();
        updateBadges();

        // Set live state after successful fetch
        statusIndicator.classList.remove('loading', 'error');
        statusIndicator.classList.add('live');
        statusText.textContent = 'Live';
    } catch (e) {
        console.warn("Fetch error", e);

        statusIndicator.classList.remove('loading', 'live');
        statusIndicator.classList.add('error');
        statusText.textContent = 'Error';
        // Retry in 5s
        setTimeout(fetchData, 5000);
    }
}

// Theme & Vanta Logic
let vantaEffect = null;
const themeBtn = document.getElementById('btn-theme');
const themeIcon = themeBtn.querySelector('i');

function updateVanta(theme) {
    const isLight = theme === 'light';
    // Dark Mode: Greyish Black (#0F1014 / 0x0F1014)
    const bg = isLight ? 0xd4d4d8 : 0x0F1014;
    const color = isLight ? 0x000000 : 0xffffff;

    if (!vantaEffect) {
        if (window.VANTA) {
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

function updateThemeIcon(theme) {
    if (theme === 'light') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

// Initialize Theme
let currentTheme = localStorage.getItem('theme') || 'dark';
if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
}
updateThemeIcon(currentTheme);
updateVanta(currentTheme);

// Theme Button Click Handler with Animation
themeBtn.addEventListener('click', () => {
    // Rotate icon animation
    themeIcon.style.transform = 'rotate(360deg)';
    setTimeout(() => { themeIcon.style.transform = 'none'; }, 500);

    if (document.body.classList.contains('light-mode')) {
        // Switch to Dark
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        updateVanta('dark');
        updateThemeIcon('dark');
    } else {
        // Switch to Light
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        updateVanta('light');
        updateThemeIcon('light');
    }
});

// Layer toggle states
let showOutages = true;
let showDelays = true;

function renderAlertsOnMap() {
    const layer = document.getElementById('alerts-layer');
    layer.innerHTML = '';

    // Only render active alerts on the map
    let mapActiveAlerts = activeAlerts.filter(alert => alert.status === 'active');

    // Filter by toggle states
    mapActiveAlerts = mapActiveAlerts.filter(alert => {
        const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';
        if (isDelay && !showDelays) return false;
        if (!isDelay && !showOutages) return false;
        return true;
    });

    // Merge overlapping
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

// Layer button toggle
document.getElementById('btn-legend').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent document click from firing
    document.getElementById('layer-popup').classList.toggle('hidden');
    document.getElementById('btn-legend').classList.toggle('active');
    // Close info popup if open
    document.getElementById('info-popup').classList.add('hidden');
    document.getElementById('btn-info').classList.remove('active');
});

// Info button toggle
document.getElementById('btn-info').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('info-popup').classList.toggle('hidden');
    document.getElementById('btn-info').classList.toggle('active');
    // Close layer popup if open
    document.getElementById('layer-popup').classList.add('hidden');
    document.getElementById('btn-legend').classList.remove('active');
});

// Close popup when clicking outside
document.addEventListener('click', (e) => {
    const layerPopup = document.getElementById('layer-popup');
    const infoPopup = document.getElementById('info-popup');
    const legendBtn = document.getElementById('btn-legend');
    const infoBtn = document.getElementById('btn-info');

    // Close Layer Popup
    if (!layerPopup.classList.contains('hidden') && !layerPopup.contains(e.target) && !legendBtn.contains(e.target)) {
        layerPopup.classList.add('hidden');
        legendBtn.classList.remove('active');
    }

    // Close Info Popup
    if (!infoPopup.classList.contains('hidden') && !infoPopup.contains(e.target) && !infoBtn.contains(e.target)) {
        infoPopup.classList.add('hidden');
        infoBtn.classList.remove('active');
    }
});

// Prevent closing when clicking inside popups
document.getElementById('layer-popup').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('info-popup').addEventListener('click', (e) => e.stopPropagation());

// Layer toggle checkboxes
document.getElementById('toggle-outages').addEventListener('change', (e) => {
    showOutages = e.target.checked;
    renderAlertsOnMap();
});

document.getElementById('toggle-delays').addEventListener('change', (e) => {
    showDelays = e.target.checked;
    renderAlertsOnMap();
});

// Clock Logic
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    document.querySelector('.clock-time').textContent = timeStr;
    document.querySelector('.clock-date').textContent = dateStr;
}

setInterval(updateClock, 1000);
updateClock(); // Initial call

// Helper to find station index with fuzzy matching
function findStationIndex(lineObj, name) {
    if (!name) return -1;
    const clean = name.toLowerCase().replace(/ station/g, '').replace(/\./g, '').trim();
    // Try exact match first for speed
    let idx = lineObj.stations.findIndex(s => s.name === name);
    if (idx !== -1) return idx;
    // Fuzzy match
    return lineObj.stations.findIndex(s => {
        const sClean = s.name.toLowerCase().replace(/\./g, '').trim();
        return sClean === clean;
    });
}

function mergeOverlappingAlerts(alerts) {
    const pointAlerts = alerts.filter(a => a.singleStation);
    const pathAlerts = alerts.filter(a => !a.singleStation);

    const alertsByLine = {};
    pathAlerts.forEach(a => {
        if (!alertsByLine[a.line]) alertsByLine[a.line] = [];
        alertsByLine[a.line].push(a);
    });

    const mergedPathAlerts = [];

    Object.keys(alertsByLine).forEach(line => {
        const lineVal = rawMapData.find(l => l.line === line);
        if (!lineVal) return;

        const mapped = alertsByLine[line].map(a => {
            const idx1 = findStationIndex(lineVal, a.start);
            const idx2 = findStationIndex(lineVal, a.end);
            return {
                original: a,
                startIdx: Math.min(idx1, idx2),
                endIdx: Math.max(idx1, idx2),
                isDelay: (a.effect === 'SIGNIFICANT_DELAYS' || a.effect === 'REDUCED_SPEED'),
                isShuttle: !!a.shuttle,
                direction: a.direction
            };
        }).filter(item => item.startIdx !== -1 && item.endIdx !== -1);

        mapped.sort((a, b) => a.startIdx - b.startIdx);

        if (mapped.length === 0) return;

        const merged = [mapped[0]];
        for (let i = 1; i < mapped.length; i++) {
            const current = mapped[i];
            const last = merged[merged.length - 1];

            if (current.startIdx <= last.endIdx) {
                last.endIdx = Math.max(last.endIdx, current.endIdx);
                last.isDelay = last.isDelay && current.isDelay;
                last.isShuttle = last.isShuttle || current.isShuttle;
                if (last.direction !== current.direction) last.direction = 'Both Ways';
            } else {
                merged.push(current);
            }
        }

        merged.forEach(m => {
            mergedPathAlerts.push({
                line: line,
                start: lineVal.stations[m.startIdx].name,
                end: lineVal.stations[m.endIdx].name,
                direction: m.direction,
                shuttle: m.isShuttle,
                effect: m.isDelay ? 'SIGNIFICANT_DELAYS' : 'SUSPENSION',
                singleStation: false,
                reason: m.original.reason,
                originalText: m.original.originalText,
                id: m.original.id
            });
        });
    });

    return [...pointAlerts, ...mergedPathAlerts];
}

function calculateFlow(line, startName, endName, direction) {
    if (direction === 'Both Ways') return 'both';
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return 'forward';
    const idx1 = findStationIndex(lineObj, startName); const idx2 = findStationIndex(lineObj, endName);
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

function drawAlertPath(line, startName, endName, flow, isShuttle, isDelay, isPreview = false) {
    const layer = document.getElementById('alerts-layer');
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return;
    const idx1 = findStationIndex(lineObj, startName); const idx2 = findStationIndex(lineObj, endName);
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
        layer.appendChild(shuttlePath);
    }

    // Create Main Path (Foreground)
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d); path.setAttribute("class", "alert-base");
    if (isDelay) path.classList.add("delay");
    if (isPreview) path.classList.add("alert-preview");

    if (flow === 'both') path.classList.add("pulse-solid"); else if (flow === 'reverse') path.classList.add("flow-reverse"); else path.classList.add("flow-forward");
    layer.appendChild(path);
}

function drawStationAlert(line, stationName, isDelay, isPreview = false) {
    const layer = document.getElementById('alerts-layer');
    const lineObj = rawMapData.find(l => l.line === line); if (!lineObj) return;
    const idx = findStationIndex(lineObj, stationName);
    if (idx === -1) return;
    const s = lineObj.stations[idx];

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", s.x); circle.setAttribute("cy", s.y); circle.setAttribute("r", 10); circle.setAttribute("class", "station-alert-glow");
    if (isDelay) circle.style.stroke = "var(--delay-color)";
    if (isDelay) circle.style.fill = "var(--delay-color)";
    if (isPreview) circle.classList.add("alert-preview");
    layer.appendChild(circle);
}


let selectedAlertLine = 'all'; // Track current filter

function renderLists() {
    // Filter alerts by selected line
    const filteredAlerts = selectedAlertLine === 'all'
        ? activeAlerts
        : activeAlerts.filter(a => a.line === selectedAlertLine);

    // Merge overlapping/directional duplicates for cleaner list
    const mergedFilteredAlerts = mergeOverlappingAlerts(filteredAlerts);

    // Alerts List
    // Line 5 Coming Soon Notice (always shown at top)
    const line5Notice = `
                <div class="alert-card" style="border-left: 4px solid var(--l5-color); opacity: 0.9;">
                    <div class="alert-badge" style="background: var(--l5-color); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">5</div>
                    <div class="alert-info">
                        <div class="alert-title"><i class="fas fa-hard-hat" style="margin-right: 6px;"></i>Line 5 Eglinton - Coming Soon</div>
                        <div class="alert-desc">This line is not yet in service. Real-time tracking will be available once the line opens.</div>
                    </div>
                </div>`;

    const dynamicAlertsHtml = mergedFilteredAlerts.length
        ? mergedFilteredAlerts.map(a => createAlertCard(a)).join('')
        : '<div style="text-align:center; padding:20px; color:gray">No alerts for this line</div>';

    // Show Line 5 notice only when filter is 'all' or '5'
    const showLine5Notice = selectedAlertLine === 'all' || selectedAlertLine === '5';
    document.getElementById('alerts-list').innerHTML = (showLine5Notice ? line5Notice : '') + dynamicAlertsHtml;

    // Upcoming List
    const upcomingHtml = upcomingAlerts.length ? upcomingAlerts.map(a => createAlertCard(a, true)).join('') : '<div style="text-align:center; padding:20px; color:gray">No upcoming alerts</div>';
    document.getElementById('upcoming-list').innerHTML = upcomingHtml;
}

// Filter button click handlers
document.querySelectorAll('#alerts-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        document.querySelectorAll('#alerts-filter .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Update filter and re-render
        selectedAlertLine = btn.dataset.line;
        renderLists();
    });
});

function createAlertCard(a, isUpcoming = false) {
    const color = (a.effect === 'SIGNIFICANT_DELAYS') ? 'bg-l1' : 'bg-alert';
    // Simplified logic for demo color mapping
    const badgeClass = a.line === '1' ? 'bg-l1' : a.line === '2' ? 'bg-l2' : 'bg-l4';

    return `
            <div class="alert-card" onclick="${isUpcoming ? '' : `previewActiveAlert('${a.id}')`}" style="cursor: ${isUpcoming ? 'default' : 'pointer'};">
                <div class="alert-header">
                    <div class="line-badge ${badgeClass}">${a.line}</div>
                    <div style="font-weight:600; font-size:15px;">${a.reason}</div>
                </div>
                <div class="alert-body">
                    <div style="margin-bottom:6px; color:white; font-size:13px;">
                        ${a.singleStation ? `At ${a.start}` : `${a.start} ↔ ${a.end}`}
                    </div>
                    ${a.originalText}
                    ${a.shuttle ? '<div class="shuttle-tag"><i class="fas fa-bus"></i> Shuttle Bus</div>' : ''}
                    
                    ${isUpcoming ? `
                    <button class="preview-btn" onclick="previewUpcomingAlert('${a.id}')">
                        <i class="fas fa-eye"></i> Preview on Map
                    </button>
                    ` : ''}
                </div>
            </div>`;
}

function updateBadges() {
    const countActive = activeAlerts.length;
    const countFuture = upcomingAlerts.length;

    badges.active.innerText = countActive;
    badges.active.classList.toggle('hidden', countActive === 0);

    badges.upcoming.innerText = countFuture;
    badges.upcoming.classList.toggle('hidden', countFuture === 0);
}

// --- Interactions ---
let isPinching = false;
let currentScale = 1;
let currentX = 0;
let currentY = 0;

function setupDragAndZoom() {
    if (typeof gsap === 'undefined' || typeof Draggable === 'undefined') return;

    // ViewBox is -150 to 1150 = 1300 wide, 0 to 800 = 800 tall
    const MAP_WIDTH = 1300;
    const MAP_HEIGHT = 800;

    // Get viewport dimensions directly from element
    const viewWidth = viewport.clientWidth;
    const viewHeight = viewport.clientHeight;

    // Calculate available height and scale using config
    const availableHeight = viewHeight - MAP_CONFIG.bottomNavHeight;
    currentScale = (viewWidth / 1000) * MAP_CONFIG.zoomMultiplier;

    // Screen center point (accounting for bottom nav)
    const screenCenterX = viewWidth / 2;
    const screenCenterY = availableHeight / 2;

    // Position map using config values
    currentX = screenCenterX - (MAP_CONFIG.centerX * currentScale) + MAP_CONFIG.offsetX;
    currentY = screenCenterY - (MAP_CONFIG.centerY * currentScale) + MAP_CONFIG.offsetY;

    console.log('Map Config:', MAP_CONFIG);
    console.log('Centering:', { viewWidth, viewHeight, currentScale, currentX, currentY });

    gsap.set(mapRoot, {
        x: currentX,
        y: currentY,
        scale: currentScale,
        transformOrigin: "0 0",
        force3D: false
    });

    mapDraggable = Draggable.create(mapRoot, {
        type: "x,y",
        inertia: true,
        trigger: viewport,
        edgeResistance: 0.75,
        onDragStart: function () {
            if (isPinching) {
                this.endDrag();
                return;
            }
            updateMapBounds();
        },
        onDrag: function () {
            if (isPinching) {
                this.endDrag();
            }
        },
        onDragEnd: function () {
            currentX = gsap.getProperty(mapRoot, "x");
            currentY = gsap.getProperty(mapRoot, "y");
        }
    })[0];

    updateMapBounds();
    window.addEventListener('resize', () => {
        updateMapBounds();
    });
}

function setupPinchZoom() {
    let initialDistance = 0;
    let initialScale = 1;
    let initialX = 0;
    let initialY = 0;
    let pinchCenterX = 0;
    let pinchCenterY = 0;

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            if (mapDraggable) mapDraggable.disable();

            initialDistance = getDistance(e.touches[0], e.touches[1]);
            initialScale = currentScale;
            initialX = currentX;
            initialY = currentY;

            pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && isPinching) {
            e.preventDefault();

            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const scaleRatio = currentDistance / initialDistance;
            const newScale = Math.min(Math.max(0.3, initialScale * scaleRatio), 4);

            // Get current pinch center (tracks finger movement)
            const currentPinchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const currentPinchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            // Calculate position to zoom toward initial pinch center
            // The point under pinchCenter should stay under pinchCenter after zoom
            const newX = currentPinchX - (pinchCenterX - initialX) * (newScale / initialScale);
            const newY = currentPinchY - (pinchCenterY - initialY) * (newScale / initialScale);

            currentScale = newScale;
            currentX = newX;
            currentY = newY;

            gsap.set(mapRoot, {
                scale: newScale,
                x: newX,
                y: newY,
                force3D: false
            });
        }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
        if (e.touches.length < 2 && isPinching) {
            isPinching = false;
            if (mapDraggable) {
                mapDraggable.enable();
                updateMapBounds();
            }
        }
    });

    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

function getMapBounds(scale) {
    const viewWidth = viewport.clientWidth;
    const viewHeight = viewport.clientHeight;
    const mapWidth = 1300 * scale;
    const mapHeight = 800 * scale;

    // Custom Padding configuration as requested
    const PAD_TOP = 300;
    const PAD_BOTTOM = 0; // Reduced to 0
    const PAD_LEFT = 200;
    const PAD_RIGHT = -200; // Increased by 300 (from -500)

    let minX, maxX, minY, maxY;

    if (mapWidth <= viewWidth) {
        // Map fits in viewport - allow some wiggle room around center
        const centerX = (viewWidth - mapWidth) / 2;
        minX = centerX - PAD_RIGHT;
        maxX = centerX + PAD_LEFT;
    } else {
        // Map is larger than viewport
        // minX: dragging left (seeing right side) -> uses PAD_RIGHT
        minX = viewWidth - mapWidth - PAD_RIGHT;
        // maxX: dragging right (seeing left side) -> uses PAD_LEFT
        maxX = PAD_LEFT;
    }

    if (mapHeight <= viewHeight) {
        // Map fits in viewport
        const centerY = (viewHeight - mapHeight) / 2;
        minY = centerY - PAD_BOTTOM;
        maxY = centerY + PAD_TOP;
    } else {
        // Map is larger than viewport
        // minY: dragging up (seeing bottom) -> uses PAD_BOTTOM
        minY = viewHeight - mapHeight - PAD_BOTTOM;
        // maxY: dragging down (seeing top) -> uses PAD_TOP
        maxY = PAD_TOP;
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

// --- Preview Logic (Mobile) ---
let previewTimeout = null;
let previewInterval = null;

function previewUpcomingAlert(alertId) {
    const alert = upcomingAlerts.find(a => a.id == alertId);
    if (!alert) return;

    // 1. Close Panels (Switch to Map)
    switchTab('map');

    // 2. Clear Previous Preview
    if (previewTimeout) clearTimeout(previewTimeout);
    if (previewInterval) clearInterval(previewInterval);

    // 3. Draw Preview on Map
    const layer = document.getElementById('alerts-layer');
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';
    if (alert.singleStation) {
        drawStationAlert(alert.line, alert.start, isDelay, true);
    } else {
        const flow = calculateFlow(alert.line, alert.start, alert.end, alert.direction);
        drawAlertPath(alert.line, alert.start, alert.end, flow, alert.shuttle, isDelay, true);
    }

    // 4. Update Status Indicator to Amber Preview
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
        if (timeLeft > 0) statusText.textContent = `Previewing (${timeLeft}s)`;
        else clearInterval(previewInterval);
    }, 1000);

    // 5. Auto-Revert after 5s
    previewTimeout = setTimeout(endPreview, 5000);

    // 6. Zoom disabled per user request
    // focusOnAlert(alert);
}

function previewActiveAlert(alertId) {
    const alert = activeAlerts.find(a => a.id == alertId);
    if (!alert) return;

    // 1. Switch to Map tab
    switchTab('map');

    // 2. Clear Previous Preview
    if (previewTimeout) clearTimeout(previewTimeout);
    if (previewInterval) clearInterval(previewInterval);

    // 3. Draw only this alert on Map
    const layer = document.getElementById('alerts-layer');
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    const isDelay = alert.effect === 'SIGNIFICANT_DELAYS' || alert.effect === 'REDUCED_SPEED';
    if (alert.singleStation) {
        drawStationAlert(alert.line, alert.start, isDelay, true);
    } else {
        const flow = calculateFlow(alert.line, alert.start, alert.end, alert.direction);
        drawAlertPath(alert.line, alert.start, alert.end, flow, alert.shuttle, isDelay, true);
    }

    // 4. Update Status Indicator to show preview mode
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
        if (timeLeft > 0) statusText.textContent = `Previewing (${timeLeft}s)`;
        else clearInterval(previewInterval);
    }, 1000);

    // 5. Auto-Revert after 5s
    previewTimeout = setTimeout(endPreview, 5000);

    // 6. Zoom disabled per user request
    // focusOnAlert(alert);
}

function endPreview() {
    if (previewTimeout) clearTimeout(previewTimeout);
    if (previewInterval) clearInterval(previewInterval);
    previewTimeout = null;
    previewInterval = null;

    const statusIndicator = document.getElementById('status-indicator');

    // Hide cancel button
    const cancelBtn = statusIndicator.querySelector('.preview-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    statusIndicator.className = 'status-indicator live';
    statusIndicator.querySelector('.status-text').textContent = 'Live';

    // Redraw LIVE alerts
    fetchData();
}

function focusOnAlert(alert) {
    // Find station coordinates for the alert
    const lineObj = rawMapData.find(l => l.line === alert.line);
    if (!lineObj) return;

    const startStation = lineObj.stations.find(s => s.name === alert.start);
    const endStation = alert.end ? lineObj.stations.find(s => s.name === alert.end) : null;
    if (!startStation) return;

    // Calculate center point of the alert in SVG coordinates
    let alertCenterX, alertCenterY;
    if (endStation) {
        alertCenterX = (startStation.x + endStation.x) / 2;
        alertCenterY = (startStation.y + endStation.y) / 2;
    } else {
        alertCenterX = startStation.x;
        alertCenterY = startStation.y;
    }

    // Get viewport dimensions
    const viewWidth = viewport.clientWidth;
    const viewHeight = viewport.clientHeight;
    const availableHeight = viewHeight - MAP_CONFIG.bottomNavHeight;

    // Calculate zoom level (use same base as initial map scale, but 2x more)
    const baseScale = (viewWidth / 1000) * MAP_CONFIG.zoomMultiplier;
    const ZOOM = baseScale * 1.5; // 1.5x extra zoom for preview

    // Screen center coordinates
    const screenCenterX = viewWidth / 2;
    const screenCenterY = availableHeight / 2;

    // Target position: center the alert in the visible area
    // Simplified formula: screenCenter - (alertCenter * scale) + offset
    const targetX = screenCenterX - (alertCenterX * ZOOM) + MAP_CONFIG.offsetX;
    const targetY = screenCenterY - (alertCenterY * ZOOM) + MAP_CONFIG.offsetY + 200;

    console.log('Focus on alert:', alert.start, '→', alert.end, 'at', alertCenterX, alertCenterY);
    console.log('Target position:', targetX, targetY, 'Zoom:', ZOOM);

    if (typeof gsap !== 'undefined') {
        gsap.to(mapRoot, {
            x: targetX,
            y: targetY,
            scale: ZOOM,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => {
                currentScale = ZOOM;
                currentX = targetX;
                currentY = targetY;
            }
        });
    }
}

window.onload = init;
// Disclaimer Banner Logic
document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('disclaimer-banner');
    const btn = document.getElementById('btn-accept-disclaimer');
    const nav = document.querySelector('.bottom-nav');

    // Hide Nav immediately to let disclaimer take focus
    if (nav) nav.style.transform = 'translateY(200%)';

    // Always show on load (as requested)
    setTimeout(() => {
        banner.classList.add('visible');
    }, 500);

    btn.addEventListener('click', () => {
        banner.classList.remove('visible');
        // Bring nav back
        if (nav) nav.style.transform = 'translateY(0)';
    });
});
