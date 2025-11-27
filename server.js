const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Serve the static HTML files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// TTC Public Feed URL
const TTC_FEED_URL = 'https://retro.umoiq.com/service/publicXMLFeed?command=agencyServiceAlerts&a=ttc';

let cachedAlerts = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; 

const STATION_MAP = {
    "St George": "St George", "St. George": "St George",
    "Bloor-Yonge": "Bloor-Yonge", "Bloor Yonge": "Bloor-Yonge",
    "Sheppard-Yonge": "Sheppard-Yonge", "Sheppard Yonge": "Sheppard-Yonge",
    "North York Ctr": "North York Centre", "North York Centre": "North York Centre",
    "St Clair": "St Clair", "St. Clair": "St Clair",
    "St Clair West": "St Clair West", "St. Clair West": "St Clair West",
    "Vaughan Metro": "Vaughan Metropolitan Centre", "VMC": "Vaughan Metropolitan Centre",
    "Kipling": "Kipling", "Kennedy": "Kennedy", "Finch": "Finch",
    "Union": "Union", "Vaughan": "Vaughan Metropolitan Centre"
};

function cleanStationName(name) {
    let clean = name.replace(/ Station/i, '').trim();
    return STATION_MAP[clean] || clean;
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
            let lineId = null;
            if (text.includes("Line 1") || text.includes("Yonge-University")) lineId = "1";
            else if (text.includes("Line 2") || text.includes("Bloor-Danforth")) lineId = "2";
            else if (text.includes("Line 4") || text.includes("Sheppard")) lineId = "4";

            if (lineId) {
                const rangeRegex = /between ([\w\s\.-]+) and ([\w\s\.-]+)(?:stations)?/i;
                const match = text.match(rangeRegex);
                let start = null, end = null, singleStation = false;

                if (match) {
                    start = cleanStationName(match[1]);
                    end = cleanStationName(match[2]);
                } else {
                    const atRegex = /at ([\w\s\.-]+)(?:Station)/i;
                    const atMatch = text.match(atRegex);
                    if (atMatch) {
                        start = cleanStationName(atMatch[1]);
                        end = start;
                        singleStation = true;
                    }
                }

                let reason = "Service Alert";
                if (text.toLowerCase().includes("signal")) reason = "Signal Problems";
                else if (text.toLowerCase().includes("security")) reason = "Security Incident";
                else if (text.toLowerCase().includes("maintenance")) reason = "Track Maintenance";
                else if (text.toLowerCase().includes("injury") || text.toLowerCase().includes("medical")) reason = "Medical Emergency";
                else if (text.toLowerCase().includes("suspension") || text.toLowerCase().includes("no service")) reason = "Service Suspension";

                const isShuttle = text.toLowerCase().includes("shuttle");

                if (start && end) {
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

// Fallback: Send the HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});