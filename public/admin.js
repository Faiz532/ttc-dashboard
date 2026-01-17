// === ADMIN TESTING PAGE ===
// No API calls - all alerts are manually created and stored in memory

// --- Station Data (Same as mobile.js) ---
const rawMapData = [
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
            { name: "Vaughan Metropolitan Centre", x: 220, y: 50, accessible: true },
            { name: "Highway 407", x: 220, y: 80, accessible: true },
            { name: "Pioneer Village", x: 220, y: 110, accessible: true },
            { name: "York University", x: 220, y: 140, accessible: true },
            { name: "Finch West", x: 300, y: 170, interchange: true, accessible: true },
            { name: "Downsview Park", x: 300, y: 200, accessible: true },
            { name: "Sheppard West", x: 300, y: 240, accessible: true },
            { name: "Wilson", x: 300, y: 280, accessible: true },
            { name: "Yorkdale", x: 300, y: 320, accessible: true },
            { name: "Lawrence West", x: 300, y: 360, accessible: true },
            { name: "Glencairn", x: 300, y: 400, accessible: false },
            { name: "Eglinton West", x: 300, y: 440, accessible: true },
            { name: "St Clair West", x: 300, y: 480, accessible: true },
            { name: "Dupont", x: 300, y: 520, accessible: false },
            { name: "Spadina", x: 330, y: 550, interchange: true, accessible: true },
            { name: "St George", x: 380, y: 550, interchange: true, accessible: true },
            { name: "Museum", x: 440, y: 550, accessible: true },
            { name: "Queen's Park", x: 500, y: 550, accessible: true },
            { name: "St Patrick", x: 560, y: 550, accessible: true },
            { name: "Osgoode", x: 400, y: 620, accessible: true },
            { name: "St Andrew", x: 400, y: 670, accessible: true },
            { name: "Union", x: 520, y: 700, accessible: true },
            { name: "King", x: 640, y: 670, accessible: true },
            { name: "Queen", x: 640, y: 620, accessible: true },
            { name: "Dundas", x: 640, y: 560, accessible: true },
            { name: "College", x: 640, y: 500, accessible: false },
            { name: "Wellesley", x: 640, y: 460, accessible: false },
            { name: "Bloor-Yonge", x: 640, y: 380, interchange: true, accessible: true },
            { name: "Rosedale", x: 640, y: 340, accessible: false },
            { name: "Summerhill", x: 640, y: 300, accessible: false },
            { name: "St Clair", x: 640, y: 260, accessible: true },
            { name: "Davisville", x: 640, y: 220, accessible: true },
            { name: "Eglinton", x: 640, y: 180, accessible: true },
            { name: "Lawrence", x: 640, y: 140, accessible: true },
            { name: "York Mills", x: 640, y: 100, accessible: true },
            { name: "Sheppard-Yonge", x: 640, y: 60, interchange: true, accessible: true },
            { name: "North York Centre", x: 640, y: 30, accessible: true },
            { name: "Finch", x: 640, y: 0, accessible: true }
        ]
    },
    {
        line: "2",
        stations: [
            { name: "Kipling", x: 0, y: 380, accessible: true },
            { name: "Islington", x: 50, y: 380, accessible: true },
            { name: "Royal York", x: 90, y: 380, accessible: false },
            { name: "Old Mill", x: 130, y: 380, accessible: true },
            { name: "Jane", x: 170, y: 380, accessible: false },
            { name: "Runnymede", x: 210, y: 380, accessible: false },
            { name: "High Park", x: 250, y: 380, accessible: true },
            { name: "Keele", x: 290, y: 380, accessible: false },
            { name: "Dundas West", x: 330, y: 380, accessible: true },
            { name: "Lansdowne", x: 370, y: 380, accessible: false },
            { name: "Dufferin", x: 410, y: 380, accessible: false },
            { name: "Ossington", x: 450, y: 380, accessible: false },
            { name: "Christie", x: 490, y: 380, accessible: false },
            { name: "Bathurst", x: 520, y: 380, accessible: true },
            { name: "Spadina", x: 550, y: 380, interchange: true, accessible: true },
            { name: "St George", x: 580, y: 380, interchange: true, accessible: true },
            { name: "Bay", x: 610, y: 380, accessible: true },
            { name: "Bloor-Yonge", x: 640, y: 380, interchange: true, accessible: true },
            { name: "Sherbourne", x: 680, y: 380, accessible: true },
            { name: "Castle Frank", x: 720, y: 380, accessible: false },
            { name: "Broadview", x: 760, y: 380, accessible: true },
            { name: "Chester", x: 800, y: 380, accessible: false },
            { name: "Pape", x: 840, y: 380, accessible: true },
            { name: "Donlands", x: 870, y: 380, accessible: false },
            { name: "Greenwood", x: 900, y: 380, accessible: true },
            { name: "Coxwell", x: 930, y: 380, accessible: false },
            { name: "Woodbine", x: 960, y: 380, accessible: true },
            { name: "Main Street", x: 1000, y: 380, accessible: true },
            { name: "Victoria Park", x: 1040, y: 380, accessible: true },
            { name: "Warden", x: 1080, y: 380, accessible: true },
            { name: "Kennedy", x: 1120, y: 380, interchange: true, accessible: true }
        ]
    },
    {
        line: "4",
        stations: [
            { name: "Sheppard-Yonge", x: 640, y: 60, interchange: true, accessible: true },
            { name: "Bayview", x: 700, y: 60, accessible: true },
            { name: "Bessarion", x: 760, y: 60, accessible: true },
            { name: "Leslie", x: 820, y: 60, accessible: true },
            { name: "Don Mills", x: 880, y: 60, accessible: true }
        ]
    }
];

