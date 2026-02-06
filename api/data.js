/**
 * ============================================================================
 * TTC DASHBOARD - VERCEL SERVERLESS FUNCTION
 * ============================================================================
 * 
 * This file is an alternative to server.js, designed to run as a serverless
 * function on Vercel's platform. It provides the same functionality but is
 * optimized for serverless deployment:
 * 
 * - Fetches TTC live alerts from the official API
 * - Uses Google Gemini AI to parse and structure the alert data
 * - Caches results in memory for 60 seconds (works across warm executions)
 * - Returns both active and upcoming alerts
 * 
 * HOW VERCEL SERVERLESS WORKS:
 * - Each request may spin up a new instance (cold start) or reuse an existing one (warm)
 * - Warm instances share the same memory, so our cache works across requests
 * - Cold starts will have an empty cache and need to fetch fresh data
 * 
 * Author: Faiz Prasla
 * ============================================================================
 */

// ============================================================================
// DEPENDENCIES
// ============================================================================

const axios = require('axios');  // HTTP client for API requests
const { GoogleGenerativeAI } = require("@google/generative-ai");  // Google AI

// ============================================================================
// INITIALIZE GEMINI AI
// ============================================================================
// Note: GEMINI_API_KEY must be set in Vercel Environment Variables
// Go to: Vercel Dashboard > Your Project > Settings > Environment Variables

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// TTC's official live alerts API
const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';


// ============================================================================
// CACHING - Persists across warm executions
// ============================================================================
// In Vercel serverless, variables declared outside the handler persist
// between requests when the function stays "warm". This lets us cache data.

let memoryCache = {
    data: null,      // Cached response data
    timestamp: 0     // When we last fetched
};
const CACHE_DURATION = 60 * 1000;  // Cache for 1 minute

// Cache for AI parsing results - saves tokens and cost!
const processedAlertsCache = new Map();


// ============================================================================
// STATION DATA
// ============================================================================
// All valid TTC subway stations for validation and name normalization

const VALID_STATIONS = [
    // Line 1 stations (Yellow - Yonge-University line)
    "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University",
    "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale",
    "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont",
    "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode",
    "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley",
    "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton",
    "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch",

    // Line 2 stations (Green - Bloor-Danforth line)
    "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede",
    "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington",
    "Christie", "Bathurst", "Bay", "Sherbourne", "Castle Frank", "Broadview",
    "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine",
    "Main Street", "Victoria Park", "Warden", "Kennedy",

    // Line 4 stations (Purple - Sheppard line)
    "Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"
];

/**
 * Maps common variations/typos to official station names
 * Examples:
 *   "St. George" → "St George" (no periods)
 *   "Eglinton West" → "Cedarvale" (station was renamed)
 *   "VMC" → "Vaughan Metropolitan Centre" (abbreviation)
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
    "Broadview Stn": "Broadview",
    "Eglinton West": "Eglinton West",
    "Cedarvale": "Eglinton West"  // Maps old name to current
};

/**
 * Ordered station lists for each line
 * Used to check if one alert range is contained within another
 */
const STATIONS_BY_LINE = {
    "1": ["Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University", "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale", "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont", "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode", "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley", "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton", "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch"],
    "2": ["Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede", "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington", "Christie", "Bathurst", "Spadina", "St George", "Bay", "Bloor-Yonge", "Sherbourne", "Castle Frank", "Broadview", "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy"],
    "4": ["Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"]
};


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if alert range A is completely inside alert range B
 * Used to filter redundant alerts (e.g., a delay inside a larger suspension)
 * 
 * @param {string} lineId - Subway line number
 * @param {string} startA - Start station of range A
 * @param {string} endA - End station of range A  
 * @param {string} startB - Start station of range B
 * @param {string} endB - End station of range B
 * @returns {boolean} - True if A is completely inside B
 */
function isSubsetRange(lineId, startA, endA, startB, endB) {
    const stations = STATIONS_BY_LINE[lineId];
    if (!stations) return false;

    // Get index positions of each station
    const idxStartA = stations.indexOf(startA);
    const idxEndA = stations.indexOf(endA);
    const idxStartB = stations.indexOf(startB);
    const idxEndB = stations.indexOf(endB);

    // If any station not found, can't compare
    if (idxStartA === -1 || idxEndA === -1 || idxStartB === -1 || idxEndB === -1) return false;

    // Normalize to handle either direction (Union→Bloor = Bloor→Union)
    const minA = Math.min(idxStartA, idxEndA);
    const maxA = Math.max(idxStartA, idxEndA);
    const minB = Math.min(idxStartB, idxEndB);
    const maxB = Math.max(idxStartB, idxEndB);

    // A is inside B if A's entire range is within B's range
    return minA >= minB && maxA <= maxB;
}

