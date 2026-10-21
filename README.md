# EMB Region 7 — 2026 Legal Dashboard

A read-only monitoring dashboard for the EMB Region 7 2026 legal docket. It turns the
source Google Sheet into a single, self-contained HTML file that can be opened offline,
printed, or shared internally.

The dashboard is a **monitoring view**, not an official legal record. The source workbook
remains authoritative.

---

## Quick start

```bash
npm install

# Development server with hot reload
npm run dev

# Rebuild the single-file dashboard
npm run build:single

# Type-check the React/TypeScript source
npm run typecheck

# Pull a fresh snapshot from Google Sheets
npm run refresh
```

`npm run build:single` runs `vite build` and then copies the single-file build to
`index.html` in the project root. That root file is the deliverable: open it
directly in a browser (`file://` works) or host it on any static web server.

---

## Access gate

The dashboard opens on a sign-in screen. Accounts are issued and managed by IT Support / EMB-7-MIS. Credentials are not stored in this README.

Sessions are kept in `sessionStorage` for the current browser session. A **Sign out** button is available in the dashboard header. All roles have the same read-only permissions because the dashboard has no write actions; role labels identify the signed-in user and are ready for future permission rules.

Source workbook links are gated by the Source Viewer account before the workbook opens.

**Important:** this is a client-side gate inside a static HTML file. It prevents casual
access, but it is not server-side authentication. The bundled snapshot and password hashes
are present in the HTML, so the file should still be handled as an internal document. Rotate
account passwords through IT Support before distributing the dashboard.

To generate a replacement hash:

```bash
npm run hash-password -- "YourNewPassword"
```

Replace the matching `salt`, `passwordHash`, and `iterations` values in
`src/lib/auth.ts`, then rebuild with `npm run build:single`.

---

## What is in this repository

| Path | Purpose |
| --- | --- |
| `index.html` | Built, self-contained dashboard (all JS and CSS inlined). |
| `vite-entry.html` | Vite source entry template used by the build. |
| `src/App.tsx` | App shell, page routing, live-refresh state, case drawer state. |
| `src/pages/` | Overview, Case Tracker, Enforcement, Payments, Complaints, Data Quality. |
| `src/components/` | Tables, charts, filters, drawer, header/sidebar, login gate, shared UI primitives. |
| `src/lib/auth.ts` | Account configuration, PBKDF2 password verification, and session storage. |
| `scripts/hash-password.mjs` | Generates a PBKDF2 salt/hash pair for changing an account password. |
| `src/lib/buildData.ts` | Normalizes the snapshot into cases and linked enforcement rows. |
| `src/lib/metrics.ts` | KPIs, chart series, summaries, filtering. |
| `src/lib/export.ts` | Client-side CSV exports (UTF-8 with BOM). |
| `src/lib/liveRefresh.ts` | Optional in-browser refresh from Google Sheets via JSONP. |
| `src/data/snapshot.json` | Bundled snapshot used when the dashboard loads offline. |
| `scripts/refresh-data.mjs` | Pulls all source tabs and rewrites the snapshot. |
| `scripts/finalize.mjs` | Copies the Vite build to the root single-file HTML. |
| `dist/` | Vite build output (intermediate artifact). |

---

## Current snapshot

Snapshot date: **2026-10-20**

- **470 master records**: 469 numbered cases (`2026-0001` through `2026-0470`, with
  `2026-0225` absent) plus **1 unnumbered entry** (ISUZU CEBU, INC.,
  IIS `R7-2026-004203`). The unnumbered entry is left unnumbered rather than guessed.
- **253 cases** have at least one linked PAB NOV record.
- Source tab rows: PAB NOV 352, orders/resolutions 167, PAB orders 103, ERF payments 310,
  PAB penalties 190, RA 6969 penalties 17, complaints 88, technical-conference watchlist 2.

