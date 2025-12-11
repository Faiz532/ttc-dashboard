const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');
const path = require('path');

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

let cachedAlerts = [];
let cachedUpcomingAlerts = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000;

// Master list of valid stations to validate against
const VALID_STATIONS = [
    "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University", "Finch West", "Downsview Park", "Sheppard West", "Wilson", "Yorkdale", "Lawrence West", "Glencairn", "Eglinton West", "St Clair West", "Dupont", "Spadina", "St George", "Museum", "Queen's Park", "St Patrick", "Osgoode", "St Andrew", "Union", "King", "Queen", "Dundas", "College", "Wellesley", "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton", "Lawrence", "York Mills", "Sheppard-Yonge", "North York Centre", "Finch",
    "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede", "High Park", "Keele", "Dundas West", "Lansdowne", "Dufferin", "Ossington", "Christie", "Bathurst", "Bay", "Sherbourne", "Castle Frank", "Broadview", "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy",
    "Bayview", "Bessarion", "Leslie", "Don Mills"
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

function parseAlertText(text) {
    // Filter: Only process alerts mentioning Lines 1, 2, or 4
    let lineId = null;
    if (text.includes("Line 1") || text.includes("Yonge-University")) lineId = "1";
    else if (text.includes("Line 2") || text.includes("Bloor-Danforth")) lineId = "2";
    else if (text.includes("Line 4") || text.includes("Sheppard")) lineId = "4";

    if (!lineId) return null;

    // Determine if this is a clearance message
    const lowerText = text.toLowerCase();
    const isCleared = lowerText.includes("resumed") || lowerText.includes("regular service has resumed");
    const status = isCleared ? "cleared" : "active";

    // IMPROVED REGEX: Stops capturing at "stations", "due", "for", or end of string
    // Case 1: "between X and Y"
    const rangeRegex = /between\s+(.*?)\s+and\s+(.*?)(?:\s+stations|\s+due|\s+for|\.|:|$)/i;
    const match = text.match(rangeRegex);

    let start = null, end = null, singleStation = false;

    if (match) {
        start = normalizeStation(match[1]);
        end = normalizeStation(match[2]);
    } else {
        // Case 2: "at X Station"
        const atRegex = /at\s+(.*?)(?:\s+station|\s+due|\.|:|$)/i;
        const atMatch = text.match(atRegex);
        if (atMatch) {
            start = normalizeStation(atMatch[1]);
            end = start;
            singleStation = true;
        }
    }

    // DETERMINE REASON
    let reason = "Service Alert";
    if (isCleared) {
        reason = "Service Resumed";
    } else if (lowerText.includes("signal")) reason = "Signal Problems";
    else if (lowerText.includes("security")) reason = "Security Incident";
    else if (lowerText.includes("maintenance") || lowerText.includes("track work") || lowerText.includes("tunnel work")) reason = "Track Maintenance";
    else if (lowerText.includes("injury") || lowerText.includes("medical")) reason = "Medical Emergency";
    else if (lowerText.includes("suspension") || lowerText.includes("no service") || lowerText.includes("no subway service")) reason = "Service Suspension";
    else if (lowerText.includes("bypass") || lowerText.includes("not stopping")) reason = "Station Bypass";
    else if (lowerText.includes("delay")) reason = "Delays";

    const isShuttle = lowerText.includes("shuttle");

    if (start && end) {
        return {
            id: Date.now() + Math.random(),
            line: lineId,
            start: start,
            end: end,
            reason: reason,
            status: status,
            direction: text.includes("Northbound") ? "Northbound" :
                text.includes("Southbound") ? "Southbound" :
                    text.includes("Eastbound") ? "Eastbound" :
                        text.includes("Westbound") ? "Westbound" : "Both Ways",
            singleStation: singleStation,
            shuttle: isShuttle,
            originalText: text
        };
    }
    return null;
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

            const parsed = parseAlertText(text);
            if (parsed) {
                console.log(`✅ Parsed BlueSky Alert: [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end}`);
                alerts.push(parsed);
            }
        });
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
        $('div, p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 300) return; // Ignore huge blocks
            if (!text.includes("Line 1") && !text.includes("Line 2") && !text.includes("Line 4")) return;

            // Avoid duplicates from nested elements by checking if we already have this text
            const alreadyFound = alerts.some(a => a.originalText === text);
            if (alreadyFound) return;

            const parsed = parseAlertText(text);
            if (parsed) {
                console.log(`✅ Parsed Web Alert: [Line ${parsed.line}] ${parsed.start} <-> ${parsed.end}`);
                alerts.push(parsed);
            }
        });

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

        data.routes.forEach(route => {
            // Filter for Subway lines (1, 2, 4)
            if (route.routeType !== 'Subway') return;

            const lineId = route.route; // "1", "2", "4"
            if (!['1', '2', '4'].includes(lineId)) return;

            const title = route.title || route.alertTitle || '';
            const reason = route.effect === 'NO_SERVICE' ? 'Service Suspension' :
                route.effect === 'SIGNIFICANT_DELAYS' ? 'Major Delays' :
                    route.effect === 'REDUCED_SPEED' ? 'Reduced Speed' :
                        route.effect === 'REDUCED_SERVICE' ? 'Reduced Service' : 'Service Alert';

            // Parse stations from title
            const rangeRegex = /between\s+(.*?)\s+and\s+(.*?)(?:\s+stations|\s+due|\s+for|,|\.|\:|$)/i;
            const match = title.match(rangeRegex);
            let start = null, end = null;

            if (match) {
                start = normalizeStation(match[1]);
                end = normalizeStation(match[2]);
            } else {
                const atRegex = /at\s+(.*?)(?:\s+station|\s+due|\.|\:|$)/i;
                const atMatch = title.match(atRegex);
                if (atMatch) {
                    start = normalizeStation(atMatch[1]);
                    end = start;
                }
            }

            // Parse the scheduled start time from title if present (e.g., "starting at 11" or "starting at 11 p.m.")
            let scheduledStartTime = null;
            const startingAtMatch = title.match(/starting\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
            if (startingAtMatch) {
                let hour = parseInt(startingAtMatch[1], 10);
                const minute = startingAtMatch[2] ? parseInt(startingAtMatch[2], 10) : 0;
                const ampm = startingAtMatch[3] ? startingAtMatch[3].toLowerCase().replace(/\./g, '') : null;

                // Adjust for PM if specified, or assume PM if hour <= 6 (evening shutdowns are common)
                if (ampm === 'pm' && hour < 12) {
                    hour += 12;
                } else if (ampm === 'am' && hour === 12) {
                    hour = 0;
                } else if (!ampm && hour >= 1 && hour <= 6) {
                    // No AM/PM specified and hour is 1-6, likely means PM (e.g., "starting at 11" means 11 PM)
                    // Actually for "11" it's likely 11 PM not AM
                    if (hour <= 11 && hour >= 6) {
                        // Keep as is (could be either)
                    } else {
                        hour += 12;
                    }
                } else if (!ampm && hour >= 7 && hour <= 11) {
                    // 7-11 without AM/PM likely means PM for service work
                    hour += 12;
                }

                // Create a date for today with that time
                const now = new Date();
                scheduledStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

                // If that time has already passed today, assume it's for tomorrow
                // Actually, for TTC alerts, they usually publish the same day, so keep it today
                // unless it's clear it should be a different day
            }

            // Determine status based on precise timestamps
            let isTimeActive = false;
            let isFuture = false;
            let activeStartTime = null;
            let activeEndTime = null;
            const now = Date.now();

            // Handle activePeriod - can be object or array
            let periods = [];
            if (route.activePeriod) {
                if (Array.isArray(route.activePeriod)) {
                    periods = route.activePeriod;
                } else if (typeof route.activePeriod === 'object') {
                    periods = [route.activePeriod];
                }
            }

            if (periods.length > 0) {
                // Check if currently active
                isTimeActive = periods.some(period => {
                    // Parse ISO strings to timestamps
                    const periodStart = period.start ? new Date(period.start).getTime() : 0;
                    // "0001-01-01" is a placeholder for "no end" in the API
                    const periodEnd = (period.end && !period.end.startsWith("0001"))
                        ? new Date(period.end).getTime()
                        : 8640000000000000;
                    return now >= periodStart && now <= periodEnd;
                });

                // Get the first period's times for reference
                if (periods[0]) {
                    activeStartTime = periods[0].start ? new Date(periods[0].start).getTime() : null;
                    activeEndTime = (periods[0].end && !periods[0].end.startsWith("0001"))
                        ? new Date(periods[0].end).getTime()
                        : null;
                }
            }

            // Check if scheduled start time from title is in the future
            if (scheduledStartTime && scheduledStartTime.getTime() > now) {
                isFuture = true;
                activeStartTime = scheduledStartTime.getTime();
                console.log(`📅 Detected future start time from title: ${scheduledStartTime.toLocaleString()}`);
            } else if (!isTimeActive && activeStartTime && activeStartTime > now) {
                // Fallback: if activePeriod.start is in the future
                isFuture = true;
            }

            // Fallback to legacy group check if timestamps are completely missing
            if (periods.length === 0) {
                isTimeActive = (route.activePeriodGroup && route.activePeriodGroup.includes("Current"));
                isFuture = (route.activePeriodGroup && (route.activePeriodGroup.includes("Planned") || route.activePeriodGroup.includes("Future")));
            }

            const status = isTimeActive && !isFuture ? "active" : "cleared";

            // Determine direction from text if possible
            let direction = "Both Ways";
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes("southbound")) direction = "Southbound";
            else if (lowerTitle.includes("northbound")) direction = "Northbound";
            else if (lowerTitle.includes("eastbound")) direction = "Eastbound";
            else if (lowerTitle.includes("westbound")) direction = "Westbound";

            if (start && end) {
                const alertData = {
                    id: Date.now() + Math.random(),
                    line: lineId,
                    start: start,
                    end: end,
                    reason: reason,
                    effect: route.effect,
                    status: status,
                    direction: direction,
                    singleStation: (start === end),
                    shuttle: (route.shuttleType === 'Running'),
                    originalText: title,
                    activeStartTime: activeStartTime,
                    activeEndTime: activeEndTime
                };

                if (isFuture && activeStartTime) {
                    console.log(`📅 Upcoming Alert: [Line ${lineId}] ${start} <-> ${end} (${reason}) starts at ${new Date(activeStartTime).toLocaleString()}`);
                    upcomingAlerts.push(alertData);
                } else if (status === 'active') {
                    console.log(`✅ Parsed Live API Alert: [Line ${lineId}] ${start} <-> ${end} (${reason}) [${direction}]`);
                    alerts.push(alertData);
                }
            }
        });

        return { current: alerts, upcoming: upcomingAlerts };
    } catch (error) {
        console.error("Error fetching TTC Live Alerts API:", error.message);
        return { current: [], upcoming: [] };
    }
}

async function fetchTTCAlerts() {
    if (Date.now() - lastFetchTime < CACHE_DURATION) {
        return { current: cachedAlerts, upcoming: cachedUpcomingAlerts };
    }

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

app.get('/api/alerts', async (req, res) => {
    const result = await fetchTTCAlerts();
    res.json(result.current);
});

app.get('/api/upcoming-alerts', async (req, res) => {
    const result = await fetchTTCAlerts();
    res.json(result.upcoming);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});