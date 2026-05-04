# Third-party attributions

This file tracks external projects whose work — code, schemas, or visual
references — has informed `radarscope`. We list everything we borrowed
from, even if only as inspiration, so credit is traceable.

## Vendored / ported

### openscope — MIT
- Project: <https://github.com/openscope/openscope>
- Copyright (c) 2014 Jon Ross
- License: MIT (see `licenses/openscope-LICENSE.md`)
- What we use:
  - **Airport JSON schema** — adapted into TypeScript types in
    [`src/core/atc/airports.ts`](src/core/atc/airports.ts). Field
    semantics, units, coordinate formats, and route-restriction syntax
    follow the openscope conventions documented in
    `documentation/airport-format.md` of their repo.
  - **ATC command verbs / abbreviations** — enumerated in
    [`src/core/atc/commands.ts`](src/core/atc/commands.ts). Verb list
    sourced from openscope's `documentation/commands.md`.

## Visual / design references (not code)

### a320pfd by licarth — no license declared
- Project: <https://github.com/licarth/a320pfd>
- Treated as visual reference only. Color hex values themselves are not
  copyrightable. We adopted one technique:
  - `filter: drop-shadow(0 0 1px black)` on the FD bars and the fixed
    aircraft reference symbol in
    [`src/svelte/instruments/AttitudeIndicator.svelte`](src/svelte/instruments/AttitudeIndicator.svelte),
    for legibility against the sky/ground fills.

### patricksurry/g3 — ISC
- Project: <https://github.com/patricksurry/g3>
- Architectural reference: their reusable-chart DSL
  (`g3.gauge().metric(...).range(...)`) is a model for any future
  composable-gauge layer if/when we add EICAS or steam-gauge surfaces.
  No code currently borrowed.

### FlyByWire Simulations — GPLv3 + CC-BY-NC
- Project: <https://github.com/flybywiresim/aircraft>
- **License-incompatible with MIT — code MUST NOT be copied.**
- Used only as architectural reference for separating
  PFD/ND/ECAM/MCDU into independent surfaces sharing a common state bus.

### FlightGear Canvas EFIS framework — GPLv2
- Wiki: <https://wiki.flightgear.org/Canvas_EFIS_framework>
- **Code license-incompatible.** Inspiration only: the pattern of
  authoring EICAS/ECAM pages as Inkscape SVG with `id`-bound dynamic
  elements, rather than hand-coding hundreds of SVG nodes.