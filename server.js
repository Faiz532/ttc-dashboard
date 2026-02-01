/**
 * ============================================================================
 * TTC DASHBOARD - MAIN SERVER
 * ============================================================================
 * 
 * This is the backend server for the Toronto Transit Commission (TTC) 
 * real-time subway alerts dashboard. It does the following:
 * 
 * 1. FETCHES LIVE ALERTS from multiple sources:
 *    - TTC's official Live Alerts API (primary source)
 *    - BlueSky social feed (@ttcalerts.bsky.social) for breaking news
 *    - TTC website scraping (backup/additional source)
 * 
 * 2. USES AI (Google Gemini) to parse alert text and extract:
 *    - Which subway line is affected (1, 2, 4, 5, or 6)
 *    - Start and end stations of the disruption
 *    - Severity (Suspension vs Delay)
 *    - Whether it's currently active or scheduled for the future
 * 
 * 3. SERVES THE FRONTEND:
 *    - Static files (HTML, CSS, JS) from the /public folder
 *    - API endpoints for the frontend to fetch alert data
 * 
 * 4. CACHES AND POLLS:
 *    - Polls for new data every 60 seconds automatically
 *    - Caches results so API responses are instant
 * 
 * Author: Faiz Prasla
 * ============================================================================
 */

// ============================================================================
// DEPENDENCIES - External libraries we need
// ============================================================================

const express = require('express');        // Web framework for creating the server
const axios = require('axios');            // HTTP client for making API requests
const xml2js = require('xml2js');          // (Unused currently) For parsing XML responses
const cors = require('cors');              // Allows cross-origin requests (for development)
const path = require('path');              // Helps build file paths that work on any OS
require('dotenv').config();                // Loads environment variables from .env file
const { GoogleGenerativeAI } = require("@google/generative-ai");  // Google's AI for parsing alerts

// ============================================================================
// INITIALIZE GEMINI AI
// ============================================================================
// We use Google Gemini to intelligently parse alert text and extract
// structured data like which stations are affected, what line, etc.

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });  // Gemini 3.0 Flash preview


// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000;  // Use environment port (for production) or 3000 (for local dev)

app.use(cors());  // Allow requests from any origin (needed for development)
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files from /public folder

const cheerio = require('cheerio');  // jQuery-like library for scraping HTML content


// ============================================================================
// DATA SOURCE URLs
// ============================================================================
// These are the external APIs and websites we fetch alert data from

const BLUESKY_API_URL = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=ttcalerts.bsky.social';
const TTC_SUBWAY_URL = 'https://www.ttc.ca/service-advisories/subway-service';
const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';


// ============================================================================
// CACHING - Store alert data in memory for fast responses
// ============================================================================
// Instead of fetching from external APIs on every request, we cache the data
// and update it every minute in the background. This makes the API super fast.

let cachedAlerts = null;           // Currently active alerts
let cachedUpcomingAlerts = null;   // Future scheduled alerts
let lastFetchTime = 0;             // Timestamp of last successful fetch
const CACHE_DURATION = 60 * 1000;  // Cache lasts 1 minute (60000 milliseconds)


// ============================================================================
// STATION DATA - All valid TTC subway stations
// ============================================================================
// This is the master list of all subway stations. We use this to:
// 1. Validate that parsed station names are real
// 2. Map common typos/variations to official names
// 3. Calculate which stations are between two endpoints

const VALID_STATIONS = [
    // Line 1 (Yonge-University) - Yellow line, U-shaped route
    "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University",
    "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale",
    "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont",
    "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode",
    "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley",
    "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton",
    "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch",

    // Line 2 (Bloor-Danforth) - Green line, horizontal route
    "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede",
    "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington",
    "Christie", "Bathurst", "Bay", "Sherbourne", "Castle Frank", "Broadview",
    "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine",
    "Main Street", "Victoria Park", "Warden", "Kennedy",

    // Line 4 (Sheppard) - Purple line, short east-west route
    "Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills",

    // Line 6 (Finch West LRT) - Grey line
    // IMPORTANT: "Humber College" is different from "College" on Line 1!
    "Humber College", "Westmore", "Martin Grove", "Albion", "Stevenson",
    "Mount Olive", "Rowntree Mills", "Pearldale", "Duncanwoods", "Milvan Rumike",
    "Emery", "Signet Arrow", "Norfinch Oakdale", "Jane and Finch", "Driftwood",
    "Tobermory", "Sentinel"
];

