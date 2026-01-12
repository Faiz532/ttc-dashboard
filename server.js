const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const cheerio = require('cheerio');

// BlueSky API for real-time alerts
const BLUESKY_API_URL = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=ttcalerts.bsky.social';

// TTC Website for planned subway closures
const TTC_SUBWAY_URL = 'https://www.ttc.ca/service-advisories/subway-service';
const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

let cachedAlerts = null;
let cachedUpcomingAlerts = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute for fast updates

// Master list of valid stations to validate against
const VALID_STATIONS = [
    "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University", "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale", "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont", "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode", "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley", "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton", "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch",
    "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede", "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington", "Christie", "Bathurst", "Bay", "Sherbourne", "Castle Frank", "Broadview", "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy",
    "Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"
];

// Map common variations/typos to official names
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

// Ordered Station Lists for Range Calculations
const LINE_1_STATIONS = [
    "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University", "Finch West", "Downsview Park",
    "Sheppard West", "Wilson", "Yorkdale", "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont",
    "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode", "St Andrew", "Union",
    "King", "Queen", "Dundas", "College", "Wellesley", "Bloor-Yonge", "Rosedale", "Summerhill",
    "St Clair", "Davisville", "Eglinton", "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch"
];

const LINE_2_STATIONS = [
    "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede", "High Park", "Keele", "Dundas West",
    "Lansdowne", "Dufferin", "Ossington", "Christie", "Bathurst", "Spadina", "St George", "Bay", "Bloor-Yonge",
    "Sherbourne", "Castle Frank", "Broadview", "Chester", "Pape", "Donlands", "Greenwood", "Coxwell",
    "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy"
];

const LINE_4_STATIONS = [
    "Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"
];

const STATIONS_BY_LINE = {
    "1": LINE_1_STATIONS,
    "2": LINE_2_STATIONS,
    "4": LINE_4_STATIONS
};

// Helper to check if range A is fully contained within range B
function isSubsetRange(lineId, startA, endA, startB, endB) {
    const stations = STATIONS_BY_LINE[lineId];
    if (!stations) return false;

    const idxStartA = stations.indexOf(startA);
    const idxEndA = stations.indexOf(endA);
    const idxStartB = stations.indexOf(startB);
    const idxEndB = stations.indexOf(endB);

    if (idxStartA === -1 || idxEndA === -1 || idxStartB === -1 || idxEndB === -1) return false;

    // Normalize min/max for direction independence
    const minA = Math.min(idxStartA, idxEndA);
    const maxA = Math.max(idxStartA, idxEndA);
    const minB = Math.min(idxStartB, idxEndB);
    const maxB = Math.max(idxStartB, idxEndB);

    // Check if A is inside B
    return minA >= minB && maxA <= maxB;
}

function normalizeStation(name) {
    if (!name) return null;
    // 1. Remove common suffix/prefix garbage
    let clean = name.replace(/ Station/gi, '').replace(/ stn/gi, '').trim();

    // 2. Check explicit map
    if (STATION_MAP[clean]) return STATION_MAP[clean];
    if (STATION_MAP[clean.replace(/\./g, '')]) return STATION_MAP[clean.replace(/\./g, '')]; // Handle St. vs St

    // 3. Check direct match in valid list
    const directMatch = VALID_STATIONS.find(s => s.toLowerCase() === clean.toLowerCase());
    if (directMatch) return directMatch;

    // 4. Fuzzy check (e.g. "Spadina Ave" -> "Spadina")
    const partialMatch = VALID_STATIONS.find(s => clean.toLowerCase().includes(s.toLowerCase()));
    if (partialMatch) return partialMatch;

    return null; // Could not identify station
}

// === RATE LIMITING UTILITIES ===
// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limiter: ensures minimum delay between API calls
let lastApiCallTime = 0;
const MIN_API_DELAY = 500; // 500ms between calls

