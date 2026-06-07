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
- [x] /extension stub directory in repo for future Chrome extension

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
- [x] Final GitHub push with all milestone tags

## App Fixes

- [x] Fix canvas drag-and-drop failing when app opened in a new window
- [x] Add file upload button (input[type=file]) as proper fallback in ingestion overlay
- [x] Replace Manus OAuth with email + password auth

## Phase 3 — moovas.design Deck Site

- [x] Horizontal scroll-snap deck shell (HTML5 / Tailwind CDN / Vanilla JS)
- [x] Left-side sticky nav that stays fixed across all slides
- [x] Light/dark mode toggle top-right on every screen
- [x] 3D button system: flat face, hover lifts, click depresses, accent color #3D5AFE on major CTAs
- [x] Subtle entrance animations on slide content
- [x] Slide 1: Hero — "A lightweight design companion that just works." + CTA
- [x] Slide 2: Features overview
- [x] Slide 3: Live sandbox demo (Moovas iframe, localStorage session, upsell on clear)
- [x] Slide 4: Download (macOS + iOS placeholder links, static counter starting at 2.311k)
- [x] Slide 5: Feedback form (no login, anonymous-friendly)
- [x] Slide 6: Bio — Deborah Atwater, pulsing signal indicator, social links (Behance/Pinterest/Google Business/@ms.atwater)
- [x] "Let's Collaborate" button — opens modal, sends urgency-flagged notification to ms.atwater@gmail.com
- [x] Collaborate modal fields: email, phone, subject dropdown + custom Other field, message, launch timeframe dropdown
- [x] Simple icons (no emoji) throughout
- [x] GitHub push for deck site (served at /deck route)

## Deferred / Tracked

- [ ] Payment flow: Buy Me a Coffee embed, $5 variable amount suggestions
- [ ] Pre-seeded demo assets in sandbox iframe (after app is stable)
- [ ] Real download counter increment on actual download
- [ ] Live "online" toggle for bio indicator

## Auth Replacement (Manus OAuth → Email + Password)

- [x] Add passwordHash and emailVerified columns to users table (schema + migration)
- [x] Install bcrypt, wire password hashing in register/login procedures
- [x] Add register and login tRPC procedures (publicProcedure)
- [x] Replace Manus OAuth callback with email/password session flow
- [x] Build Login/Register page with brutalist design
- [x] Update useAuth hook to work with new session model
- [x] Update all protected routes to redirect to /login
- [x] Remove Manus OAuth dependency from server/_core (sdk.ts stripped of OAuthService/HTTP client; oauth.ts stubbed as no-op; server no longer logs [OAuth] on startup)
