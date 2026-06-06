# Moovas Asset Harvester — Chrome Extension

A companion Chrome extension that extracts fonts, colors, images, and code blocks from any live webpage — including JavaScript-rendered SPAs — and sends them directly to your Moovas canvas.

This extension complements the server-side scraper built into Moovas. While the scraper only sees raw HTML, this extension has full access to the **rendered DOM and computed styles**, making it effective on React/Vue/Next.js sites, animated portfolios, and any page that loads assets dynamically.

---

## Installation (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `/extension` directory from this repository
5. The Moovas Harvester icon will appear in your toolbar

---

## Usage

1. Navigate to any website you want to harvest from
2. Click the Moovas Harvester icon in your toolbar
3. Enter your **Moovas instance URL** (e.g. `https://your-app.manus.space`)
4. Enter your **auth token** (retrieve from Moovas → Settings → API)
5. Click **Extract Assets from This Page**
6. The extension will show a count of found assets and import them to Moovas

---

## What Gets Extracted

| Asset Type | Method | Destination Tab |
|---|---|---|
| Fonts | Computed `font-family` + `@font-face` CSS rules | Fonts |
| Colors | CSS custom properties, computed `background-color`/`color` | Colors |
| Images | `<img src>` + CSS `background-image` URLs | Media |
| Code blocks | `<pre>` and `<code>` element text content | Code |

---

## Limitations

- Cross-origin stylesheets may not be readable due to browser security restrictions
- Very large pages may time out — the extension caps results (30 images, 10 code blocks, 40 colors)
- Auth token must be a valid Moovas session token; JWT-based auth is planned for a future version

---

## Future Enhancements

- Right-click context menu to capture individual elements
- Visual element picker (hover to select, click to capture)
- Automatic sync without manual token entry (OAuth flow)
- Safari extension port