/**
 * Map common variations/typos to official station names
 * Example: "St. George" -> "St George" (we don't use periods)
 * Example: "VMC" -> "Vaughan Metropolitan Centre" (common abbreviation)
 */
const STATION_MAP = {
    "St. George": "St George", "St George": "St George",
    "Bloor Yonge": "Bloor-Yonge", "Bloor-Yonge": "Bloor-Yonge",
    "Sheppard Yonge": "Sheppard-Yonge", "Sheppard-Yonge": "Sheppard-Yonge",
    "North York Ctr": "North York Centre", "North York Centre": "North York Centre",
    "St. Clair": "St Clair", "St Clair": "St Clair",
    "St. Clair West": "St Clair West", "St Clair West": "St Clair West",
    "Vaughan": "Vaughan Metropolitan Centre",
    "Vaughan Metro": "Vaughan Metropolitan Centre",
    "VMC": "Vaughan Metropolitan Centre",
    "Bathurst St": "Bathurst",
    "Keele St": "Keele",
    "Broadview Stn": "Broadview"
};


// ============================================================================
// ORDERED STATION LISTS - For calculating ranges between stations
// ============================================================================
// These arrays have stations in the actual order they appear on each line.
// This is crucial for drawing alert paths on the map correctly.

// Line 1: Starts at VMC, goes down through downtown Union, then up to Finch
const LINE_1_STATIONS = [
    "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University",
    "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale",
    "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont",
    "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode",
    "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley",
    "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton",
    "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch"
];

// Line 2: Runs west to east from Kipling to Kennedy
const LINE_2_STATIONS = [
    "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede",
    "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington",
    "Christie", "Bathurst", "Spadina", "St George", "Bay", "Bloor-Yonge",
    "Sherbourne", "Castle Frank", "Broadview", "Chester", "Pape", "Donlands",
    "Greenwood", "Coxwell", "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy"
];

// Line 4: Short line from Sheppard-Yonge going east
const LINE_4_STATIONS = [
    "Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"
];

// Line 6: Finch West LRT from Humber College to Finch West station
const LINE_6_STATIONS = [
    "Humber College", "Westmore", "Martin Grove", "Albion", "Stevenson",
    "Mount Olive", "Rowntree Mills", "Pearldale", "Duncanwoods", "Milvan Rumike",
    "Emery", "Signet Arrow", "Norfinch Oakdale", "Jane and Finch", "Driftwood",
    "Tobermory", "Sentinel", "Finch West"
];

