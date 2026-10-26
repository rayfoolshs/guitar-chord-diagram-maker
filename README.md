# Guitar Chord Diagram Maker

Click a fretboard to build a chord shape. The app names the chord as you go, plays it back,
and exports the diagram as PNG, SVG or an embeddable snippet.

**[Open the Chord Diagram Maker →](https://rayfoolshs.github.io/guitar-chord-diagram-maker/)**

---

## Features

- **Interactive fretboard** — click to place a finger, click a dot to label or remove it,
  drag to build barres, and set open/muted strings per string.
- **Chord detection** — names the shape you have built, including inversions and slash
  chords, with a confidence-friendly name rather than a single rigid answer.
- **Chord lookup** — browse known voicings for a chord, including jazz shorthand.
- **Audio preview** — hear the shape you have built.
- **Export** — PNG and SVG download, plus an embed snippet for pasting into a page.
- **Titles** — give each diagram a name before exporting.

## Using it

1. Click frets to add notes to the shape.
2. Use the O/X controls to mark open and muted strings.
3. Read the detected chord name, or look up alternatives from the chord search.
4. Hit play to hear it, then export as PNG/SVG or grab the embed code.

## Files

| File | Role |
| --- | --- |
| `index.html` | App shell |
| `js/theory.js` | Notes, intervals, chord naming |
| `js/voicings.js` | Known chord shapes and lookup |
| `js/fretboard.js` | Fretboard rendering and interaction |
| `js/audio.js` | Web Audio preview |
| `js/export.js` | SVG/PNG/embed export |
| `js/app.js` | Wiring and state |
| `css/styles.css` | Layout and styling |
| `BUILD_PLAN.md` | Design notes and milestone status |

## Run it

No build step, no dependencies:

```bash
open index.html
# or
python3 -m http.server 8000
```

Built as a self-contained alternative to the chord-chart tool at guitarscribble.com — see
`BUILD_PLAN.md` for the scope and the phases that are implemented.
