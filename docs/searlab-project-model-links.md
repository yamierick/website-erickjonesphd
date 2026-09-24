# Linking SEAR project pages to the models hosted here

searlab.uta.edu lists projects as cards that open a fairly plain page: a
description, a picture, and a list of document links. Several of those projects
are about exactly what the models on this site show. This file records which
project should link to which model, and how to link so the reader lands on a
configuration that matches the project rather than on a generic default.

Nothing here has been applied. The searlab side is WordPress and only Jones can
edit it. This is the mapping, ready to act on.

**Provenance.** The 29 projects below were pulled from searlab's public
WordPress REST API on 2026-09-24 — `/wp-json/wp/v2/sponsored-project` (10) and
`/wp-json/wp/v2/active-project` (19), both with `per_page=100`. The Projects
page paginates client-side, so reading the page itself under-reports. Titles are
reproduced as the API returns them, including the typos in the source
("Cost-Effecitve", "Manufactuing") — match on those, not on corrected spellings.

---

## The technique: link to a configured model, not a bare one

All three models keep their control state in the query string, so a link can
preset the scenario. Unknown parameters are ignored, and every value is clamped
to its control's own `min`/`max`, so a malformed link degrades to the default
rather than breaking the page.

**One caveat that costs a wasted link:** each model writes only the parameters
that *differ* from its defaults. Passing a default is a no-op and demonstrates
nothing. `/lead-time/?y=2035` looks like it sets a target year; 2035 is already
the default, so the page is identical to the bare URL.

### `/materials/` — demand → capacity → component → material → ore

| Key | Control | Notes |
|---|---|---|
| `s` | scenario | `gas`, `balanced` (default), `solar`, `wind` |
| `p` | period | which of the three periods is shown |
| `g` | gas share | |
| `sw` | solar/wind ratio | |
| `st` | storage hours | |
| `lfp` | LFP share of chemistry | |
| `dg` | demand growth | |

### `/recovery-loop/` — retirement, recovery and secondary supply

| Key | Control | Notes |
|---|---|---|
| `m` | mineral | `lithium`, `nickel`, `cobalt` only |
| `life` | pack lifetime, years | 5–20, default 12 |
| `rec` | recovery rate | |
| `col` | collection rate | |
| `dg` / `pg` | demand / primary growth | |
| `lfp` | LFP share | |
| `sl` | second-life share | |

### `/lead-time/` — when the decision had to be made

| Key | Control | Notes |
|---|---|---|
| `y` | target year | 2028–2060, **default 2035** |
| `discovery` `feasibility` `permitting` `construction` `rampUp` | stage durations, years | each clamped to its own slider |

---

## Tier 1 — unambiguous

These three are the same subject matter as the model, not merely adjacent.

| Project | Link | Why |
|---|---|---|
| **Lithium Small-Scale Recycling Process** (sponsored) | `/recovery-loop/?m=lithium` | The recovery loop *is* this project's thesis. Best match on the list. |
| **Analyzing Critical Mineral Flows** (active) | `/materials/` | The model is literally a critical-mineral flow diagram. |
| **Critical Mineral Supply Chains Optimization Model** (sponsored) | `/materials/` and `/lead-time/?y=2030` | The toy version of the project. Lead time is a constraint any such optimization carries, and 2030 shows a target whose decision point has already passed. |

## Tier 2 — natural, but a judgement call

Defensible rather than obvious. Listed so the reasoning is on record, not because
they must all be done.

| Project | Link | Why |
|---|---|---|
| EV Battery Degradation Testing | `/recovery-loop/?m=nickel&life=8` | Degradation sets pack lifetime, which is the model's own lag parameter. A short life is the project's subject. |
| EV Adoption Scenario Evaluation | `/recovery-loop/` | Adoption feeds the retirement stream the model consumes. |
| Texas Energy Generation Cataloguing | `/materials/?s=solar` | The generation mix is the model's input. |
| Game Theoretical Multi Agent Critical Mineral Supply Chain | `/lead-time/` | Entry timing is what the game is about. |

Verified live 2026-09-24: every URL above returns 200, and
`/recovery-loop/?m=nickel&life=8` presets *both* controls.

---

## The gap: projects that want a model that does not exist

The more interesting half. Three candidates, in the order I would build them.

**1. An ERCOT-specific materials model.** Three projects point at it —
*ERCOT Transmission Expansion Planning using REEDS*, *Key Metrics in the ERCOT
Grid*, and *Texas Energy Generation Cataloguing*. The existing `/materials/`
cascade already does the work; what it lacks is a real Texas generation mix in
place of a generic one. The data is public, one model would serve all three
projects, and "what Texas's grid is actually made of" is a far more shareable
object than the generic version. Being a Texas lab is the whole point.

**2. City of Dallas Green Warriors Weatherization Program.** Spend → energy saved → bill reduction →
payback, for a household. The most legible model on this entire list to a
non-technical reader, and it is community-facing work that deserves something
people can use rather than read about.

**3. Calculating Carbon Intensity of Commodity Trade Flows.** Has the same shape as the
existing cascade — a quantity following a chain of coefficients — so it would
reuse the most machinery for the least new work.

**A debt worth clearing while nearby.** The day-shape load curve on `/materials/`
is deliberately fake: the model has no time resolution, so the curve is
illustrative and labelled as such, and it does not respond to the controls.
*Grid-Interactive and Efficient Buildings Testing and Development with NREL*, or
any of the ERCOT projects, could supply a real load shape and retire that
schematic. See the note
in `MaterialCascade.astro` explaining why it is inert — the reason is a rule
about not drawing what the model cannot compute, so replacing it means bringing
real data, not relaxing the rule.

---

## Everything else

Recorded so a later pass does not re-derive the same "no" 22 times. These have no
natural model here: AI-Driven Supply Chain Optimization · Comparing US State
Budget Allocations · Tarrant County Land and Property Value Distribution · GIS
Analysis of DFW Trails by Census Tract · Development of Portable and
Cost-Effecitve Water Quality Sensors · US Asset Analysis Analyzed at County Level
ArcGIS · Rural Farm Renewable Generation and Usage Monitoring · Air Quality
Sensor and Analysis Strategy · RAID Lab RFID System Development · GIS Evaluation
of County Assets in US · Analyzing Texas State Budget · IE Course Module: Lego
Manufactuing · SEAR Lab Renewable Generation and Usage Monitoring · GIS
Evaluation of Geothermal Potential in US · Lemelson Engineering for One Planet
UTA Institutionalization · City of Dallas Sidewalk Repair Program Queueing Model
· DOD Hybrid Energy Storage Module.

The two Renewable Generation Monitoring projects are the closest of these: both
produce real generation data, which is an input the models currently take as an
assumption. If either accumulates a public dataset, revisit.
