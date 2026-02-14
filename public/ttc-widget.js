// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: subway;

/*
 * ============================================
 * TTC DASHBOARD - Scriptable iOS Widget
 * ============================================
 * Shows live TTC subway alerts on your iPhone home screen.
 * 
 * SETUP:
 * 1. Install "Scriptable" from the App Store
 * 2. Create a new script and paste this code
 * 3. Add a Scriptable widget to your home screen
 * 4. Long-press the widget → Edit Widget → Select this script
 *
 * Supports: Small, Medium, and Large widget sizes
 * Data source: subwaystatus.live API
 * ============================================
 */

const API_URL = "https://subwaystatus.live/api/data";
const MAP_URL = "https://subwaystatus.live/api/widget-map?theme=dark";

// Line colors matching the TTC brand
const LINE_COLORS = {
    "1": new Color("#FFC425"),  // Yonge-University (Yellow)
    "2": new Color("#009639"),  // Bloor-Danforth (Green)
    "4": new Color("#B11D8C"),  // Sheppard (Purple)
    "5": new Color("#F37021"),  // Eglinton (Orange)
    "6": new Color("#9ca3af"),  // Finch West (Grey)
};

const LINE_NAMES = {
    "1": "Line 1",
    "2": "Line 2",
    "4": "Line 4",
    "5": "Line 5",
    "6": "Line 6",
};

// Theme colors
const BG_COLOR = new Color("#0f1115");
const CARD_BG = new Color("#1a1d23");
const TEXT_PRIMARY = Color.white();
const TEXT_SECONDARY = new Color("#9ca3af");
const TEXT_MUTED = new Color("#6b7280");
const ALERT_RED = new Color("#ef4444");
const DELAY_ORANGE = new Color("#f59e0b");
const ALL_CLEAR_GREEN = new Color("#22c55e");

// ============================================
// CHECK IF SUBWAY IS CLOSED
// ============================================
function isSubwayClosed() {
    const now = new Date();
    const formatter = new DateFormatter();
    formatter.dateFormat = "HH";
    formatter.locale = "en_US";
    // Use Toronto timezone
    const hour = parseInt(now.toLocaleString("en-US", { timeZone: "America/Toronto", hour: "2-digit", hour12: false }));
    const day = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" })).getDay();

    if (day === 0) {
        return hour >= 2 && hour < 8;
    } else {
        return hour >= 2 && hour < 6;
    }
}

function getNextOpenTime() {
    const now = new Date();
    const day = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" })).getDay();
    return day === 0 ? "8:00 AM" : "6:00 AM";
}

// ============================================
// FETCH DATA
// ============================================
async function fetchAlerts() {
    try {
        const req = new Request(API_URL);
        req.timeoutInterval = 10;
        const data = await req.loadJSON();
        return data;
    } catch (e) {
        console.error("Failed to fetch: " + e);
        return null;
    }
}

// ============================================
// FETCH MAP IMAGE
// ============================================
async function fetchMapImage() {
    try {
        const req = new Request(MAP_URL);
        req.timeoutInterval = 15;
        const img = await req.loadImage();
        return img;
    } catch (e) {
        console.error("Failed to fetch map: " + e);
        return null;
    }
}

// ============================================
// MERGE ALERTS BY LINE
// ============================================
function summarizeByLine(alerts) {
    const allLines = ["1", "2", "4", "5", "6"];
    const summary = {};

    allLines.forEach(line => {
        summary[line] = { suspensions: [], delays: [], clear: true };
    });

    if (!alerts || alerts.length === 0) return summary;

    alerts.forEach(alert => {
        if (alert.status !== "active") return;
        const line = alert.line;
        if (!summary[line]) return;

        summary[line].clear = false;
        const isDelay = alert.effect === "SIGNIFICANT_DELAYS" || alert.effect === "REDUCED_SPEED";

        const label = alert.singleStation
            ? `At ${alert.start}`
            : `${alert.start} ↔ ${alert.end}`;

        if (isDelay) {
            summary[line].delays.push(label);
        } else {
            summary[line].suspensions.push(label);
        }
    });

    return summary;
}