// --- State ---
let manualAlerts = [];
let alertIdCounter = 1;
let activeTab = 'map';
let mapDraggable = null;

// --- DOM Elements ---
const mapRoot = document.getElementById('map-root');
const viewport = document.getElementById('map-viewport');

// Mobile elements
const mobileLineSelect = document.getElementById('line-select');
const mobileStartSelect = document.getElementById('start-select');
const mobileEndSelect = document.getElementById('end-select');
const mobileForm = document.getElementById('alert-form');

// Desktop elements
const desktopLineSelect = document.getElementById('desktop-line-select');
const desktopStartSelect = document.getElementById('desktop-start-select');
const desktopEndSelect = document.getElementById('desktop-end-select');
const desktopForm = document.getElementById('desktop-alert-form');

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    drawTracks();
    drawStations();
    setupDragAndZoom();
    setupFormHandlers();
    setupNavigation();
    setupClock();
    initVanta();
});

// --- Form Handlers ---
function setupFormHandlers() {
    // Mobile line change
    mobileLineSelect.addEventListener('change', () => {
        populateStations(mobileLineSelect.value, mobileStartSelect, mobileEndSelect);
    });

    // Desktop line change
    desktopLineSelect.addEventListener('change', () => {
        populateStations(desktopLineSelect.value, desktopStartSelect, desktopEndSelect);
    });

    // Mobile form submit
    mobileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addAlert({
            line: mobileLineSelect.value,
            start: mobileStartSelect.value,
            end: mobileEndSelect.value,
            direction: document.getElementById('direction-select').value,
            effect: document.getElementById('effect-select').value,
            reason: document.getElementById('reason-input').value || 'Test Alert',
            shuttle: document.getElementById('shuttle-check').checked
        });
        mobileForm.reset();
        mobileStartSelect.disabled = true;
        mobileEndSelect.disabled = true;
    });

    // Desktop form submit
    desktopForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addAlert({
            line: desktopLineSelect.value,
            start: desktopStartSelect.value,
            end: desktopEndSelect.value,
            direction: document.getElementById('desktop-direction-select').value,
            effect: document.getElementById('desktop-effect-select').value,
            reason: document.getElementById('desktop-reason-input').value || 'Test Alert',
            shuttle: document.getElementById('desktop-shuttle-check').checked
        });
        desktopForm.reset();
        desktopStartSelect.disabled = true;
        desktopEndSelect.disabled = true;
    });

    // Clear all button
    document.getElementById('btn-clear-all').addEventListener('click', () => {
        manualAlerts = [];
        renderAlerts();
        renderAlertLists();
    });
}

function populateStations(lineId, startSelect, endSelect) {
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
}

function addAlert(data) {
    const alert = {
        id: alertIdCounter++,
        line: data.line,
        start: data.start,
        end: data.end,
        direction: data.direction,
        effect: data.effect,
        reason: data.reason,
        shuttle: data.shuttle,
        singleStation: data.start === data.end,
        status: 'active'
    };

    manualAlerts.push(alert);
    renderAlerts();
    renderAlertLists();
    updateBadges();
}

function deleteAlert(id) {
    manualAlerts = manualAlerts.filter(a => a.id !== id);
    renderAlerts();
    renderAlertLists();
    updateBadges();
}

// --- Navigation ---
function setupNavigation() {
    // Mobile nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchMobileTab(tab);
        });
    });

    // Desktop sidebar
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const panel = item.dataset.panel;
            switchDesktopPanel(panel);
        });
    });

    // Close panel buttons
    document.querySelectorAll('.close-panel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const panelType = btn.dataset.close;
            closeDesktopPanel(panelType);
        });
    });
}

