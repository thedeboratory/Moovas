# Moovas — Project TODO

## Milestone 0: Scaffold & Setup
- [x] Initialize web-db-user scaffold
- [x] Create todo.md
- [x] Define DB schema (assets, collections, tabs)
- [x] Apply DB migration
- [ ] Setup GitHub remote and push initial commit

## Milestone 1: Auth Shell & Design System
- [x] Global brutalist typography design system (index.css)
- [x] Google Fonts: Space Grotesk + IBM Plex Mono
- [x] DashboardLayout with 6-tab sidebar (Canvas, Fonts, Colors, Code, Media, Bookmarks)
- [x] Manus OAuth protected routes
- [x] Landing/login page with brutalist aesthetic
- [x] Responsive sidebar with active tab state
- [x] Stub pages for each of the 6 tabs

## Milestone 2: Fabric.js Infinite Canvas
- [x] Install fabric.js
- [x] Canvas page with full-screen Fabric.js canvas
- [x] Pan support (middle-mouse or space+drag)
- [x] Zoom support (scroll wheel)
- [x] Asset card rendering on canvas surface
- [x] Canvas toolbar (zoom in/out, reset, fit)

## Milestone 3: Ingestion Pipeline & Local Storage
- [x] Install Dexie.js for IndexedDB local-first storage
- [x] Dexie schema mirroring Drizzle schema
- [x] Drag-and-drop ingestion zone (global overlay)
- [x] Paste ingestion (Ctrl+V global listener)
- [x] URL detection and classification
- [x] Code snippet detection (HTML/CSS/JS/SVG)
- [x] Font file ingestion (.ttf, .otf, .woff2)
- [x] Image/media ingestion
- [x] Color value ingestion (#hex, rgb(), rgba())
- [x] Universal Asset Object normalization
- [x] Sync local Dexie assets to remote MySQL via tRPC mutations
- [x] Optimistic UI updates on ingest

## Milestone 4: Smart Clipboard, Previews & Color Harvester
- [x] One-click copy routing (type-aware)
  - [x] HEX copy for color assets
  - [x] Base64 @font-face copy for font assets
  - [x] Raw content copy for code snippets
  - [x] URL copy for bookmarks/links
  - [x] Binary stream for media
- [x] Shadow DOM / sandboxed iframe preview for HTML/JS snippets
- [x] Color harvester: parse RGBA, HEX, CMYK from any color input
- [x] Color swatch visual display component
- [ ] Font specimen preview ("Aa Bb Cc 123") — future polish
- [ ] Asset detail modal/panel — future polish

## Milestone 5: Export Matrix & Collections
- [x] Manual "Save As" with custom extension tagging
- [x] Named collections (folders/groups)
- [x] ZIP archive download of selected assets
- [x] Embed code copy (HTML snippet for asset)
- [x] Canvas export as PNG (fabric.js toDataURL)
- [x] Canvas export as SVG (fabric.js toSVG)
- [x] Export UI panel/modal

## URL Scraping & Asset Extraction
- [x] Install cheerio on server
- [x] POST /api/scrape server endpoint (cheerio-based, server-side fetch)
- [x] Extract: fonts (@font-face, Google Fonts links), colors (hex/rgb in CSS), images (src attrs), code blocks
- [x] Partial-result warning for JS-heavy pages
- [x] [Extract Assets] button on link preview cards
- [x] Right sidebar drawer showing extracted asset candidates with checkboxes
- [x] Import selected assets → route to correct tabs (fonts→Fonts, colors→Colors, images→Media)
- [ ] /extension stub directory in repo for future Chrome extension

## Testing & Polish
- [x] Vitest unit tests for ingestion pipeline (asset classifier)
- [x] Vitest unit tests for color harvester utility
- [x] Vitest unit tests for smart clipboard routing
- [x] Error states and empty states for all tabs
- [x] Loading skeletons
- [x] Toast notifications for copy/export actions
- [ ] Font specimen preview component
- [ ] Asset detail modal
- [x] /extension Chrome extension stub (manifest.json, content.js, background.js, popup.html, popup.js, README.md)
- [ ] Final GitHub push with all milestone tags
