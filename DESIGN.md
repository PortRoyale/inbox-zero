# Checkprint design system

Our buyers make hardware, firmware and software products. Their native documents are engineering drawings, inspection reports and the checker's redlines, so the interface borrows that vocabulary. Every device carries meaning.

| Device | Drawing convention | Meaning in the product |
| --- | --- | --- |
| Sheet with zone ticks | Drawing sheet frame | A section of the page |
| Feature-control frame (`.fcf`) | GD&T compartment frame | Labels: sheet number, CRA clause, item count |
| Balloon (`.balloon`) | Item number callout | Item IDs such as `C.4`, which also appear in the copied report |
| Yellow highlighter (`.mark-done`) | Checker marks a verified dimension | Requirement met |
| Hatched highlighter (`.mark-partial`) | No drawing equivalent | Partly met |
| Red-pen ellipse (`RedPen`) | Checker circles an error | Gap ("redline") |
| Strike-through (`.mark-na`) | Deleted item | Not applicable or out of scope |
| Revision cloud + triangle (`RevisionCloud`, `.revtri`) | Changed area on a revised drawing | Release trigger answered "yes" |
| ISO 128 section hatching (`.gauge`) | Cut material | Measured quantity (progress, scores) |
| Dimension line | Dimensioning | The timeline's day count, drawn to scale |
| Title block, revision table, general notes | Sheet furniture | Footer, changelog, FAQ |
| CAD grips (`.btn:hover`) | Selected object handles | Hover and focus on buttons |
| Stacked sheets (`.sheet` offset outline) | A drawing set | Depth on every section |
| Exploded view (`ExplodedView`) | Assembly drawing with item balloons | Home hero: each part mapped to a CRA requirement |
| Crosshair with zone and mm readout (`HeroCrosshair`) | CAD cursor and sheet zones | Home hero, fine pointers only |
| Double-ruled stamp (`.stamp`) | Approval stamp on a released drawing | Issued plan revision |
| Plotter draw-in (`.bd-traces`) | Pen plotter | Hero line work on load |

**Themes.** Light is a plotted sheet. Dark is CAD model space. Both are defined as tokens in `src/design/system.css`.

**Scales.** Spacing steps by √2 and type by ⁴√2, the ISO 216 paper ratio. Line weights are a thin/wide pair as in ISO 128. Corners are square. The only circles are balloons.

**Type.** B612 (designed for Airbus cockpit displays) is used for h1/h2 only. Atkinson Hyperlegible Next and Mono (Braille Institute) handle text and codes.

**Layout rules**

- Every page opens with the same hero (`PageHero`): sheet label, title, lead, optional facts or art, and a generated drawing backdrop that never sits behind text.
- Anything longer than about three screens is split into numbered steps (sequential tasks) or tabs (reference content) with `SheetTabs`. Side panels sit under the step index on desktop and after the content on phones.

**Rules learned by testing**

- B612 draws `(` like `[`, so it never sets citations or body text.
- Non-photo blue is invisible by design (2.95:1). The token is darkened to 5.4:1 for text and focus rings.
- The highlighter is only 1.3:1 against paper, so state never relies on it alone: selected answers also get a ✓ and an ink rule.
- Status always has a text label.
- B612 only sets page titles; any parentheses in a title are set in the text face.
- All motion stops under `prefers-reduced-motion`.

**Structure, not chip clouds**

- Any group of related items sits in a frame with a header and aligned columns: `SpecTable` (a register that stacks into labelled rows on phones), `OptionGrid` (equal checkbox cells, grouped under a label column), `CheckList` (statement rows with their legal basis) or `RefTable` (reference documents). Never a free-wrapping row of chips or pills.
- Every framed box in a column spans the column: same left and right edge as its siblings. Only lines of text get a reading measure.
- Cells that sit side by side share rows (CSS subgrid): labels on one line, controls on one line, notes on one line. Every control in a row has the same height.
- Badges come in families (priority, risk level, outcome, CRA class, scope, answers, step counters). Every badge in a family is the same width and height, whatever its label.

**One colour language**

- Green means complete or yes. Yellow means partly. Red means a gap, a block or open issues. Grey means not applicable. Blue is for links and primary actions.
- Links are always blue (light blue on dark panels) and underlined; in tables they are bold, so titles stand out from data.
- Progress bars fill with a red, yellow, green gradient laid across the whole track, so the colour a bar reaches shows how far along it is.
- Each answer carries its colour at rest (band and key cap) and fills with it when selected.

**Questionnaires are walkthroughs**

- Every questionnaire (readiness check, release gate, plan requirements) runs on `Walkthrough`: one question at a time, sections as levels, a segmented progress rail, key caps (1 to 4 or Y, P, N, A), feedback, auto-advance, a level-complete stamp, a review table and resume.
- The question itself is the largest text on the screen; the requirement name is a small label above it.

**Enforced by audits** (`node scripts/audit/edges.cjs <url>` and `node scripts/audit/badges.cjs <url>`): every framed box shares its column edges, rows in strips and card rows line up, and every badge family is uniform, at desktop and phone widths.