function switchMobileTab(tab) {
    activeTab = tab;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Hide all sheets
    document.querySelectorAll('.sheet-container').forEach(sheet => {
        sheet.classList.remove('visible');
    });

    // Show selected sheet
    if (tab === 'alerts') {
        document.getElementById('sheet-alerts').classList.add('visible');
    } else if (tab === 'create') {
        document.getElementById('sheet-create').classList.add('visible');
    }
}

function switchDesktopPanel(panel) {
    // Update sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.panel === panel);
    });

    // Hide all panels
    document.querySelectorAll('.desktop-panel').forEach(p => {
        p.classList.remove('active');
    });

    // Show selected panel
    if (panel === 'alerts') {
        document.getElementById('desktop-alerts-panel').classList.add('active');
    } else if (panel === 'create') {
        document.getElementById('desktop-create-panel').classList.add('active');
    }
}

function closeDesktopPanel(panelType) {
    document.querySelectorAll('.desktop-panel').forEach(p => {
        p.classList.remove('active');
    });
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.panel === 'map') item.classList.add('active');
    });
}

// --- Rendering ---
function renderAlerts() {
    const layer = document.getElementById('alerts-layer');
    layer.innerHTML = '';

    manualAlerts.forEach(alert => {
        const isDelay = alert.effect === 'SIGNIFICANT_DELAYS';
        if (alert.singleStation) {
            drawStationAlert(alert.line, alert.start, isDelay);
        } else {
            const flow = calculateFlow(alert.line, alert.start, alert.end, alert.direction);
            drawAlertPath(alert.line, alert.start, alert.end, flow, alert.shuttle, isDelay);
        }
    });
}

function renderAlertLists() {
    const mobileList = document.getElementById('alerts-list');
    const desktopList = document.getElementById('desktop-alerts-list');

    const html = manualAlerts.length ? manualAlerts.map(a => createAlertCard(a)).join('')
        : '<div style="text-align:center; padding:20px; color:gray">No test alerts created yet</div>';

    mobileList.innerHTML = html;
    desktopList.innerHTML = html;

    // Add delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            deleteAlert(id);
        });
    });
}

function createAlertCard(alert) {
    const lineClass = `bg-l${alert.line}`;
    const effectTag = alert.effect === 'NO_SERVICE'
        ? '<span class="tag suspension">Suspension</span>'
        : '<span class="tag delay">Delay</span>';
    const shuttleTag = alert.shuttle ? '<span class="tag shuttle">Shuttle</span>' : '';

    return `
        <div class="admin-alert-card">
            <div class="line-badge ${lineClass}">${alert.line}</div>
            <div class="alert-info">
                <div class="alert-title">${alert.reason}</div>
                <div class="alert-desc">
                    ${alert.singleStation ? `At ${alert.start}` : `${alert.start} ↔ ${alert.end}`}
                    <br>${alert.direction}
                </div>
                <div class="alert-tags">
                    ${effectTag}
                    ${shuttleTag}
                </div>
            </div>
            <button class="delete-btn" data-id="${alert.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

function updateBadges() {
    const count = manualAlerts.length;

    // Mobile badge
    const mobileBadge = document.getElementById('badge-active');
    mobileBadge.textContent = count;
    mobileBadge.classList.toggle('hidden', count === 0);

    // Desktop badge
    const desktopBadge = document.getElementById('sidebar-badge-active');
    desktopBadge.textContent = count;
    desktopBadge.classList.toggle('hidden', count === 0);
}

// --- Drawing Functions (Simplified from mobile.js) ---
function drawTracks() {
    const layer = document.getElementById('tracks-layer');

    rawMapData.forEach(line => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = getPathFromStations(line.stations, line.line);
        path.setAttribute("d", d);
        path.setAttribute("class", `track-line track-l${line.line}`);
        path.setAttribute("filter", `url(#glow-l${line.line})`);
        layer.appendChild(path);
    });
}