async function rateLimitedApiCall(fn) {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < MIN_API_DELAY) {
        await delay(MIN_API_DELAY - timeSinceLastCall);
    }
    lastApiCallTime = Date.now();
    return fn();
}

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.message?.includes('429') || error.message?.includes('Resource exhausted');
            if (isRateLimit && attempt < maxRetries - 1) {
                const waitTime = baseDelay * Math.pow(2, attempt);
                console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry (${attempt + 1}/${maxRetries})...`);
                await delay(waitTime);
            } else {
                throw error;
            }
        }
    }
}

const processedAlertsCache = new Map(); // Cache for AI results to save tokens

async function parseAlertWithAI(text) {
    // Check cache first
    if (processedAlertsCache.has(text)) {
        return processedAlertsCache.get(text);
    }

    try {
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' });
        const prompt = `
        You are a TTC Subway Alert Parser for a real-time subway map app.
        Current Time in Toronto: "${currentTime}".
        
        ## APP CONTEXT
        This app displays a visual subway map with animated alerts:
        - Line 1 (Yellow): Vaughan MC to Finch via Union (U-shaped)
        - Line 2 (Green): Kipling to Kennedy (horizontal)
        - Line 4 (Purple): Sheppard-Yonge to Don Mills (short horizontal)
        - Line 5 (Orange): Eglinton - NOT YET IN SERVICE (coming soon)
        - Line 6 (Grey): Finch West LRT
        
        ## VALID STATION NAMES (use exactly these names)
        Line 1: Vaughan Metropolitan Centre, Highway 407, Pioneer Village, York University, Finch West, Downsview Park, Sheppard West, Wilson, Yorkdale, Lawrence West, Glencairn, Eglinton West, St Clair West, Dupont, Spadina, St George, Museum, Queen's Park, St Patrick, Osgoode, St Andrew, Union, King, Queen, Dundas, College, Wellesley, Bloor-Yonge, Rosedale, Summerhill, St Clair, Davisville, Eglinton, Lawrence, York Mills, Sheppard-Yonge, North York Centre, Finch
        Line 2: Kipling, Islington, Royal York, Old Mill, Jane, Runnymede, High Park, Keele, Dundas West, Lansdowne, Dufferin, Ossington, Christie, Bathurst, Spadina, St George, Bay, Bloor-Yonge, Sherbourne, Castle Frank, Broadview, Chester, Pape, Donlands, Greenwood, Coxwell, Woodbine, Main Street, Victoria Park, Warden, Kennedy
        Line 4: Sheppard-Yonge, Bayview, Bessarion, Leslie, Don Mills
        
        ## TASK
        Parse the alert text below. Determine:
        1. Which LINE is affected (1, 2, or 4)
        2. START and END stations of the affected segment
        3. Is it ACTIVE now or scheduled for FUTURE?
        4. Direction affected ("Northbound", "Southbound", "Eastbound", "Westbound", or "Both Ways")
        5. Severity: "Suspension" (no trains), "Delay" (slow/reduced), or "Minor"
        
        ## TIMING RULES
        - "Starts at 11pm" and current time is 10pm → status: "future"
        - "Weekend closure" on Friday before evening → status: "future"
        - "Delays" or "Currently" → status: "active"
        - "Cleared" or "Resumed" → status: "cleared"
        
        ## OUTPUT FORMAT (JSON only, no markdown)
        {
          "line": "1" | "2" | "4",
          "start": "Exact Station Name",
          "end": "Exact Station Name",
          "reason": "Brief reason (e.g., 'Track issues', 'Signal problems')",
          "status": "active" | "future" | "cleared",
          "direction": "Northbound" | "Southbound" | "Eastbound" | "Westbound" | "Both Ways",
          "start_time": "ISO 8601 or null",
          "end_time": "ISO 8601 or null",
          "severity": "Suspension" | "Delay" | "Minor"
        }

        Input: "${text}"
        `;

        // Wrap API call with rate limiting and retry logic
        const result = await retryWithBackoff(() =>
            rateLimitedApiCall(() => model.generateContent(prompt))
        );
        const response = await result.response;
        let textResponse = response.text();

        console.log("📝 AI Input Text:", text);
        console.log("🤖 AI Raw Response:", textResponse);

        // Clean markdown code blocks if present
        textResponse = textResponse.replace(/^```json/g, '').replace(/```$/g, '').trim();

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

        console.log("✅ AI Parsed Object:", JSON.stringify(resultObj, null, 2));

        // Cache valid results
        if (resultObj.line && resultObj.start) {
            processedAlertsCache.set(text, resultObj);
            return resultObj;
        }
        return null;

    } catch (error) {
        console.error("AI Parsing Error:", error.message);
        return null; // Fallback to Regex if needed?
    }
}

// Keep the old regex function as a fallback or for comparison if desired, 
// but for new flow we will prioritize AI.
function parseAlertTextLegacy(text) {
    // ... (Legacy code contents if we wanted to keep them, but let's just replace usage)
    return parseAlertText(text); // Recursion? No, this is just a rename. 
}

function parseAlertText(text) {
    // This is the original function signature. We will convert it to async or wrap it.
    // IMPT: The original code expected synchronous return. 
    // We must change the callers to await.
    return null; // logic moved to AI function
}


async function fetchBlueSkyAlerts() {
    try {
        console.log("🐦 Fetching BlueSky alerts...");
        const response = await axios.get(BLUESKY_API_URL);
        const feed = response.data.feed || [];
        const alerts = [];

        feed.forEach(item => {
            const text = item.post?.record?.text || "";
            // Only look at posts from the last 24 hours to avoid stale data
            const createdAt = new Date(item.post?.record?.createdAt);
            if (Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000) return;

            // Use AI Parsing
            if (text.includes("Line 1") || text.includes("Line 2") || text.includes("Line 4")) {
                // Push promise to array to handle async inside forEach? No, forEach doesn't wait.
                // We should use for...of loop.
            }
        });

        // Refactor loop for async
        for (const item of feed) {
            const text = item.post?.record?.text || "";
            const createdAt = new Date(item.post?.record?.createdAt);
            if (Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000) continue;

            if (text.includes("Line 1") || text.includes("Line 2") || text.includes("Line 4")) {
                const parsed = await parseAlertWithAI(text);
                if (parsed) {
                    console.log(`✅ AI Parsed BlueSky Alert: [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end}`);
                    alerts.push(parsed);
                }
            }
        }

        return alerts;
    } catch (error) {
        console.error("Error fetching BlueSky alerts:", error.message);
        return [];
    }
}

async function fetchTTCWebsiteAlerts() {
    try {
        console.log("🌐 Scraping TTC website...");
        const response = await axios.get(TTC_SUBWAY_URL);
        const $ = cheerio.load(response.data);
        const alerts = [];

        // TTC website structure often puts alerts in specific containers.
        // We'll look for text that matches our subway patterns.
        // A common container for these alerts is often within 'div.alert-content' or similar,
        // but searching body text is more robust against minor layout changes.

        // Strategy: Iterate over paragraphs or divs that look like alerts
        const elements = $('div, p').toArray();
        for (const el of elements) {
            const text = $(el).text().trim();
            if (text.length > 300) continue;
            if (!text.includes("Line 1") && !text.includes("Line 2") && !text.includes("Line 4")) continue;

            const alreadyFound = alerts.some(a => a.originalText === text);
            if (alreadyFound) continue;

            const parsed = await parseAlertWithAI(text);
            if (parsed) {
                console.log(`✅ AI Parsed Web Alert: [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end}`);
                alerts.push(parsed);
            }
        }

        return alerts;
    } catch (error) {
        console.error("Error scraping TTC website:", error.message);
        return [];
    }
}

async function fetchTTCLiveAlerts() {
    try {
        console.log("🌐 Fetching TTC Live Alerts API...");
        const response = await axios.get(TTC_LIVE_ALERTS_API);
        const data = response.data;
        const alerts = [];
        const upcomingAlerts = [];

        if (!data.routes || !Array.isArray(data.routes)) return { current: [], upcoming: [] };

        // Helper to process alerts with AI in parallel limit or sequence
        // We will process all routes that match subway or LRT
        for (const route of data.routes) {
            if (!['Subway', 'LRT'].includes(route.routeType)) continue;

            const lineId = route.route;
            if (!['1', '2', '4', '5', '6'].includes(lineId)) continue;

            const title = route.title || route.alertTitle || '';
            const description = route.description || title;
            const headerText = route.headerText || route.customHeaderText || '';

            // Use AI to validate this Live Alert
            // Prioritize headerText (most detailed), avoid combining if they're similar
            const fullText = headerText || description || title;

            const parsed = await parseAlertWithAI(fullText);

            if (parsed) {
                // Check if AI determined it's future or cleared
                if (parsed.status === 'active') {
                    // Ensure lineId matches what we expect or trust AI? Trust AI but sanity check.
                    // The API route is usually correct for Line ID.
                    parsed.line = lineId; // Enforce API's line ID if correct
                    console.log(`✅ Live API Alert (Active): [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end} (${parsed.reason})`);
                    alerts.push(parsed);
                } else if (parsed.status === 'future') {
                    console.log(`📅 Live API Alert (Future): [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end} (${parsed.reason})`);
                    upcomingAlerts.push(parsed);
                }
            } else {
                // Fallback to manual parsing if AI fails or cache miss logic issues (shouldn't happen with cache)
                // ... (Optional: Keep legacy logic here if desired, but user wants AI)
            }
        }

        // Deduplicate alerts before returning (TTC API may return same alert under multiple route entries)
        const seenKeys = new Set();
        const deduplicatedAlerts = alerts.filter(a => {
            const key = `${a.line}-${a.start}-${a.end}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
        });
        const deduplicatedUpcoming = upcomingAlerts.filter(a => {
            const key = `${a.line}-${a.start}-${a.end}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
        });

        return { current: deduplicatedAlerts, upcoming: deduplicatedUpcoming };
    } catch (error) {
        console.error("Error fetching TTC Live Alerts API:", error.message);
        return { current: [], upcoming: [] };
    }
}

// Polling function to keep cache fresh per minute
function startPolling() {
    console.log("⏰ Starting background polling service (1 min interval)...");

    // Initial fetch immediately
    fetchTTCAlerts().catch(e => console.error("Initial fetch failed:", e.message));

    // Poll every 60 seconds regardless of user traffic
    setInterval(async () => {
        try {
            await fetchTTCAlerts();
        } catch (error) {
            console.error("Polling error:", error.message);
        }
    }, 60 * 1000);
}

async function fetchTTCAlerts() {
    // No cache check here - this function is now ONLY called by the poller
    // or manually if needed, but it always fetches fresh data.

    console.log("🔄 Fetching live data from all sources...");

    // RELY ONLY ON LIVE API to prevent stale/overlapping alerts from scraper/bluesky
    const liveApiResult = await fetchTTCLiveAlerts();
    const liveApiAlerts = liveApiResult.current || [];
    const upcomingAlerts = liveApiResult.upcoming || [];



    // Combine and deduplicate based on start/end/line
    // Prioritize Live API alerts (official & detailed) > Web Alerts > BlueSky
    const allAlerts = [...liveApiAlerts];

    // 1. Separate Active and Cleared alerts
    const activeAlerts = allAlerts.filter(a => a.status === 'active');
    const clearedAlerts = allAlerts.filter(a => a.status !== 'active');

    const uniqueAlerts = [];
    const seen = new Set();

    // 2. Add all Active alerts first (deduplicated by key)
    activeAlerts.forEach(alert => {
        const key = `${alert.line}-${alert.start}-${alert.end}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueAlerts.push(alert);
        }
    });

    // 3. Add Cleared alerts ONLY if they don't overlap with any Active alert on the same line
    clearedAlerts.forEach(alert => {
        const key = `${alert.line}-${alert.start}-${alert.end}`;
        if (seen.has(key)) return; // Exact match already exists (as active)

        // Check for overlap with any active alert on the same line
        const hasOverlap = uniqueAlerts.some(active => {
            if (active.line !== alert.line) return false;
            if (active.status !== 'active') return false;

            // Simple overlap check: if one station is same, or if they cover same segment
            // Since we don't have station order indices easily available here without map data,
            // we'll do a basic check: if start or end matches either start or end of active alert
            return (active.start === alert.start || active.start === alert.end ||
                active.end === alert.start || active.end === alert.end);
        });

        if (!hasOverlap) {
            seen.add(key);
            uniqueAlerts.push(alert);
        }
    });

    // 4. Filter out "Subset" alerts (e.g. Delays inside No Service)
    // We iterate through the unique list and remove items that are redundant
    const finalAlerts = uniqueAlerts.filter(inner => {
        // Only filter out active alerts that are NOT "Service Suspension" (keep the big ones)
        // If it's already a suspension, we keep it (unless it's a duplicate, which is already handled)
        if (inner.effect === "NO_SERVICE") return true;

        // Check if this alert is contained within another "Service Suspension" alert
        const isRedundant = uniqueAlerts.some(outer => {
            if (inner === outer) return false; // Don't compare with self
            if (outer.line !== inner.line) return false;
            if (outer.effect !== "NO_SERVICE") return false; // Only closures shadow other alerts
            if (outer.status !== 'active') return false; // Only active closures shadow other alerts

            return isSubsetRange(inner.line, inner.start, inner.end, outer.start, outer.end);
        });

        if (isRedundant) {
            console.log(`Start: ${inner.start}, End: ${inner.end}, Reason: ${inner.reason}`);
            console.log(`🗑️ Filtering redundant alert: [Line ${inner.line}] ${inner.start}-${inner.end} (${inner.reason}) inside closure`);
        }
        return !isRedundant;
    });

    cachedAlerts = finalAlerts;
    cachedUpcomingAlerts = upcomingAlerts;
    lastFetchTime = Date.now();
    return { current: finalAlerts, upcoming: upcomingAlerts };
}

// Unified endpoint - returns all data in one call
app.get('/api/data', (req, res) => {
    // Return cached data immediately from memory
    res.json({
        alerts: cachedAlerts,
        upcoming: cachedUpcomingAlerts,
        lastUpdated: lastFetchTime
    });
});

// Legacy endpoints (kept for backwards compatibility)
app.get('/api/alerts', (req, res) => {
    res.json(cachedAlerts);
});

app.get('/api/upcoming-alerts', (req, res) => {
    res.json(cachedUpcomingAlerts);
});

// Debug endpoint to check internal state
app.get('/debug/cache', (req, res) => {
    res.json({
        cachedAlerts,
        cachedUpcomingAlerts,
        lastFetchTime,
        serverTime: Date.now()
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Start background polling when server starts
    startPolling();
});