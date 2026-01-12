const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
// Note: User must set GEMINI_API_KEY in Vercel Environment Variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

// --- Global Cache (Warm Execution) ---
let memoryCache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 60 * 1000; // 1 minute

// AI Parsed Results Cache
const processedAlertsCache = new Map();

// --- Constants ---
const VALID_STATIONS = [
    "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University", "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale", "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont", "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode", "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley", "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton", "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch",
    "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede", "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington", "Christie", "Bathurst", "Bay", "Sherbourne", "Castle Frank", "Broadview", "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy",
    "Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"
];

const STATION_MAP = {
    "St. George": "St George", "St George": "St George",
    "Bloor Yonge": "Bloor-Yonge", "Bloor-Yonge": "Bloor-Yonge",
    "Sheppard Yonge": "Sheppard-Yonge", "Sheppard-Yonge": "Sheppard-Yonge",
    "North York Ctr": "North York Centre", "North York Centre": "North York Centre",
    "St. Clair": "St Clair", "St Clair": "St Clair",
    "St. Clair West": "St Clair West", "St Clair West": "St Clair West",
    "Vaughan": "Vaughan Metropolitan Centre", "Vaughan Metro": "Vaughan Metropolitan Centre", "VMC": "Vaughan Metropolitan Centre",
    "Bathurst St": "Bathurst",
    "Keele St": "Keele",
    "Broadview Stn": "Broadview"
};

const STATIONS_BY_LINE = {
    "1": ["Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University", "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale", "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont", "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode", "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley", "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton", "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch"],
    "2": ["Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede", "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington", "Christie", "Bathurst", "Spadina", "St George", "Bay", "Bloor-Yonge", "Sherbourne", "Castle Frank", "Broadview", "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy"],
    "4": ["Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"]
};

// --- Helpers ---
function isSubsetRange(lineId, startA, endA, startB, endB) {
    const stations = STATIONS_BY_LINE[lineId];
    if (!stations) return false;
    const idxStartA = stations.indexOf(startA);
    const idxEndA = stations.indexOf(endA);
    const idxStartB = stations.indexOf(startB);
    const idxEndB = stations.indexOf(endB);
    if (idxStartA === -1 || idxEndA === -1 || idxStartB === -1 || idxEndB === -1) return false;
    const minA = Math.min(idxStartA, idxEndA);
    const maxA = Math.max(idxStartA, idxEndA);
    const minB = Math.min(idxStartB, idxEndB);
    const maxB = Math.max(idxStartB, idxEndB);
    return minA >= minB && maxA <= maxB;
}

function normalizeStation(name) {
    if (!name) return null;
    let clean = name.replace(/ Station/gi, '').replace(/ stn/gi, '').trim();
    if (STATION_MAP[clean]) return STATION_MAP[clean];
    if (STATION_MAP[clean.replace(/\./g, '')]) return STATION_MAP[clean.replace(/\./g, '')];
    const directMatch = VALID_STATIONS.find(s => s.toLowerCase() === clean.toLowerCase());
    if (directMatch) return directMatch;
    const partialMatch = VALID_STATIONS.find(s => clean.toLowerCase().includes(s.toLowerCase()));
    if (partialMatch) return partialMatch;
    return null;
}

async function parseAlertWithAI(text) {
    if (processedAlertsCache.has(text)) return processedAlertsCache.get(text);

    try {
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' });
        const prompt = `
        You are a TTC Subway Alert Parser. Current Time: "${currentTime}".
        Identify Line (1,2,4,5,6), Start/End Stations, Status (active/future/cleared), Direction, Severity.
        Format: JSON. keys: line, start, end, reason, status, direction, start_time, end_time, severity.
        Input: "${text}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let textResponse = response.text().replace(/^```json/g, '').replace(/```$/g, '').trim();
        const json = JSON.parse(textResponse);

        const resultObj = {
            id: Date.now() + Math.random(),
            line: json.line,
            start: normalizeStation(json.start) || json.start,
            end: normalizeStation(json.end) || json.end,
            reason: json.reason,
            status: json.status,
            direction: json.direction,
            singleStation: json.start === json.end,
            shuttle: text.toLowerCase().includes('shuttle'),
            originalText: text,
            activeStartTime: json.start_time ? new Date(json.start_time).getTime() : null,
            activeEndTime: json.end_time ? new Date(json.end_time).getTime() : null,
            effect: (json.severity === 'Delay' || json.severity === 'Minor') ? 'SIGNIFICANT_DELAYS' : 'NO_SERVICE'
        };

        if (resultObj.line && resultObj.start) {
            processedAlertsCache.set(text, resultObj);
            return resultObj;
        }
        return null;
    } catch (error) {
        console.error("AI Parsing Error:", error.message);
        return null;
    }
}

async function fetchTTCLiveAlerts() {
    try {
        const response = await axios.get(TTC_LIVE_ALERTS_API);
        const data = response.data;
        const alerts = [];
        const upcomingAlerts = [];

        if (!data.routes || !Array.isArray(data.routes)) return { current: [], upcoming: [] };

        for (const route of data.routes) {
            if (!['Subway', 'LRT'].includes(route.routeType)) continue;
            const lineId = route.route;
            if (!['1', '2', '4', '5', '6'].includes(lineId)) continue;

            const title = route.title || route.alertTitle || '';
            const description = route.description || title;
            const headerText = route.headerText || route.customHeaderText || '';
            const fullText = headerText || description || title;

            const parsed = await parseAlertWithAI(fullText);

            if (parsed) {
                if (parsed.status === 'active') {
                    parsed.line = lineId;
                    alerts.push(parsed);
                } else if (parsed.status === 'future') {
                    upcomingAlerts.push(parsed);
                }
            }
        }
        return { current: alerts, upcoming: upcomingAlerts };
    } catch (error) {
        console.error("Error fetching TTC Live Alerts API:", error.message);
        return { current: [], upcoming: [] };
    }
}

// --- Main Handler ---
module.exports = async (req, res) => {
    // 1. Check Cache
    const now = Date.now();
    if (memoryCache.data && (now - memoryCache.timestamp < CACHE_DURATION)) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        return res.json(memoryCache.data);
    }

    // 2. Fetch Fresh Data
    try {
        const liveApiResult = await fetchTTCLiveAlerts();
        const allAlerts = [...(liveApiResult.current || [])];
        const upcoming = liveApiResult.upcoming || [];

        // Deduplicate & Process (Simplified Logic from Server.js)
        const uniqueAlerts = [];
        const seen = new Set();

        allAlerts.forEach(alert => {
            const key = `${alert.line}-${alert.start}-${alert.end}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueAlerts.push(alert);
            }
        });

        // Filter Redundant
        const finalAlerts = uniqueAlerts.filter(inner => {
            if (inner.effect === "NO_SERVICE") return true;
            const isRedundant = uniqueAlerts.some(outer => {
                if (inner === outer) return false;
                if (outer.line !== inner.line) return false;
                if (outer.effect !== "NO_SERVICE") return false;
                return isSubsetRange(inner.line, inner.start, inner.end, outer.start, outer.end);
            });
            return !isRedundant;
        });

        const data = {
            alerts: finalAlerts,
            upcoming: upcoming,
            lastUpdated: now
        };

        // Update Cache
        memoryCache = {
            data: data,
            timestamp: now
        };

        res.status(200).json(data);

    } catch (error) {
        console.error("API Handler Error:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};
