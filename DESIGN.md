# Checkprint design system

Our buyers make hardware, firmware and software products. Their native documents are engineering drawings, inspection reports and the checker's redlines, so the interface borrows that vocabulary. Every device carries meaning.

| Device | Drawing convention | Meaning in the product |
| --- | --- | --- |
| Sheet with zone ticks | Drawing sheet frame | A section of the page |
| Feature-control frame (`.fcf`) | GD&T compartment frame | Labels: sheet number, CRA clause, item count |
| Balloon (`.balloon`) | Item number callout | Item IDs such as `C.4`, which also appear in the copied report |
| Yellow highlighter (`.mark-done`) | Checker marks a verified dimension | Requirement met |
| Hatched highlighter (`.mark-partial`) | — | Partly met |
| Red-pen ellipse (`RedPen`) | Checker circles an error | Gap ("redline") |
| Strike-through (`.mark-na`) | Deleted item | Not applicable or out of scope |
| Revision cloud + triangle (`RevisionCloud`, `.revtri`) | Changed area on a revised drawing | Release trigger answered "yes" |
| ISO 128 section hatching (`.gauge`) | Cut material | Measured quantity (progress, scores) |
| Dimension line | Dimensioning | The timeline's day count, drawn to scale |
| Title block, revision table, general notes | Sheet furniture | Footer, changelog, FAQ |
| CAD grips (`.btn:hover`) | Selected object handles | Hover and focus on buttons |

**Themes.** Light is a plotted sheet. Dark is CAD model space. Both are defined as tokens in `src/design/system.css`.

**Scales.** Spacing steps by √2 and type by ⁴√2, the ISO 216 paper ratio. Line weights are a thin/wide pair as in ISO 128. Corners are square. The only circles are balloons.

**Type.** B612 (designed for Airbus cockpit displays) is used for h1/h2 only. Atkinson Hyperlegible Next and Mono (Braille Institute) handle text and codes.

**Rules learned by testing**

- B612 draws `(` like `[`, so it never sets citations or body text.
- Non-photo blue is invisible by design (2.95:1). The token is darkened to 5.4:1 for text and focus rings.
- The highlighter is only 1.3:1 against paper, so state never relies on it alone: selected answers also get a ✓ and an ink rule.
- Status always has a text label. Yellow means *verified*, which is a drafting convention most users won't know.
