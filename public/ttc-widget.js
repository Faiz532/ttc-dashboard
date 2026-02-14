// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: subway;

/*
 * ============================================
 * TTC DASHBOARD - Auto-Updating Widget Loader
 * ============================================
 * This script automatically downloads the latest
 * widget code from subwaystatus.live every time
 * it runs. You never need to update this script!
 * ============================================
 */

const WIDGET_CODE_URL = "https://subwaystatus.live/ttc-widget-code.js?t=" + Date.now();

async function loadWidget() {
    try {
        const req = new Request(WIDGET_CODE_URL);
        req.timeoutInterval = 15;
        const code = await req.loadString();
        await eval(code);
    } catch (e) {
        // Fallback: show error widget if fetch fails
        const w = new ListWidget();
        w.backgroundColor = new Color("#0f1115");
        w.setPadding(14, 14, 14, 14);
        const err = w.addText("⚠️ Update failed");
        err.font = Font.boldSystemFont(14);
        err.textColor = new Color("#f59e0b");
        err.centerAlignText();
        w.addSpacer(4);
        const sub = w.addText("Check your connection");
        sub.font = Font.systemFont(12);
        sub.textColor = new Color("#6b7280");
        sub.centerAlignText();
        w.addSpacer(6);
        const detail = w.addText(String(e));
        detail.font = Font.systemFont(9);
        detail.textColor = new Color("#4b5563");
        detail.centerAlignText();
        detail.lineLimit = 2;
        w.url = "https://subwaystatus.live";
        if (config.runsInWidget) Script.setWidget(w);
        else w.presentMedium();
        Script.complete();
    }
}

await loadWidget();