/**
 * Normalize a station name to our standard format
 * Handles variations like "St. George Station" → "St George"
 * 
 * @param {string} name - Raw station name
 * @returns {string|null} - Normalized name or null if unknown
 */
function normalizeStation(name) {
    if (!name) return null;

    // Remove " Station" or " stn" suffixes
    let clean = name.replace(/ Station/gi, '').replace(/ stn/gi, '').trim();

    // Check explicit mapping first
    if (STATION_MAP[clean]) return STATION_MAP[clean];
    if (STATION_MAP[clean.replace(/\./g, '')]) return STATION_MAP[clean.replace(/\./g, '')];

    // Check exact match (case-insensitive)
    const directMatch = VALID_STATIONS.find(s => s.toLowerCase() === clean.toLowerCase());
    if (directMatch) return directMatch;

    // Check if input contains a valid station name
    const partialMatch = VALID_STATIONS.find(s => clean.toLowerCase().includes(s.toLowerCase()));
    if (partialMatch) return partialMatch;

    return null;
}


// ============================================================================
// AI PARSING - Use Gemini to extract structured data from alert text
// ============================================================================

/**
 * Parse alert text using Google Gemini AI
 * Extracts: line, stations, severity, timing, etc.
 * 
 * @param {string} text - Raw alert text from TTC
 * @returns {Object|null} - Structured alert object or null
 */
