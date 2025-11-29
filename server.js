const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const TTC_FEED_URL = 'https://retro.umoiq.com/service/publicXMLFeed?command=agencyServiceAlerts&a=ttc';

let cachedAlerts = [];
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

function normalizeStation(name) {
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

async function fetchTTCAlerts() {
    if (Date.now() - lastFetchTime < CACHE_DURATION) return cachedAlerts;

    try {
        console.log("🔄 Fetching live data...");
        const response = await axios.get(TTC_FEED_URL);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);

        const rawAlerts = result.body.alert || [];
        const processedAlerts = [];

        rawAlerts.forEach(alert => {
            const text = alert.descriptionText?.[0] || "";
            
            // Filter: Only process alerts mentioning Lines 1, 2, or 4
            let lineId = null;
            if (text.includes("Line 1") || text.includes("Yonge-University")) lineId = "1";
            else if (text.includes("Line 2") || text.includes("Bloor-Danforth")) lineId = "2";
            else if (text.includes("Line 4") || text.includes("Sheppard")) lineId = "4";

            if (lineId) {
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
                const lowerText = text.toLowerCase();
                if (lowerText.includes("signal")) reason = "Signal Problems";
                else if (lowerText.includes("security")) reason = "Security Incident";
                else if (lowerText.includes("maintenance") || lowerText.includes("track work")) reason = "Track Maintenance";
                else if (lowerText.includes("injury") || lowerText.includes("medical")) reason = "Medical Emergency";
                else if (lowerText.includes("suspension") || lowerText.includes("no service") || lowerText.includes("no subway service")) reason = "Service Suspension";
                else if (lowerText.includes("bypass") || lowerText.includes("not stopping")) reason = "Station Bypass";

                const isShuttle = lowerText.includes("shuttle");

                if (start && end) {
                    console.log(`✅ Parsed Alert: [Line ${lineId}] ${start} <-> ${end} (${reason})`);
                    processedAlerts.push({
                        id: Date.now() + Math.random(),
                        line: lineId,
                        start: start,
                        end: end,
                        reason: reason,
                        direction: text.includes("Northbound") ? "Northbound" : 
                                   text.includes("Southbound") ? "Southbound" : 
                                   text.includes("Eastbound") ? "Eastbound" : 
                                   text.includes("Westbound") ? "Westbound" : "Both Ways",
                        singleStation: singleStation,
                        shuttle: isShuttle,
                        originalText: text
                    });
                } else {
                    // Log failed parses to help debug why an alert isn't showing
                    console.log(`⚠️ Skipped Alert (Stations not found): "${text.substring(0, 50)}..."`);
                }
            }
        });

        cachedAlerts = processedAlerts;
        lastFetchTime = Date.now();
        return processedAlerts;

    } catch (error) {
        console.error("Error fetching data:", error.message);
        return [];
    }
}

app.get('/api/alerts', async (req, res) => {
    const alerts = await fetchTTCAlerts();
    res.json(alerts);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});