# OpportunityBridge

OpportunityBridge is a privacy-first opportunity discovery engine for students who may not already have access to the networks, counselors, or insider knowledge that often surface high-value programs. It currently indexes **133 source-linked scholarships, fellowships, internships, research programs, college-access programs, and technical/career opportunities**.

The project deliberately keeps the visible product simple: build a local match profile, understand why a program surfaced, save useful results, and go directly to the official source. Under that interface is a systems-oriented matching and source-health architecture built to make the catalog faster to evaluate, easier to validate, and less likely to decay into a stale list.

## System Microarchitecture

```text
Student profile
     │
     ▼
64-bit BigInt signal vector ──────────────┐
                                          │
Opportunity required / preferred /        ├──► C++ WebAssembly core ───► score + match reasons
excluded masks                            │             │
                                          │             └──► measured local telemetry
Stage + interest + region context ────────┘

Official program sources
     │
     ▼
Scheduled GitHub Actions source monitor
     │
     ├── reachable / no discontinuation evidence ─► source checked
     ├── transient failure / bot block ───────────► needs_review
     └── strong discontinuation evidence or
         2 consecutive 404/410 responses ─────────► discontinued ─► withheld from discovery
```

OpportunityBridge is intentionally deployable as a static site. The browser performs profile matching, while repository automation maintains validation and source-health artifacts. The scheduled source workflow deploys its refreshed snapshot directly, so a bot-authored health commit does not depend on a second push-triggered workflow. This avoids sending sensitive profile context to an application server and keeps operational complexity low.

## Deterministic Match Engine

The matcher models a student profile as a **64-bit signal vector**. Signals cover access context, optional identity-based eligibility, citizenship/work context, institution type, academic context, and technical/career interests.

Examples include:

```text
LOW_INCOME        bit 0
PELL              bit 1
FIRST_GEN         bit 2
...
PHD_INTENT        bit 32
...
SOFTWARE          bit 62
TECH              bit 63
```

Each opportunity is compiled into three masks:

- `requiredMask` — positive signals that strengthen confidence for requirements or high-value eligibility context
- `preferredMask` — signals that improve ranking without determining eligibility
- `excludedMask` — explicit positive conflicts, used sparingly

Stage and interest compatibility are passed alongside the 64-bit profile vector because they are multi-valued context rather than simple booleans. A small deterministic wrapper then applies state and institution compatibility only when a program explicitly restricts those fields; otherwise they remain neutral.

An important design rule is that **missing optional profile data is unknown, not false**. If a student does not disclose gender, financial context, race/ethnicity, or another optional field, the engine does not infer ineligibility. This avoids turning privacy into a ranking penalty.

The bit-vector architecture is inspired by compact boolean-state evaluation used throughout systems programming and digital design. It is not presented as RTL or hardware synthesis; it is a deterministic software representation chosen for compactness, predictable evaluation, and technical clarity.

## C++ / WebAssembly Core

The scoring kernel is implemented in `src/matcher.cpp` and compiled to WebAssembly. The browser passes 64-bit masks directly to the compiled function using JavaScript `BigInt`/Wasm `i64` interop.

The site also ships a functionally equivalent JavaScript BigInt fallback. CI checks the two implementations against **2,000 randomized vectors** to catch divergence between the compiled core and fallback behavior.

This split keeps rendering and interaction in JavaScript while isolating the deterministic scoring core in compiled C++.

## Runtime Diagnostics

A hidden **Developer Diagnostics** panel on the Discover page exposes measurements from the current browser and machine:

- active engine: C++/WebAssembly or JavaScript fallback
- average measured evaluation latency using `performance.now()`
- user-triggered local benchmark throughput
- vector cache hits and misses
- Wasm module size
- visible program count
- current source-health snapshot date

No performance number is hard-coded into the project documentation. Browser timing depends on hardware, browser, power state, and workload, so benchmarks are generated at runtime instead of turning one local measurement into a universal claim.

## Data Model & Verification

`data/opportunities.json` is the canonical catalog. Every record is validated against `schemas/opportunity.schema.json` before generated browser assets are accepted.

Validation covers:

- required fields and types
- unique IDs, program names, and record numbers
- ISO date formatting
- HTTPS official-source URLs
- valid 64-bit signal assignments
- contradictory required/excluded signals
- application-open/application-close ordering
- structured eligibility notes and requirement lists when the official source supplies enough detail