The snapshot is regenerated with `npm run refresh`. Refresh only changes
`src/data/snapshot.json`; rebuild with `npm run build:single` to embed it in the HTML.

---

## Pages

- **Overview** — portfolio KPIs, docketing trend, province mix, stage coverage, handler
  workload, violation mix, aging, and recently docketed cases.
- **Case Tracker** — searchable, filterable register of every master record with linked
  enforcement, payment, and complaint counts. Opens the full case drawer.
- **Enforcement** — PAB NOV, orders/resolutions, PAB orders, and an unlinked-records view.
  Defaults to records linked to a 2026 master case; the "All years" toggle shows the full
  rolling register.
- **Payments** — ERF, PAB penalty, and RA 6969 payment rows, with paid/pending/no-status
  splits and monthly collections.
- **Complaints** — complaint volume, channel mix, linked-case coverage, and an expandable
  complaint register. Each row includes a **Linked case** column when a reliable match
  exists.
- **Data Quality** — source-tab reconciliation, invalid dates, duplicate IIS references,
  missing master fields, the unnumbered entry, and all unlinked rows.

---

## Visual design

The interface uses a light **eco-glass** theme: frosted translucent panels, a forest/teal/
sage palette, soft natural-light gradients, and a subtle topographic contour background.
Status colours remain semantic (amber for pending, rose for issues, sky and lime for
pipeline stages) so the visual refresh does not change how records are read.

- Palette and shadow tokens live in `tailwind.config.js`. The existing `navy`, `brand`, and
  `gold` token names are intentionally retained and remapped to forest, leaf, and sand tones.
- Shared glass surfaces, table/input/button styling, the background treatment, and print
  overrides live in `src/index.css`.
- The DENR seal is the brand mark on the login gate, sidebar, and mobile header. It uses a
  subtle float, halo, and sheen animation, with motion disabled automatically under
  `prefers-reduced-motion`. The optimized 512 px copy is `assets/denr-logo-512.png`; the
  original `assets/DENR LOGO.png` is left untouched.
- The browser-tab icon is a compact crop of the seal's emblem
  (`assets/denr-favicon-64.png`), embedded into the single-file build so the tab mark
  survives offline sharing. PNG/ICO variants and the Apple touch icon live in `public/`.
- Print output removes the glass effects and page background so registers stay legible on
  white paper.

---

## Linkage rules

Records are matched to master cases using a fixed priority:

1. **IIS reference** — normalized reference match.
2. **Case number** — exact 2026 case number (orders, ERF, RA 6969).
3. **PAB docket → IIS** — PAB orders and PAB penalties resolve through the PAB docket to
   the PAB NOV's IIS reference, then to the master case.

Complaints use a deliberately conservative ladder, and every match records its basis:

1. IIS reference.
2. Exact respondent name.
3. Labelled partial respondent-name match (minimum 10 characters).
4. Complaint-text name match (minimum 12 characters).

Rows that cannot be matched stay **unlinked** rather than being forced onto a case. The
Data Quality page keeps every unlinked row visible.

Duplicate IIS references are flagged. The first matching case is the displayed link, while
shared rows may also appear on duplicate cases.

---

## Counting rules and known source quirks

These notes are also shown in the dashboard so readers do not misread the totals.

- **Pending counts are row counts, not case counts.** "Pending orders" and "Pending
  payments" count register rows with a pending status. One case can carry several pending
  order or payment rows.
- **Duplicate order rows are preserved.** The current snapshot contains **5 order rows that
  duplicate an earlier row exactly** (same company, case, date, document, violation,
  status, and amount). Two more pairs share company, case, document, and status but carry
  different dates. All rows remain in the register so totals stay traceable to the sheet.
- **Paid totals only count rows with status `PAID`.** `PENDING` and blank-status rows are
  shown but excluded from collections.
- **Unlinked does not mean lost.** The enforcement and payment tabs are rolling registers
  that include prior-year cases; an unlinked row may simply belong outside the 2026 master
  list.
