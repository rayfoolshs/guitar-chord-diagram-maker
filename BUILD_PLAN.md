# Build Plan — Guitar Chord Diagram Maker

A plan for recreating the core of [guitarscribble.com/chord-chart](https://guitarscribble.com/chord-chart)
as a self-contained, vanilla HTML/CSS/JS web app.

**Stack:** Vanilla HTML + CSS + JavaScript. No framework, no build step.
**Primary scope:** Interactive fretboard editor, chord detection, chord lookup,
audio preview, and PNG/SVG/embed export.
**Later phases (optional):** local saving, then account-backed collections.

> **Build status:** M1–M7 are implemented. See the file layout below; open
> `index.html` in a browser to run it. Verified: fretboard rendering, dot/barre
> editing, O/X toggles, chord detection, chord lookup (incl. jazz shorthand),
> SVG + PNG export, and the embed modal.

---

## 1. What the reference tool does

A single-page tool where you click a fretboard to build a chord shape. As you
add notes it names the chord, lets you look up known voicings, plays the chord
back, and exports it as an image or embeddable snippet.

Core user-facing capabilities:

| Capability | Behavior |
|---|---|
| Fretboard editing | Click a fret/string intersection to place a finger dot |
| Dot editing | Click a placed dot to set its finger number (1–4, T) or remove it |
| Barre chords | Drag across strings on the same fret to draw a barre |
| Open/muted strings | Toggle each string's open (O) / muted (X) marker |
| Chord title | Editable text input, auto-filled from detection or lookup |
| Tuning | Standard, Drop D, Open G, Open D, Open E, DADGAD, Half Step Down |
| Fret window | Starting fret (1–12) and number of frets shown (3–7) |
| Chord detection | Suggests possible names for the current notes, ranked |
| Chord lookup | Type a chord name, pick from common voicings, loads onto fretboard |
| Audio preview | Strum the current shape using Web Audio |
| Export | PNG download, SVG download, and embed code (image or inline SVG) |

Non-core (accounts, saving, collections, Pro gating, ads, analytics) is out of
scope for the primary build and addressed in the later phases.

---

## 2. Architecture

Keep the whole app in a small set of files with clear responsibilities. No
bundler — plain `<script>` tags in dependency order.

```
index.html          Markup: layout, controls, modals, SVG host
css/styles.css      All styling (editor layout, controls, modals, responsive)
js/theory.js        Note math, tunings, chord formulas, detectChords()
js/voicings.js      CHORD_LIBRARY voicing data + lookupChords()
js/fretboard.js     SVG rendering, pointer handling, barre drag, popover
js/audio.js         Web Audio preview (strum)
js/export.js        SVG builder, PNG/SVG download, embed code
js/app.js           State, wiring, init (entry point, loaded last)
```

State lives in one plain object in `app.js`; every mutation calls `render()`
which redraws the SVG and refreshes suggestions. This mirrors how the reference
keeps a single source of truth and re-renders.

### Data model

```js
state = {
  tuning: 'standard',        // key into TUNINGS
  startFret: 1,              // 1 = open position
  numFrets: 5,
  title: '',
  // Per string, index 0 = low E (6th string) ... index 5 = high E (1st string)
  strings: [
    { state: 'open' | 'mute' | 'fretted',
      fret: 0,               // absolute fret number when fretted
      finger: 0 },           // 0 = none, 1..4, 5 = thumb
    ...
  ],
  barres: [ { fret: 0, from: 0, to: 5, finger: 1 } ]  // absolute fret
}
```

Notes for detection are derived from `strings` + `tuning` on demand; do not
store derived note sets.

---

## 3. Milestones

### M1 — Static shell and fretboard rendering
**Goal:** a correctly drawn, non-interactive fretboard.

- Page layout: title input, fretboard panel, controls panel, action bar.
- `renderFretboard()` builds the SVG from scratch each call:
  - 6 vertical string lines (thin→thick left→right).
  - `numFrets + 1` horizontal fret lines; the top line is the thick nut when
    `startFret === 1`, otherwise a normal line with a fret-number label.
  - String labels under the board, fret markers (dots) at 3/5/7/9/12.
  - Open (O) / muted (X) markers above the nut per string.
  - Dots and barre rectangles drawn from `state`.
- Responsive: board scales to fit the fretboard panel; controls stack under it
  on narrow screens.
- Deliverable: pixel-accurate board that redraws from state.

### M2 — Interaction
**Goal:** build and edit shapes with mouse and touch.

- Pointer down/up on fret cells → `placeDot` / `removeDot`.
- Click a dot → popover with finger buttons (1–4, T) and Remove.
- Drag horizontally across strings on one fret → `addBarre(fret, from, to)`;
  remove on click of the barre rect.
- Click O/X markers above the board → cycle open/mute/fretted per string.
- Clear button resets dots, barres, title.
- Use Pointer Events (not mouse events) so touch works; `touch-action: none`
  on the SVG to prevent scroll while dragging.

### M3 — Music theory engine
**Goal:** accurate chord naming for any shape.

- `NOTE_NAMES`, sharp/flat name tables, `noteToSemitone()`.
- `TUNINGS` as semitone arrays (string 6→1) and display labels.
- `CHORD_FORMULAS`: each entry has `required` and `optional` interval sets
  covering power chords, triads, sus, 6th, 7th, add9, 9th, 11th, 13th,
  altered dominants, and 6/9.
- `detectChords(noteSet, bassNote)`:
  1. For each candidate root, compute intervals; require all `required`
     intervals present and every sounding note explained by required+optional.
  2. Apply filters (sus must not contain a 3rd; power chord only for exactly
     2 notes; dominant 11 clashes with a major 3rd).
  3. Score: exact match > full-with-optionals > partial; bonus when bass is the
     root; small penalty by formula order; bonus for common types.
  4. Second pass for slash chords where the bass is a non-chord tone.
  5. Deduplicate, suppress slash noise, return top ~5.
- Render suggestions as clickable pills that set the title.
- Deliverable: `detectChords()` unit-tested against a table of known shapes.

### M4 — Chord lookup
**Goal:** load a known voicing by name.

- `CHORD_LIBRARY`: name → array of voicings; each voicing is six fret values
  (`-1` muted, `0` open) from string 6 to string 1. Cover major/minor triads,
  power, sus2/sus4, dim, aug, dominant/major/minor 7th, mMaj7, m7b5, dim7,
  add9, 6th, 9th, and common extensions.
- `lookupChords(query)` normalizes input and aliases jazz shorthand
  (`A-7`→Am7, `A△7`→Amaj7, `Bø7`→Bm7b5, `C°7`→Cdim7, `D+`→Daug).
- Dropdown shows matches with their fret pattern; selecting one calls
  `loadVoicing(frets, name)` which converts to `state` and re-renders.
- Deliverable: typing a name shows voicings; clicking loads the board.

### M5 — Audio preview
**Goal:** hear the shape.

- Lazy-create one `AudioContext` on first user gesture.
- Build a short plucked tone per note: oscillator + gain envelope, optionally
  through a light filter, at the correct frequency
  (`STRING_BASE_FREQ[tuning][string] * 2^(fret/12)`).
- `playChord()` schedules each sounding string a few ms apart to simulate a
  strum; muted strings are skipped.
- Note Audio toggle enables/disables per-note feedback while editing.
- Call `navigator.audioSession.type = 'playback'` where supported (iOS).
- Deliverable: Play strums the chord; correct pitch per tuning and fret.

### M6 — Export
**Goal:** get the diagram out of the browser.

- `buildCleanSVG(options)`: render a standalone SVG (no UI chrome, transparent
  or white background, optional title and diagonal watermark) from `state`.
  This is the single source used by all export paths.
- SVG download: serialize to a Blob and trigger download.
- PNG download: draw the SVG into an offscreen canvas at 2–3× scale, then
  `canvas.toBlob()` and download. Await image load before drawing.
- Embed: modal with two tabs.
  - Image embed: `<img src="..." alt="...">` (requires hosted PNG/SVG).
  - Inline SVG: the raw `<svg>` markup pasted into the page.
  - Live preview + copy-to-clipboard with "Copied" feedback.
- Deliverable: all three export paths produce correct output.

### M7 — Polish
- Keyboard: Enter in lookup selects first result; Esc closes modals.
- Accessibility: focus states, ARIA labels on controls, popover focus trap.
- Empty states and validation for the title and lookup.
- Cross-browser pass (Chrome, Safari, Firefox) and mobile touch pass.
- Performance: keep `renderFretboard()` allocation-light; debounce lookup.

---

## 4. Key implementation notes

**Fretboard geometry.** Compute a cell width/height from a fixed board size,
then derive every coordinate from `(string, fret)` so rendering and hit-testing
share one function. Store barres by absolute fret; when `startFret > 1`, render
fret positions relative to the window but keep the underlying data absolute.

**Hit-testing.** Prefer one `pointerdown` handler on the SVG that maps the
event coordinates to the nearest cell rather than many per-cell handlers. This
keeps the DOM small and makes drag-to-barre easy (track `from`/`to` during
`pointermove`, commit on `pointerup`).

**Single render path.** Every action mutates `state`, then calls one `render()`
that redraws the SVG and recomputes suggestions. Avoid incremental DOM edits;
the board is small enough that a full redraw is simplest and bug-resistant.

**Detection correctness.** The scoring is heuristic, not definitive — many
voicings are enharmonic (Am7 ≡ C6). Always show multiple suggestions and let
the user pick, and make the title freely editable.

**PNG export gotcha.** SVG must be fully self-contained (inline styles, no
external fonts) before rasterizing, or the canvas will render blank. Set
explicit `width`/`height` on the exported SVG root.

---

## 5. Testing

- **Theory:** table-driven tests for `detectChords` — feed known note sets and
  assert expected names are present and ranked first (e.g. `[0,3,7]`→Am, C6 vs
  Am7 ambiguity, slash chords).
- **Lookup:** alias normalization and that every library entry maps to valid
  `state`.
- **Interaction:** manual scripted checks — place/remove dots, draw and remove
  a barre, toggle O/X, change tuning/fret window, clear.
- **Export:** verify downloaded SVG re-renders standalone and PNG is non-blank
  at expected dimensions.
- **Responsive:** 360px, 768px, 1280px widths; touch drag on a real device.

No test framework is required for M1–M7; a small `tests.html` page that runs
assertions in the console is enough. Add Vitest only if the theory engine grows.

---

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Chord detection gives confusing names | Show ranked alternatives, keep title editable, document limits |
| Barre drag feels wrong on touch | Pointer Events + `touch-action: none`; test on device early |
| PNG export blank | Fully inline SVG, explicit dimensions, await image load |
| Voicing library incomplete | Start with common shapes; add extensions incrementally |
| Audio blocked until gesture | Create `AudioContext` only on first click/Play |

---

## 7. Build vs. library: MusicTheoryJS

**Decision: build the custom theory module (M3); do not adopt
[MusicTheoryJS](https://musictheoryjs.com/) for the core tool.** Revisit it
when the project grows into a broader music-tools suite (Phase C).

MusicTheoryJS is a capable, well-maintained library (ISC license, zero
dependencies, ESM+CJS, tree-shakable to ~2 KB per class, ~41 KB gzipped for
everything). It is the right tool for composition/analysis apps — but not for
this one.

**Overlap with the plan:**

| Plan module | Covered by MusicTheoryJS? |
|---|---|
| M3 — chord detection | Partially (`detectChord` returns one best name) |
| Note/tuning math | Yes, but trivial (~20 lines) |
| M1/M2 — fretboard render + interaction | No |
| M4 — chord lookup (guitar fingerings) | No |
| M5 — audio | No (only gives frequencies) |
| M6 — export | No |

**Why it does not fit:**

1. **It misses the hard parts.** The two genuinely difficult pieces — SVG
   fretboard interaction (barres, hit-testing, O/X) and a *guitar* fingering
   library (`Am = x02210`) — are not in the library. Its voicings
   (`LEFTHAND_VOICINGS`, `drop2`, `TRIAD_VOICINGS`) are piano/jazz
   close-position shapes written as intervals, not open-position guitar shapes.
2. **Detection behavior differs.** `detectChord` returns a single best chord,
   preferring the bass as root. The tool needs ranked multiple suggestions and
   slash-chord handling (Am7 ≡ C6). You would wrap the library to get back to
   the wanted behavior.
3. **It fights the no-build-step decision.** It is npm-first with no UMD/global
   build, so a plain `<script>` page would need a CDN + `<script type="module">`
   + import maps, or a bundler (Vite) — adding complexity and an external
   runtime fetch to a tool that otherwise works offline.

**Revisit when:** the project expands into theory-heavy tools — progressions,
scales, Roman numerals, key detection, MIDI, or notation — where the library
saves substantial work and its strengths actually apply. Also worth adopting if
the stack later moves to a build step (Vite/React).

---

## 8. Later phases (out of primary scope)

- **Phase A — Local saving:** persist chords and collections to `localStorage`;
  library modal with sort, rename, delete, and reload onto the board. No server.
- **Phase B — Accounts & backend:** user accounts, server-stored chords and
  collections, shareable links, public listing/moderation, and free/Pro tier
  gating (mirrors the reference's full feature set).
- **Phase C — Distribution:** SEO content pages, social meta tags, analytics,
  and a link-back in embeds.

---

## 9. Suggested order of work

1. M1 rendering → M2 interaction (a usable editor)
2. M3 detection → M4 lookup (it feels smart)
3. M5 audio → M6 export (it feels complete)
4. M7 polish, then reassess Phase A/B/C

Ship after M6 as a fully usable single-page tool; everything else is additive.