// ============================================
// SMALL WIDGET
// ============================================
function buildSmallWidget(summary, upcoming) {
    const w = new ListWidget();
    w.backgroundColor = BG_COLOR;
    w.setPadding(12, 14, 12, 14);

    // Header
    const header = w.addStack();
    header.centerAlignContent();
    const icon = header.addText("🚇");
    icon.font = Font.systemFont(12);
    header.addSpacer(4);
    const title = header.addText("TTC Live");
    title.font = Font.boldSystemFont(12);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();

    // Status dot
    const allClear = Object.values(summary).every(s => s.clear);
    const hasSuspension = Object.values(summary).some(s => s.suspensions.length > 0);
    const dot = header.addText("●");
    dot.font = Font.systemFont(10);
    dot.textColor = allClear ? ALL_CLEAR_GREEN : (hasSuspension ? ALERT_RED : DELAY_ORANGE);

    w.addSpacer(8);

    if (allClear) {
        // All clear state
        const clearIcon = w.addText("✅");
        clearIcon.font = Font.systemFont(28);
        clearIcon.centerAlignText();
        w.addSpacer(4);
        const clearText = w.addText("All Clear");
        clearText.font = Font.boldSystemFont(16);
        clearText.textColor = ALL_CLEAR_GREEN;
        clearText.centerAlignText();
        const sub = w.addText("No active alerts");
        sub.font = Font.systemFont(11);
        sub.textColor = TEXT_MUTED;
        sub.centerAlignText();
    } else {
        // Show affected lines
        const lines = ["1", "2", "4", "5", "6"];
        lines.forEach(line => {
            const s = summary[line];
            if (s.clear) return;

            const row = w.addStack();
            row.centerAlignContent();
            row.spacing = 6;

            // Line badge
            const badge = row.addStack();
            badge.backgroundColor = LINE_COLORS[line];
            badge.cornerRadius = 4;
            badge.setPadding(1, 5, 1, 5);
            const badgeText = badge.addText(line);
            badgeText.font = Font.boldSystemFont(10);
            badgeText.textColor = line === "1" ? Color.black() : Color.white();

            // Status
            if (s.suspensions.length > 0) {
                const status = row.addText("No Service");
                status.font = Font.mediumSystemFont(11);
                status.textColor = ALERT_RED;
                status.lineLimit = 1;
            } else {
                const status = row.addText("Delays");
                status.font = Font.mediumSystemFont(11);
                status.textColor = DELAY_ORANGE;
                status.lineLimit = 1;
            }

            w.addSpacer(3);
        });
    }

    w.addSpacer();

    // Timestamp
    const footer = w.addStack();
    footer.addSpacer();
    const df = new DateFormatter();
    df.dateFormat = "h:mm a";
    const time = footer.addText(df.string(new Date()));
    time.font = Font.systemFont(9);
    time.textColor = TEXT_MUTED;

    return w;
}