- **Rows without a usable date** remain in the registers but are excluded from monthly and
  aging charts.
- **Derived stages are a monitoring aid.** A case is placed at its furthest linked
  milestone (payment → PAB order → order → PAB NOV → NOV).

---

## Live refresh and offline behaviour

The header has a **Live refresh** button. It fetches the same Google Sheets tabs in the
browser via JSONP and rebuilds the dashboard without a page reload. It requires network
access to `docs.google.com`.

- On success, a toast reports the number of numbered master cases received.
- On failure (offline, blocked network, timeout), a toast explains that the bundled snapshot
  is still available. The dashboard does not blank out or discard the current data.
- Live refresh is session-only. To persist fresh data in the distributable HTML, run
  `npm run refresh` and then `npm run build:single`.

The built HTML is otherwise fully offline: React, charts, icons, styles, and the snapshot
are all inlined.

---

## CSV exports

Every register has a client-side CSV export. Exports include the current search/filter
selection where applicable, use UTF-8 with a BOM (Excel-friendly), and quote fields
containing commas or line breaks.

- Case register: 26 columns including linked-record counts, payment flags, amounts, data
  issues, and match basis.
- PAB NOV, orders, and PAB orders: 12 columns including linked 2026 case and match basis.
- ERF, PAB penalties, and RA 6969: payment details plus linked case and match basis.
- Complaints: 9 columns including linked 2026 case and match basis.
- Data Quality unlinked rows: type, reference, name, date, status, amount, and reason.

---

## Print and mobile

- The header, sidebar, mobile nav, and footer are marked `no-print`; print output contains
  the page content only.
- Tables switch to static headers for print, cards avoid page breaks, and shadows are
  removed. Use the **Print** button or the browser's print dialog to save as PDF.
- On mobile, the sidebar becomes a horizontal navigation strip. Wide registers scroll
  horizontally **inside their card**, so the page itself does not overflow sideways.

---

## Verification performed

- TypeScript type-check passes.
- Production single-file build succeeds.
- 1440 px: every register table fits inside its card without inner horizontal scrolling.
  The last columns (**Linked records** on the case tracker, **Linked case** on the
  enforcement and complaint registers) are visible, and there is no page-level overflow.
- Mobile (390 px): all six pages have no page-level horizontal overflow, the mobile nav is
  visible, and wide tables scroll within their containers. The complaint register keeps
  **Linked case** among its first visible columns.
- CSV downloads verified for cases (470 rows), linked orders (34 rows), and complaints (88
  rows), including headers and BOM.
- Print media verified: chrome is hidden, main padding removed, glass effects and page
  background removed, table headers static, and PDF generated successfully.
- Eco-glass theme verified at 1440 px and 390 px: no page-level overflow, tables remain
  readable, and the sticky header stays legible while content scrolls underneath.
- Access gate verified: all six accounts sign in, invalid credentials are rejected, the
  session survives a reload, sign-out clears the session, and the login screen is responsive
  at 390 px.
- DENR brand mark verified on the login screen, desktop sidebar, and mobile header; the
  float, halo, and sheen animations run and are disabled under `prefers-reduced-motion`.
- Live refresh completed against Google Sheets; offline refresh failed gracefully and kept
  the bundled snapshot on screen.

Temporary QA scripts are not retained in the repository.

---

## Notes for maintainers

- Keep `src/lib/liveRefresh.ts` and `scripts/refresh-data.mjs` tab lists in sync. Both
  define the same sheet ID and ranges.
- The master parser relies on fixed column positions (see `buildData.ts`). If columns move
  in the source sheet, update the indexes and `VIOLATION_COLUMNS`.
- `src/data/snapshot.json` is intentionally committed so the dashboard works offline.
- Personal contact information appears in the source and may be exported. Treat the HTML,
  CSVs, and PDFs as internal-use documents.