function drawStations() {
    const layer = document.getElementById('stations-layer');

    rawMapData.forEach(line => {
        line.stations.forEach(s => {
            // Skip duplicates for interchange stations
            if (s.interchange && line.line !== '1' && line.line !== '2') return;

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${s.x}, ${s.y})`);
            g.setAttribute("class", "station-marker");

            // Station circle
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", s.interchange ? 8 : 5);
            circle.setAttribute("fill", s.interchange ? "white" : "#333");
            circle.setAttribute("stroke", "white");
            circle.setAttribute("stroke-width", s.interchange ? 2 : 1.5);
            g.appendChild(circle);

            layer.appendChild(g);
        });
    });
}

function getPathFromStations(stations, lineId) {
    let d = "";
    for (let i = 0; i < stations.length; i++) {
        const s = stations[i];
        if (i === 0) { d += `M ${s.x} ${s.y} `; continue; }

        // Curve Logic for Line 1 at Union
        if (lineId === '1') {
            if (s.name === 'Union') {
                d += `Q 400 700, 520 700 `;
                continue;
            }
            if (s.name === 'King') {
                d += `Q 640 700, 640 670 `;
                continue;
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

function getLineColor(id) {
    if (id === '1') return '#FFC425';
    if (id === '2') return '#009639';
    if (id === '4') return '#B11D8C';
    if (id === '6') return '#9ca3af';
    return 'white';
}

function findStationIndex(lineObj, name) {
    if (!name) return -1;
    return lineObj.stations.findIndex(s => s.name === name);
}

function calculateFlow(line, startName, endName, direction) {
    if (direction === 'Both Ways') return 'both';
    const lineObj = rawMapData.find(l => l.line === line);
    if (!lineObj) return 'forward';

    const idx1 = findStationIndex(lineObj, startName);
    const idx2 = findStationIndex(lineObj, endName);

    if (idx1 < idx2) return 'forward';
    return 'reverse';
}

function drawAlertPath(line, startName, endName, flow, isShuttle, isDelay) {
    const layer = document.getElementById('alerts-layer');
    const lineObj = rawMapData.find(l => l.line === line);
    if (!lineObj) return;

    const idx1 = findStationIndex(lineObj, startName);
    const idx2 = findStationIndex(lineObj, endName);
    if (idx1 === -1 || idx2 === -1) return;

    const segment = lineObj.stations.slice(Math.min(idx1, idx2), Math.max(idx1, idx2) + 1);
    const d = getPathFromStations(segment, line);

    // Shuttle outline
    if (isShuttle) {
        const shuttlePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        shuttlePath.setAttribute("d", d);
        shuttlePath.setAttribute("class", "shuttle-outline");
        layer.appendChild(shuttlePath);
    }

    // Main alert path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "alert-base");
    if (isDelay) path.classList.add("delay");

    if (flow === 'both') path.classList.add("pulse-solid");
    else if (flow === 'reverse') path.classList.add("flow-reverse");
    else path.classList.add("flow-forward");

    layer.appendChild(path);
}

function drawStationAlert(line, stationName, isDelay) {
    const layer = document.getElementById('alerts-layer');
    const lineObj = rawMapData.find(l => l.line === line);
    if (!lineObj) return;

    const idx = findStationIndex(lineObj, stationName);
    if (idx === -1) return;

    const s = lineObj.stations[idx];

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", s.x);
    circle.setAttribute("cy", s.y);
    circle.setAttribute("r", 10);
    circle.setAttribute("class", "station-alert-glow");
    if (isDelay) {
        circle.style.stroke = "var(--delay-color)";
        circle.style.fill = "var(--delay-color)";
    }
    layer.appendChild(circle);
}

// --- Map Drag & Zoom ---
function setupDragAndZoom() {
    if (typeof gsap === 'undefined' || typeof Draggable === 'undefined') return;

    const MAP_CONFIG = {
        centerX: 430,
        centerY: 375,
        offsetX: 200,
        offsetY: 200,
        zoomMultiplier: 1.5,
        bottomNavHeight: 100
    };

    const viewWidth = viewport.clientWidth;
    const viewHeight = viewport.clientHeight;
    const availableHeight = viewHeight - MAP_CONFIG.bottomNavHeight;
    const currentScale = (viewWidth / 1000) * MAP_CONFIG.zoomMultiplier;
    const screenCenterX = viewWidth / 2;
    const screenCenterY = availableHeight / 2;
    const currentX = screenCenterX - (MAP_CONFIG.centerX * currentScale) + MAP_CONFIG.offsetX;
    const currentY = screenCenterY - (MAP_CONFIG.centerY * currentScale) + MAP_CONFIG.offsetY;

    gsap.set(mapRoot, {
        x: currentX,
        y: currentY,
        scale: currentScale,
        transformOrigin: "0 0"
    });

    mapDraggable = Draggable.create(mapRoot, {
        type: "x,y",
        inertia: true,
        trigger: viewport,
        edgeResistance: 0.75
    })[0];

    // Recenter button
    document.getElementById('btn-recenter').addEventListener('click', () => {
        gsap.to(mapRoot, {
            x: currentX,
            y: currentY,
            scale: currentScale,
            duration: 0.5,
            ease: "power2.out"
        });
    });
}

// --- Clock ---
function setupClock() {
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        document.querySelector('.clock-time').textContent = timeStr;
        document.querySelector('.clock-date').textContent = dateStr;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

// --- Vanta Background ---
function initVanta() {
    if (typeof VANTA !== 'undefined') {
        VANTA.NET({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0xffffff,
            backgroundColor: 0x0F1014,
            maxDistance: 25.00,
            spacing: 30.00,
            points: 8.0
        });
    }
}