// ============================================
// MEDIUM WIDGET
// ============================================
function buildMediumWidget(summary, upcoming) {
    const w = new ListWidget();
    w.backgroundColor = BG_COLOR;
    w.setPadding(12, 16, 12, 16);

    // Header row
    const header = w.addStack();
    header.centerAlignContent();
    const icon = header.addText("🚇");
    icon.font = Font.systemFont(13);
    header.addSpacer(4);
    const title = header.addText("TTC Live");
    title.font = Font.boldSystemFont(14);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();

    const df = new DateFormatter();
    df.dateFormat = "h:mm a";
    const time = header.addText(df.string(new Date()));
    time.font = Font.systemFont(11);
    time.textColor = TEXT_MUTED;

    w.addSpacer(8);

    const allClear = Object.values(summary).every(s => s.clear);

    if (allClear) {
        const row = w.addStack();
        row.centerAlignContent();
        row.addSpacer();
        const stack = row.addStack();
        stack.layoutVertically();
        const clearIcon = stack.addText("✅");
        clearIcon.font = Font.systemFont(28);
        clearIcon.centerAlignText();
        stack.addSpacer(4);
        const clearText = stack.addText("All Clear — No Active Alerts");
        clearText.font = Font.boldSystemFont(14);
        clearText.textColor = ALL_CLEAR_GREEN;
        clearText.centerAlignText();
        row.addSpacer();
    } else {
        // Show each affected line with details
        const lines = ["1", "2", "4", "5", "6"];
        let shown = 0;
        lines.forEach(line => {
            const s = summary[line];
            if (s.clear) return;
            if (shown >= 3) return; // Max 3 rows for medium
            shown++;

            const row = w.addStack();
            row.centerAlignContent();
            row.spacing = 8;

            // Line badge
            const badge = row.addStack();
            badge.backgroundColor = LINE_COLORS[line];
            badge.cornerRadius = 5;
            badge.setPadding(2, 6, 2, 6);
            const badgeText = badge.addText(line);
            badgeText.font = Font.boldSystemFont(12);
            badgeText.textColor = line === "1" ? Color.black() : Color.white();

            // Details column
            const details = row.addStack();
            details.layoutVertically();

            if (s.suspensions.length > 0) {
                const label = details.addText("🔴 " + s.suspensions[0]);
                label.font = Font.mediumSystemFont(12);
                label.textColor = ALERT_RED;
                label.lineLimit = 1;
            }
            if (s.delays.length > 0) {
                const label = details.addText("🟡 " + s.delays[0]);
                label.font = Font.mediumSystemFont(12);
                label.textColor = DELAY_ORANGE;
                label.lineLimit = 1;
            }

            if (shown < 3) w.addSpacer(4);
        });

        // Show "+N more" if needed
        const totalAffected = lines.filter(l => !summary[l].clear).length;
        if (totalAffected > 3) {
            w.addSpacer(2);
            const more = w.addText(`+${totalAffected - 3} more lines affected`);
            more.font = Font.systemFont(10);
            more.textColor = TEXT_MUTED;
        }
    }

    w.addSpacer();

    // Clear lines footer
    const clearLines = ["1", "2", "4", "5", "6"].filter(l => summary[l].clear);
    if (clearLines.length > 0 && clearLines.length < 5) {
        const footer = w.addStack();
        footer.centerAlignContent();
        const check = footer.addText("✓");
        check.font = Font.systemFont(10);
        check.textColor = ALL_CLEAR_GREEN;
        footer.addSpacer(4);
        const clearText = footer.addText(`Lines ${clearLines.join(", ")} all clear`);
        clearText.font = Font.systemFont(10);
        clearText.textColor = TEXT_MUTED;
    }

    return w;
}

// ============================================
// LARGE WIDGET
// ============================================
function buildLargeWidget(summary, upcoming, mapImage) {
    const w = new ListWidget();
    w.backgroundColor = BG_COLOR;
    w.setPadding(14, 14, 14, 14);

    // Header
    const header = w.addStack();
    header.centerAlignContent();
    const icon = header.addText("🚇");
    icon.font = Font.systemFont(14);
    header.addSpacer(5);
    const title = header.addText("Toronto Transit Live");
    title.font = Font.boldSystemFont(15);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();
    const df = new DateFormatter();
    df.dateFormat = "h:mm a";
    const time = header.addText(df.string(new Date()));
    time.font = Font.systemFont(10);
    time.textColor = TEXT_MUTED;

    w.addSpacer(6);

    // ---- MAP IMAGE ----
    if (mapImage) {
        const imgStack = w.addStack();
        imgStack.addSpacer();
        const img = imgStack.addImage(mapImage);
        img.imageSize = new Size(290, 194);
        imgStack.addSpacer();
        w.addSpacer(6);
    }

    // ---- LINE STATUS ROWS ----
    const lines = ["1", "2", "4", "5", "6"];
    lines.forEach(line => {
        const s = summary[line];

        const row = w.addStack();
        row.centerAlignContent();
        row.spacing = 8;

        // Line badge
        const badge = row.addStack();
        badge.backgroundColor = LINE_COLORS[line];
        badge.cornerRadius = 5;
        badge.setPadding(2, 6, 2, 6);
        badge.size = new Size(32, 0);
        const badgeText = badge.addText(line);
        badgeText.font = Font.boldSystemFont(12);
        badgeText.textColor = line === "1" ? Color.black() : Color.white();

        if (s.clear) {
            const status = row.addText("All Clear");
            status.font = Font.mediumSystemFont(11);
            status.textColor = ALL_CLEAR_GREEN;
        } else {
            const details = row.addStack();
            details.layoutVertically();

            if (s.suspensions.length > 0) {
                s.suspensions.slice(0, 1).forEach(susp => {
                    const label = details.addText("🔴 " + susp);
                    label.font = Font.mediumSystemFont(11);
                    label.textColor = ALERT_RED;
                    label.lineLimit = 1;
                });
            }
            if (s.delays.length > 0) {
                s.delays.slice(0, 1).forEach(del => {
                    const label = details.addText("🟡 " + del);
                    label.font = Font.mediumSystemFont(11);
                    label.textColor = DELAY_ORANGE;
                    label.lineLimit = 1;
                });
            }
        }

        w.addSpacer(2);
    });

    w.addSpacer();

    // Footer
    const footer = w.addStack();
    const footerText = footer.addText("subwaystatus.live");
    footerText.font = Font.systemFont(9);
    footerText.textColor = TEXT_MUTED;
    footer.addSpacer();

    return w;
}