// Look up station list by line ID
const STATIONS_BY_LINE = {
    "1": LINE_1_STATIONS,
    "2": LINE_2_STATIONS,
    "4": LINE_4_STATIONS,
    "6": LINE_6_STATIONS
};


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if alert range A is completely contained within alert range B
 * 
 * This is used to filter out redundant alerts. For example, if there's a 
 * service suspension from Union to Bloor-Yonge, we don't need to also show
 * a "delay" alert from King to Queen (since that's already covered by the suspension).
 * 
 * @param {string} lineId - The subway line (1, 2, 4, or 6)
 * @param {string} startA - Start station of range A
 * @param {string} endA - End station of range A
 * @param {string} startB - Start station of range B
 * @param {string} endB - End station of range B
 * @returns {boolean} - True if range A is inside range B
 */
function isSubsetRange(lineId, startA, endA, startB, endB) {
    const stations = STATIONS_BY_LINE[lineId];
    if (!stations) return false;

    // Find the position (index) of each station in the line
    const idxStartA = stations.indexOf(startA);
    const idxEndA = stations.indexOf(endA);
    const idxStartB = stations.indexOf(startB);
    const idxEndB = stations.indexOf(endB);

    // If any station wasn't found, we can't compare
    if (idxStartA === -1 || idxEndA === -1 || idxStartB === -1 || idxEndB === -1) return false;

    // Normalize to min/max so direction doesn't matter
    // (alert could be listed as "Union to Bloor" or "Bloor to Union")
    const minA = Math.min(idxStartA, idxEndA);
    const maxA = Math.max(idxStartA, idxEndA);
    const minB = Math.min(idxStartB, idxEndB);
    const maxB = Math.max(idxStartB, idxEndB);

    // A is inside B if A's range is completely within B's range
    return minA >= minB && maxA <= maxB;
}

/**
 * Clean up and normalize a station name
 * 
 * Takes messy input like "St. George Station" or "Spadina stn" and 
 * converts it to our standard format like "St George" or "Spadina"
 * 
 * @param {string} name - Raw station name from an alert
 * @returns {string|null} - Normalized station name, or null if not recognized
 */
function normalizeStation(name) {
    if (!name) return null;

    // Step 1: Remove common suffixes like " Station" or " stn"
    let clean = name.replace(/ Station/gi, '').replace(/ stn/gi, '').trim();

    // Step 2: Check if we have an explicit mapping (handles typos/variations)
    if (STATION_MAP[clean]) return STATION_MAP[clean];
    if (STATION_MAP[clean.replace(/\./g, '')]) return STATION_MAP[clean.replace(/\./g, '')];

    // Step 3: Check for exact match in our valid stations list (case-insensitive)
    const directMatch = VALID_STATIONS.find(s => s.toLowerCase() === clean.toLowerCase());
    if (directMatch) return directMatch;

    // Step 4: Fuzzy matching - check if input CONTAINS a valid station name
    // Sort by length descending so longer names match first
    // This prevents "Humber College" from incorrectly matching to just "College"
    const sortedStations = [...VALID_STATIONS].sort((a, b) => b.length - a.length);
    const containsMatch = sortedStations.find(s => clean.toLowerCase().includes(s.toLowerCase()));
    if (containsMatch) return containsMatch;

    return null;  // Couldn't identify the station
}


// ============================================================================
// RATE LIMITING - Prevent hitting API limits
// ============================================================================
// External APIs (especially AI APIs) have rate limits. These utilities
// help us space out our requests and retry if we get rate-limited.

/**
 * Simple delay helper - pauses execution for specified milliseconds
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let lastApiCallTime = 0;        // Timestamp of our last API call
const MIN_API_DELAY = 500;      // Wait at least 500ms between API calls

/**
 * Wraps an API call to ensure we wait between calls
 * Prevents "too many requests" errors from external APIs
 */
async function rateLimitedApiCall(fn) {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;

    // If we called too recently, wait before proceeding
    if (timeSinceLastCall < MIN_API_DELAY) {
        await delay(MIN_API_DELAY - timeSinceLastCall);
    }

    lastApiCallTime = Date.now();
    return fn();
}

/**
 * Retry a function with exponential backoff
 * 
 * If an API call fails, we wait and try again. Each retry waits longer
 * (1s, then 2s, then 4s, etc.) to give the server time to recover.
 * 
 * @param {Function} fn - The async function to retry
 * @param {number} maxRetries - Maximum number of attempts
 * @param {number} baseDelay - Initial delay in milliseconds
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            // Check if this is a rate limit error (429) or resource exhausted
            const isRateLimit = error.message?.includes('429') || error.message?.includes('Resource exhausted');

            if (isRateLimit && attempt < maxRetries - 1) {
                // Calculate wait time: 1s, 2s, 4s, 8s, etc.
                const waitTime = baseDelay * Math.pow(2, attempt);
                console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry (${attempt + 1}/${maxRetries})...`);
                await delay(waitTime);
            } else {
                throw error;  // Give up and throw the error
            }
        }
    }
}

// Cache AI parsing results to save tokens (and money!)
// If we see the same alert text twice, we return the cached result
const processedAlertsCache = new Map();


// ============================================================================
// AI ALERT PARSING - Use Gemini to understand alert text
// ============================================================================

/**
 * Use Google Gemini AI to parse alert text into structured data
 * 
 * Takes raw text like "Line 1: No service between Union and Bloor-Yonge 
 * due to signal problems" and extracts:
 * - Line number: 1
 * - Start station: Union
 * - End station: Bloor-Yonge
 * - Reason: Signal problems
 * - Severity: Suspension (NO_SERVICE)
 * 
 * @param {string} text - Raw alert text from TTC/BlueSky
 * @returns {Object|null} - Parsed alert object or null if parsing failed
 */
async function parseAlertWithAI(text) {
    // Check cache first - don't waste AI tokens on duplicate alerts
    if (processedAlertsCache.has(text)) {
        return processedAlertsCache.get(text);
    }

    try {
        // Get current Toronto time for AI to determine if alerts are active
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' });

        // Build the AI prompt - very detailed instructions for accurate parsing
        const prompt = `
        You are a TTC Subway Alert Parser for a real-time subway map app.
        Current Time in Toronto: "${currentTime}".
        
        ## APP CONTEXT
        This app displays a visual subway map with animated alerts:
        - Line 1 (Yellow): Vaughan MC to Finch via Union (U-shaped subway)
        - Line 2 (Green): Kipling to Kennedy (horizontal subway)
        - Line 4 (Purple): Sheppard-Yonge to Don Mills (short horizontal subway)
        - Line 5 (Orange): Eglinton - NOT YET IN SERVICE (coming soon)
        - Line 6 (Grey): Finch West LRT from Humber College to Finch West station
        
        ## VALID STATION NAMES (use exactly these names - be VERY careful with similar names!)
        IMPORTANT: "Humber College" (Line 6) is DIFFERENT from "College" (Line 1). Use the EXACT name.
        
        Line 1: Vaughan Metropolitan Centre, Highway 407, Pioneer Village, York University, Finch West, Downsview Park, Sheppard West, Wilson, Yorkdale, Lawrence West, Glencairn, Eglinton West, St Clair West, Dupont, Spadina, St George, Museum, Queen's Park, St Patrick, Osgoode, St Andrew, Union, King, Queen, Dundas, College, Wellesley, Bloor-Yonge, Rosedale, Summerhill, St Clair, Davisville, Eglinton, Lawrence, York Mills, Sheppard-Yonge, North York Centre, Finch
        Line 2: Kipling, Islington, Royal York, Old Mill, Jane, Runnymede, High Park, Keele, Dundas West, Lansdowne, Dufferin, Ossington, Christie, Bathurst, Spadina, St George, Bay, Bloor-Yonge, Sherbourne, Castle Frank, Broadview, Chester, Pape, Donlands, Greenwood, Coxwell, Woodbine, Main Street, Victoria Park, Warden, Kennedy
        Line 4: Sheppard-Yonge, Bayview, Bessarion, Leslie, Don Mills
        Line 6 (Finch West LRT): Humber College, Westmore, Martin Grove, Albion, Stevenson, Mount Olive, Rowntree Mills, Pearldale, Duncanwoods, Milvan Rumike, Emery, Signet Arrow, Norfinch Oakdale, Jane and Finch, Driftwood, Tobermory, Sentinel, Finch West
        
        ## TASK
        Parse the alert text below. Determine:
        1. Which LINE is affected (1, 2, 4, or 6)
        2. START and END stations of the affected segment
        3. Is it ACTIVE now or scheduled for FUTURE?
        4. Direction affected ("Northbound", "Southbound", "Eastbound", "Westbound", or "Both Ways")
        5. Severity: "Suspension" (no trains), "Delay" (slow/reduced), or "Minor"
        
        ## CRITICAL INSTRUCTIONS
        1. Extract the EXACT start and end station names mentioned in the alert text
        2. Do NOT infer or expand the station range - use ONLY the stations explicitly mentioned
        3. If the text says "from X to Y stations", return start: X, end: Y (exactly those stations)
        4. Match station names to the valid list above
        
        ## TIMING RULES
        - "Starts at 11pm" and current time is 10pm → status: "future"
        - "Weekend closure" on Friday before evening → status: "future"
        - "Delays" or "Currently" → status: "active"
        - "Cleared" or "Resumed" → status: "cleared"
        
        ## OUTPUT FORMAT (JSON only, no markdown)
        {
          "line": "1" | "2" | "4" | "6",
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

        // Call Gemini AI with rate limiting and retry logic
        const result = await retryWithBackoff(() =>
            rateLimitedApiCall(() => model.generateContent(prompt))
        );
        const response = await result.response;
        let textResponse = response.text();

        console.log("📝 AI Input Text:", text);
        console.log("🤖 AI Raw Response:", textResponse);

        // Clean up response - sometimes AI wraps it in markdown code blocks
        textResponse = textResponse.replace(/^```json/g, '').replace(/```$/g, '').trim();

        const json = JSON.parse(textResponse);

        // Build our standardized alert object
        const resultObj = {
            id: Date.now() + Math.random(),  // Unique ID for this alert
            line: json.line,
            start: normalizeStation(json.start) || json.start,  // Normalize station names
            end: normalizeStation(json.end) || json.end,
            reason: json.reason,
            status: json.status,
            direction: json.direction,
            singleStation: json.start === json.end,  // True if only one station affected
            shuttle: text.toLowerCase().includes('shuttle'),  // Is there shuttle bus service?
            originalText: text,  // Keep original text for reference
            activeStartTime: json.start_time ? new Date(json.start_time).getTime() : null,
            activeEndTime: json.end_time ? new Date(json.end_time).getTime() : null,
            // Set effect based on severity - used for styling on the map
            effect: (json.severity === 'Delay' || json.severity === 'Minor') ? 'SIGNIFICANT_DELAYS' : 'NO_SERVICE'
        };

        console.log("✅ AI Parsed Object:", JSON.stringify(resultObj, null, 2));

        // Cache valid results for future use
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

/**
 * Legacy regex-based parsing (kept for reference, but we use AI now)
 */
function parseAlertTextLegacy(text) {
    return parseAlertText(text);
}

function parseAlertText(text) {
    // Logic moved to AI function above
    return null;
}


// ============================================================================
// DATA FETCHING - Get alerts from external sources
// ============================================================================

/**
 * Fetch alerts from BlueSky social feed
 * The @ttcalerts.bsky.social account posts breaking transit news
 * 
 * @returns {Array} - Array of parsed alert objects
 */
async function fetchBlueSkyAlerts() {
    try {
        console.log("🐦 Fetching BlueSky alerts...");
        const response = await axios.get(BLUESKY_API_URL);
        const feed = response.data.feed || [];
        const alerts = [];

        // Process each post in the feed
        for (const item of feed) {
            const text = item.post?.record?.text || "";

            // Only look at posts from the last 24 hours to avoid stale data
            const createdAt = new Date(item.post?.record?.createdAt);
            if (Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000) continue;

            // Only process posts that mention subway lines
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

/**
 * Scrape the TTC website for planned closures
 * This catches scheduled maintenance that might not be in the live API
 * 
 * @returns {Array} - Array of parsed alert objects
 */
async function fetchTTCWebsiteAlerts() {
    try {
        console.log("🌐 Scraping TTC website...");
        const response = await axios.get(TTC_SUBWAY_URL);
        const $ = cheerio.load(response.data);  // Load HTML into cheerio
        const alerts = [];

        // Look through all text elements on the page
        const elements = $('div, p').toArray();
        for (const el of elements) {
            const text = $(el).text().trim();

            // Skip very long text blocks (probably not alerts)
            if (text.length > 300) continue;

            // Only process text that mentions subway lines
            if (!text.includes("Line 1") && !text.includes("Line 2") && !text.includes("Line 4")) continue;

            // Skip if we already parsed this exact text
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

/**
 * Fetch alerts from TTC's official Live Alerts API
 * This is our PRIMARY data source - most reliable and up-to-date
 * 
 * @returns {Object} - { current: [...], upcoming: [...] }
 */
async function fetchTTCLiveAlerts() {
    try {
        console.log("🌐 Fetching TTC Live Alerts API...");
        const response = await axios.get(TTC_LIVE_ALERTS_API);
        const data = response.data;
        const alerts = [];
        const upcomingAlerts = [];

        // Validate response structure
        if (!data.routes || !Array.isArray(data.routes)) return { current: [], upcoming: [] };

        // Process each route in the response
        for (const route of data.routes) {
            // Only process Subway and LRT routes
            if (!['Subway', 'LRT'].includes(route.routeType)) continue;

            const lineId = route.route;
            // Only process lines we support (1, 2, 4, 5, 6)
            if (!['1', '2', '4', '5', '6'].includes(lineId)) continue;

            // Extract alert text - prefer headerText as it's most detailed
            const title = route.title || route.alertTitle || '';
            const description = route.description || title;
            const headerText = route.headerText || route.customHeaderText || '';
            const fullText = headerText || description || title;

            // Use AI to parse the alert
            const parsed = await parseAlertWithAI(fullText);

            if (parsed) {
                if (parsed.status === 'active') {
                    // Override line ID with API's value (more reliable)
                    parsed.line = lineId;
                    console.log(`✅ Live API Alert (Active): [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end} (${parsed.reason})`);
                    alerts.push(parsed);
                } else if (parsed.status === 'future') {
                    console.log(`📅 Live API Alert (Future): [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end} (${parsed.reason})`);
                    upcomingAlerts.push(parsed);
                }
            }
        }

        // Deduplicate alerts (TTC API sometimes returns same alert under multiple entries)
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


// ============================================================================
// BACKGROUND POLLING - Keep data fresh automatically
// ============================================================================

/**
 * Start the background polling service
 * Fetches fresh data every 60 seconds, even if no users are connected
 * This ensures API responses are always instant
 */
function startPolling() {
    console.log("⏰ Starting background polling service (1 min interval)...");

    // Fetch immediately on startup
    fetchTTCAlerts().catch(e => console.error("Initial fetch failed:", e.message));

    // Then poll every 60 seconds
    setInterval(async () => {
        try {
            await fetchTTCAlerts();
        } catch (error) {
            console.error("Polling error:", error.message);
        }
    }, 60 * 1000);
}

/**
 * Main function to fetch and process all alerts
 * Called by the background poller every minute
 * 
 * @returns {Object} - { current: [...], upcoming: [...] }
 */
async function fetchTTCAlerts() {
    console.log("🔄 Fetching live data from all sources...");

    // Fetch from all sources in parallel for speed
    const [liveApiResult, blueSkyAlerts, websiteAlerts] = await Promise.all([
        fetchTTCLiveAlerts(),
        fetchBlueSkyAlerts().catch(e => { console.error("BlueSky fetch failed:", e.message); return []; }),
        fetchTTCWebsiteAlerts().catch(e => { console.error("Website scrape failed:", e.message); return []; })
    ]);

    const liveApiAlerts = liveApiResult.current || [];
    let upcomingAlerts = liveApiResult.upcoming || [];

    // Combine all sources - Live API has highest priority (listed first)
    const allAlerts = [...liveApiAlerts, ...blueSkyAlerts, ...websiteAlerts];

    // ========================================
    // Deduplicate upcoming alerts too
    // ========================================
    const seenUpcoming = new Set();
    upcomingAlerts = upcomingAlerts.filter(alert => {
        const key = `${alert.line}-${alert.start}-${alert.end}`;
        if (seenUpcoming.has(key)) return false;
        seenUpcoming.add(key);
        return true;
    });

    // ========================================
    // STEP 1: Separate Active vs Cleared alerts
    // ========================================
    const activeAlerts = allAlerts.filter(a => a.status === 'active');
    const clearedAlerts = allAlerts.filter(a => a.status !== 'active');

    // ========================================
    // STEP 2: Deduplicate active alerts (exact matches + overlapping ranges)
    // ========================================
    const uniqueAlerts = [];
    const seen = new Set();

    activeAlerts.forEach(alert => {
        const key = `${alert.line}-${alert.start}-${alert.end}`;
        // Skip exact duplicates
        if (seen.has(key)) return;

        // Also skip if this alert significantly overlaps with an existing one on same line
        const hasOverlap = uniqueAlerts.some(existing => {
            if (existing.line !== alert.line) return false;
            // Check if ranges overlap significantly (share at least one endpoint)
            return (existing.start === alert.start || existing.end === alert.end ||
                existing.start === alert.end || existing.end === alert.start);
        });

        if (!hasOverlap) {
            seen.add(key);
            uniqueAlerts.push(alert);
        }
    });

    // ========================================
    // STEP 3: Add cleared alerts only if they don't overlap with active ones
    // ========================================
    // This prevents showing "cleared" when there's still an active alert
    clearedAlerts.forEach(alert => {
        const key = `${alert.line}-${alert.start}-${alert.end}`;
        if (seen.has(key)) return;  // Exact duplicate of an active alert

        // Check if this overlaps with any active alert on the same line
        const hasOverlap = uniqueAlerts.some(active => {
            if (active.line !== alert.line) return false;
            if (active.status !== 'active') return false;
            // Simple overlap check: if either endpoint matches
            return (active.start === alert.start || active.start === alert.end ||
                active.end === alert.start || active.end === alert.end);
        });

        if (!hasOverlap) {
            seen.add(key);
            uniqueAlerts.push(alert);
        }
    });

    // ========================================
    // STEP 4: Filter out redundant subset alerts
    // ========================================
    // If there's a suspension from A to D, don't also show a delay from B to C
    // (the delay is already covered by the larger suspension)
    const finalAlerts = uniqueAlerts.filter(inner => {
        // Always keep NO_SERVICE (suspension) alerts - they take priority
        if (inner.effect === "NO_SERVICE") return true;

        // Check if this alert is contained within a larger suspension
        const isRedundant = uniqueAlerts.some(outer => {
            if (inner === outer) return false;  // Don't compare with self
            if (outer.line !== inner.line) return false;
            if (outer.effect !== "NO_SERVICE") return false;  // Only suspensions shadow others
            if (outer.status !== 'active') return false;

            return isSubsetRange(inner.line, inner.start, inner.end, outer.start, outer.end);
        });

        if (isRedundant) {
            console.log(`🗑️ Filtering redundant alert: [Line ${inner.line}] ${inner.start}-${inner.end} (${inner.reason}) inside closure`);
        }
        return !isRedundant;
    });

    // ========================================
    // STEP 5: Update cache
    // ========================================
    cachedAlerts = finalAlerts;
    cachedUpcomingAlerts = upcomingAlerts;
    lastFetchTime = Date.now();

    return { current: finalAlerts, upcoming: upcomingAlerts };
}


// ============================================================================
// API ENDPOINTS - What the frontend calls to get data
// ============================================================================

/**
 * GET /api/data
 * Main unified endpoint - returns all data in one call
 * This is what the frontend uses
 */
app.get('/api/data', (req, res) => {
    // Return cached data immediately (no waiting for API calls)
    res.json({
        alerts: cachedAlerts,         // Currently active alerts
        upcoming: cachedUpcomingAlerts,  // Future scheduled alerts
        lastUpdated: lastFetchTime    // When we last fetched fresh data
    });
});

/**
 * GET /api/alerts
 * Legacy endpoint - returns just active alerts
 * Kept for backwards compatibility with older frontend code
 */
app.get('/api/alerts', (req, res) => {
    res.json(cachedAlerts);
});

/**
 * GET /api/upcoming-alerts
 * Legacy endpoint - returns just upcoming alerts
 * Kept for backwards compatibility
 */
app.get('/api/upcoming-alerts', (req, res) => {
    res.json(cachedUpcomingAlerts);
});

/**
 * GET /debug/cache
 * Debug endpoint to inspect internal server state
 * Useful for troubleshooting
 */
app.get('/debug/cache', (req, res) => {
    res.json({
        cachedAlerts,
        cachedUpcomingAlerts,
        lastFetchTime,
        serverTime: Date.now()
    });
});

/**
 * Catch-all route
 * Any route not handled above serves index.html (for client-side routing)
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ============================================================================
// START THE SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Start background polling when server starts
    startPolling();
});