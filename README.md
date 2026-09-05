# OpportunityBridge

OpportunityBridge is a responsive student-opportunity discovery website built as an independent portfolio/public-interest project. It helps students find scholarships, fellowships, internships, research programs, college-access programs, and career-development opportunities based on their education stage, interests, financial context, geography, and access barriers.

## Current build

- **80 source-verified opportunity records** for the 2026–2027 cycle and announced 2027 cycles
- Profile-based ranking with transparent match reasons
- Search, sorting, “Likely matches,” and saved-opportunity filters
- Expanded academic/career-interest filters and all 50 states + Washington, D.C.
- Optional identity eligibility filters that stay on-device
- LocalStorage bookmarks with no account required
- Responsive desktop/mobile UI and accessible keyboard/focus behavior
- Opportunity cards with award details, eligibility notes, deadline/status information, and official-source links
- Detailed opportunity modal views
- Searchable source-transparency page

## Verification policy

The opportunity dataset was researched against **official program, organization, government, admissions, or application pages** and this build is marked as verified on **September 4, 2026**.

A program is included only when an official current source supports that it is still active. “Active” can mean the current application is open, a future cycle has been officially announced, an interest/nomination form is live, the program is a recurring current program awaiting its next window, or an official opportunity directory is actively maintained. The site does **not** label a pending future cycle as open. If no exact deadline has been published, it says so instead of guessing.

See `SOURCES.md` or the website’s **Source Notes** page for the verification record behind every listing. Program details can change after verification, so the official source always controls.

## Privacy

The matcher runs entirely in the browser. Profile selections are not sent to a backend in this version. Saved opportunities use browser `localStorage` and can be removed by clearing site data.

## Files

- `index.html` — landing page
- `discover.html` — profile matcher, filters, search, sort, and saved programs
- `resources.html` — application-planning guidance and official resource links
- `about.html` — mission, verification method, and privacy explanation
- `sources.html` — searchable official-source transparency page
- `styles.css` — responsive visual system
- `app.js` — matching, filtering, saving, modal, and UI behavior
- `data.js` — verified opportunity records and resource links
- `logo-mark.svg` / `favicon.svg` — OpportunityBridge mark
- `SOURCES.md` — human-readable verification log