`data.js`, `signals.js`, and `verification.js` are generated artifacts. CI fails if regenerated files do not match the committed source data.

## Automatic Source Health

The scheduled verification workflow checks every official program URL and stores state in `verification/health.json`. Source health and program review are deliberately separate: a successful request proves that the official page is reachable, while `lastVerifiedAt` records the latest human review of the program details. The interface stops calling a source "checked" if its automated result is more than 14 days old.

The removal policy is intentionally conservative:

- A closed application window is **not** a discontinued program.
- A timeout, 403, 429, or other transient/bot-protection response becomes `needs_review` and the listing remains visible.
- One 404/410 becomes `needs_review`.
- Two consecutive scheduled 404/410 responses withhold the listing.
- Strong, explicit source language such as “program has been discontinued” or “no longer offered” can withhold it immediately.

The browser excludes only records whose health state is `discontinued`. This gives the catalog an automatic stale-program removal path without treating ordinary annual application cycles as program failures.

Structured application dates are evaluated in the browser on each visit, so a program automatically moves from **Upcoming → Open → Window closed** without a manual UI edit.

## Catalog Standard

A record is included only when an official source confirms that the underlying program is active or recurring. “Active” can mean:

- applications are open now
- a future cycle is officially announced
- the program is accepting interest/notification signups
- the program is a current recurring opportunity whose next window is pending
- an official active program directory is maintained

The project does not invent an unpublished deadline. `SOURCES.md` contains the human-readable source ledger for every listing.

## Privacy Model

OpportunityBridge does not require an account. Matching runs locally in the browser. Optional identity, financial, and academic profile inputs are never submitted to an OpportunityBridge backend.

The only persistent client state is browser `localStorage` for:

- theme preference
- saved opportunity IDs
- optional local match-profile state

Users can clear that state at any time through the site or browser storage controls.

## Interface Design

The product is intentionally restrained rather than feature-heavy. The primary surfaces are:

1. **Discover** — context profile, local ranking, search/filtering, save state, source status, and details
2. **Sources** — searchable official-source transparency ledger
3. **Resources** — a concise application workflow
4. **About** — system design, verification policy, and privacy model

The desktop profile panel uses an independently scrollable sticky container with an always-visible action bar, so long result lists do not trap the profile controls below the opportunity feed. Mobile converts the profile panel into an explicit filter drawer.

The UI supports light and dark themes using CSS custom properties. A stored preference takes priority; otherwise the initial theme follows `prefers-color-scheme` before first paint.

## Repository Structure

```text
.
├── index.html
├── discover.html
├── resources.html
├── about.html
├── sources.html
├── styles.css              # public-facing visual system
├── matcher-layout.css      # matcher layout and compatibility layer
├── theme.js
├── app.js
├── matcher.js
├── matcher.wasm
├── data.js                 # generated
├── signals.js              # generated
├── verification.js         # generated
├── data/
│   └── opportunities.json  # canonical catalog
├── verification/
│   └── health.json
├── schemas/
│   └── opportunity.schema.json
├── src/
│   └── matcher.cpp
├── scripts/
│   ├── build_assets.py
│   ├── validate_data.py
│   ├── verify_sources.py
│   ├── test_matcher.py
│   └── test_wasm.mjs
└── .github/workflows/
    ├── deploy-pages.yml
    ├── validate.yml
    └── verify-opportunities.yml
```

## Design Tradeoffs

**Why not a server-side recommendation API?**  
The dataset is small enough that local evaluation is immediate, and avoiding a server means profile context does not need to leave the device.

**Why WebAssembly for a catalog this size?**  
It is not required for speed at 133 records. It is used as a deliberate systems-programming exercise that cleanly separates a deterministic computational core from the UI. The JavaScript fallback keeps the product robust.

**Why not automatically scrape and rewrite all deadlines?**  
Official sites format dates inconsistently, and silently extracting the wrong date would reduce trust. OpportunityBridge automates structured-date transitions and source health, while changed page fingerprints create a review signal for human verification of new cycle details.

**Why not instantly delete a 404?**  
Organizations redesign websites, move pages, and block automated requests. The two-failure rule reduces accidental removal while still providing an automatic path for genuinely dead sources.

---

OpportunityBridge is an independent student project by **Abdel Alshawa** and is not affiliated with the organizations listed in the catalog. Official program sources always control eligibility, deadlines, and application decisions.