async function parseAlertWithAI(text) {
    // Return cached result if we've seen this text before
    if (processedAlertsCache.has(text)) return processedAlertsCache.get(text);

    try {
        // Get current Toronto time for AI to determine if alert is active
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' });

        // Build the AI prompt with station lists and parsing instructions
        const prompt = `
        You are a TTC Subway Alert Parser. Current Time: "${currentTime}".
        
        ## VALID STATION NAMES
        Line 1: Vaughan Metropolitan Centre, Highway 407, Pioneer Village, York University, Finch West, Downsview Park, Sheppard West, Wilson, Yorkdale, Lawrence West, Glencairn, Eglinton West, St Clair West, Dupont, Spadina, St George, Museum, Queen's Park, St Patrick, Osgoode, St Andrew, Union, King, Queen, Dundas, College, Wellesley, Bloor-Yonge, Rosedale, Summerhill, St Clair, Davisville, Eglinton, Lawrence, York Mills, Sheppard-Yonge, North York Centre, Finch
        Line 2: Kipling, Islington, Royal York, Old Mill, Jane, Runnymede, High Park, Keele, Dundas West, Lansdowne, Dufferin, Ossington, Christie, Bathurst, Spadina, St George, Bay, Bloor-Yonge, Sherbourne, Castle Frank, Broadview, Chester, Pape, Donlands, Greenwood, Coxwell, Woodbine, Main Street, Victoria Park, Warden, Kennedy
        Line 4: Sheppard-Yonge, Bayview, Bessarion, Leslie, Don Mills

        ## CRITICAL INSTRUCTIONS
        1. Extract the EXACT start and end station names mentioned in the alert text
        2. Do NOT infer or expand the station range - use ONLY the stations explicitly mentioned
        3. If the text says "from X to Y stations", return start: X, end: Y (exactly those stations)
        4. Match station names to the valid list above (e.g., "Eglinton" matches "Eglinton")
        
        ## REQUIRED OUTPUT
        Return JSON with these keys:
        - line: 1, 2, 4, 5, or 6
        - start: First station name mentioned (EXACTLY as stated in the text)
        - end: Last station name mentioned (EXACTLY as stated in the text)
        - reason: Brief reason (e.g., "Track issues", "Medical emergency")
        - status: "active", "future", or "cleared"
        - direction: "Northbound", "Southbound", "Eastbound", "Westbound", or null
        - start_time: Start time if specified, else null
        - end_time: End time if specified, else null
        - severity: "Minor", "Delay", or "Major"
        
        Input: "${text}"
        `;

        // Call Gemini AI
        const result = await model.generateContent(prompt);
        const response = await result.response;

        // Clean up response (remove markdown code blocks if present)
        let textResponse = response.text().replace(/^```json/g, '').replace(/```$/g, '').trim();
        const json = JSON.parse(textResponse);

        // Build standardized alert object
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
            // Determine effect type for map styling
            effect: determineEffect(text, json.severity)
        };

        /**
         * Determine if alert is a delay or suspension based on text
         * Checks for keywords first, falls back to AI's severity rating
         */
        function determineEffect(originalText, aiSeverity) {
            const lowerText = originalText.toLowerCase();

            // Keywords indicating delays (service running but slow)
            const delayKeywords = ['slower than usual', 'slow', 'delay', 'reduced speed', 'move slower'];

            // Keywords indicating suspensions (no service at all)
            const suspensionKeywords = ['no service', 'suspended', 'closed', 'not stopping', 'bypass'];

            // Check for delay indicators first
            if (delayKeywords.some(keyword => lowerText.includes(keyword))) {
                return 'SIGNIFICANT_DELAYS';
            }

            // Then check for suspension indicators
            if (suspensionKeywords.some(keyword => lowerText.includes(keyword))) {
                return 'NO_SERVICE';
            }

            // Fall back to AI's severity assessment
            if (aiSeverity === 'Delay' || aiSeverity === 'Minor') {
                return 'SIGNIFICANT_DELAYS';
            }

            // Default to suspension for safety
            return 'NO_SERVICE';
        }

        // Cache valid results
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


// ============================================================================
// FETCH TTC ALERTS
// ============================================================================

/**
 * Fetch alerts from TTC's official Live Alerts API
 * 
 * @returns {Object} - { current: [...activeAlerts], upcoming: [...futureAlerts] }
 */
async function fetchTTCLiveAlerts() {
    try {
        const response = await axios.get(TTC_LIVE_ALERTS_API);
        const data = response.data;
        const alerts = [];
        const upcomingAlerts = [];

        // Validate response structure
        if (!data.routes || !Array.isArray(data.routes)) return { current: [], upcoming: [] };

        // Process each route (line) in the response
        for (const route of data.routes) {
            // Only process subway and LRT routes
            if (!['Subway', 'LRT'].includes(route.routeType)) continue;

            const lineId = route.route;
            // Only process lines we support
            if (!['1', '2', '4', '5', '6'].includes(lineId)) continue;

            // Get alert text (prefer most detailed version)
            const title = route.title || route.alertTitle || '';
            const description = route.description || title;
            const headerText = route.headerText || route.customHeaderText || '';
            const fullText = headerText || description || title;

            // Parse with AI
            const parsed = await parseAlertWithAI(fullText);

            if (parsed) {
                if (parsed.status === 'active') {
                    parsed.line = lineId;  // Trust API's line ID
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


// ============================================================================
// MAIN HANDLER - Vercel serverless function entry point
// ============================================================================

/**
 * Main API handler for Vercel
 * Called when someone requests /api/data
 * 
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
module.exports = async (req, res) => {
    // ========================================
    // Step 1: Check if we have valid cached data
    // ========================================
    const now = Date.now();
    if (memoryCache.data && (now - memoryCache.timestamp < CACHE_DURATION)) {
        // Return cached data with appropriate headers
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        return res.json(memoryCache.data);
    }

    // ========================================
    // Step 2: Fetch fresh data from TTC API
    // ========================================
    try {
        const liveApiResult = await fetchTTCLiveAlerts();
        const allAlerts = [...(liveApiResult.current || [])];
        const upcoming = liveApiResult.upcoming || [];

        // ========================================
        // TEST ALERT (for development/testing)
        // ========================================
        // This adds a fake alert to test the preview feature
        upcoming.push({
            id: 'test-union-king',
            line: '1',
            start: 'Union',
            end: 'King',
            reason: 'TEST ALERT - Testing preview centering',
            status: 'future',
            direction: 'Northbound',
            singleStation: false,
            shuttle: false,
            originalText: 'TEST: No service between Union and King stations',
            activeStartTime: Date.now() + 3600000,  // 1 hour from now
            activeEndTime: Date.now() + 7200000,    // 2 hours from now
            effect: 'NO_SERVICE'
        });

        // ========================================
        // Step 3: Deduplicate alerts
        // ========================================
        const uniqueAlerts = [];
        const seen = new Set();

        allAlerts.forEach(alert => {
            // Use direction in key to allow distinct direction alerts (needed for "Both Ways" merging on frontend)
            // But dedupe exact duplicates (same line, stations, AND direction)
            const key = `${alert.line}-${alert.start}-${alert.end}-${alert.direction}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueAlerts.push(alert);
            }
        });

        // ========================================
        // Step 4: Filter out redundant subset alerts
        // ========================================
        // If there's a suspension from A→D, don't also show delay from B→C
        const finalAlerts = uniqueAlerts.filter(inner => {
            // Always keep suspensions
            if (inner.effect === "NO_SERVICE") return true;

            // Check if this delay is inside a larger suspension
            const isRedundant = uniqueAlerts.some(outer => {
                if (inner === outer) return false;
                if (outer.line !== inner.line) return false;
                if (outer.effect !== "NO_SERVICE") return false;
                return isSubsetRange(inner.line, inner.start, inner.end, outer.start, outer.end);
            });
            return !isRedundant;
        });

        // ========================================
        // Step 5: Build response and cache it
        // ========================================
        const data = {
            alerts: finalAlerts,      // Currently active alerts
            upcoming: upcoming,        // Future scheduled alerts
            lastUpdated: now          // Timestamp
        };

        // Update cache for next request
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