// ============================================
// BUILD CLOSED WIDGET
// ============================================
function buildClosedWidget(widgetSize) {
    const w = new ListWidget();
    w.backgroundColor = BG_COLOR;
    w.setPadding(14, 14, 14, 14);

    const header = w.addStack();
    header.centerAlignContent();
    const icon = header.addText("🚇");
    icon.font = Font.systemFont(12);
    header.addSpacer(4);
    const title = header.addText("TTC Live");
    title.font = Font.boldSystemFont(12);
    title.textColor = TEXT_PRIMARY;

    w.addSpacer();

    const moon = w.addText("🌙");
    moon.font = Font.systemFont(widgetSize === "small" ? 28 : 36);
    moon.centerAlignText();
    w.addSpacer(4);

    const closedText = w.addText("Subway Closed");
    closedText.font = Font.boldSystemFont(widgetSize === "small" ? 14 : 18);
    closedText.textColor = TEXT_PRIMARY;
    closedText.centerAlignText();

    w.addSpacer(2);

    const reopenText = w.addText(`Reopens at ${getNextOpenTime()}`);
    reopenText.font = Font.systemFont(widgetSize === "small" ? 11 : 13);
    reopenText.textColor = new Color("#6366f1");
    reopenText.centerAlignText();

    w.addSpacer();

    return w;
}

// ============================================
// MAIN
// ============================================
async function main() {
    const widgetSize = config.widgetFamily || "large";

    // Check subway hours first
    if (isSubwayClosed()) {
        const w = buildClosedWidget(widgetSize);
        w.url = "https://subwaystatus.live";
        if (config.runsInWidget) {
            Script.setWidget(w);
        } else {
            w.presentMedium();
        }
        Script.complete();
        return;
    }

    // Fetch live data
    const data = await fetchAlerts();

    if (!data) {
        // Error state
        const w = new ListWidget();
        w.backgroundColor = BG_COLOR;
        w.setPadding(14, 14, 14, 14);
        const errText = w.addText("⚠️ Unable to load TTC data");
        errText.font = Font.systemFont(13);
        errText.textColor = DELAY_ORANGE;
        errText.centerAlignText();
        w.url = "https://subwaystatus.live";
        if (config.runsInWidget) Script.setWidget(w);
        else w.presentMedium();
        Script.complete();
        return;
    }

    const alerts = data.alerts || [];
    const upcoming = data.upcoming || [];
    const summary = summarizeByLine(alerts);

    // Fetch map image for large widget
    let mapImage = null;
    if (widgetSize === "large") {
        mapImage = await fetchMapImage();
    }

    let widget;
    if (widgetSize === "small") {
        widget = buildSmallWidget(summary, upcoming);
    } else if (widgetSize === "large") {
        widget = buildLargeWidget(summary, upcoming, mapImage);
    } else {
        widget = buildMediumWidget(summary, upcoming);
    }

    // Tap widget to open the website
    widget.url = "https://subwaystatus.live";

    // Refresh every 5 minutes
    widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);

    if (config.runsInWidget) {
        Script.setWidget(widget);
    } else {
        // Preview when run in-app — default to large to show map
        widget.presentLarge();
    }

    Script.complete();
}

await main();
