# MindFull — Vision & Build Plan (v2)

*A visual research environment that thinks the way an associative mind does.*
*v2 — updated July 4, 2026, after the planning session that reframed MindFull as a research app.*

---

## For the AI building this (read first)

Phases 1 and 2 of v1 are **done**: SQLite backend (`src/`), full Thought CRUD, tags, Go Deeper, drag/pan, typed connections with sound and the light pulse. The schema (`src/db/schema.sql`) already supports many-to-many Memories, typed connections, tags, and an `events` table for the Timeline.

Everything in v1 about keeping the soul still holds: the name, logo, dark space aesthetic, canvas feel, music, sound effects, and the astronaut all stay. This v2 supersedes v1's concept, terminology, and roadmap sections.

---

## The concept (v2)

MindFull is a **research app** for people who don't think in straight lines. The artifact isn't the conclusion — it's the *thought process*.

You drop **Thoughts** onto your canvas (your Inner Space) and connect them. Chains of connections form colored **Pathways** branching off an **Origin**. The pathways of a study get wrapped in a soft, organic bubble — a **Memory** — shaped by the thinking inside it. A Memory reads like a document: first Thought at the top, latest at the bottom, connection types as labels between sections. Timestamped end to end.

Research means provenance: Thoughts can carry etymology, word translations, scripture cross-references, and source citations, all as first-class categories and connection types.

And research is meant to be tested: one day you **publish** a Memory to the **Galaxy**. Published work can be seen by anyone, deleted by no one, and challenged only one way — a **rebuttal**, attached as its own Thought with a "Rebuts" connection. Your reasoning stands or falls in public, on the record.

The whole thing should feel like art. Calm, beautiful, no ceiling on where a study can go.

---

## Locked terminology (v2)

Use these exactly, everywhere — UI, code, comments.

- **Thought** — the core unit. A bubble on the canvas. Title, category, shortcut, content, meta-words, and (new) an optional **source** citation.
- **Connection** — a typed link between two Thoughts (Confirms, Rebuts, Branches from, Relates to, Question — plus research types like Cites, Translates, Derives from). The neural pathways. Making one plays a sound and sends a pulse of light down the line.
- **Origin** — the Thought a study grows from; the center point. Rendered in a distinct color/glow.
- **Pathway** — a branch of connected Thoughts growing off an Origin. Each branch auto-gets its own color from a palette; the user can override a branch's color. Pathways *emerge* from connecting — there is no "create pathway" form.
- **Memory** — a named cluster of connected Thoughts, wrapped in a **wobbly organic bubble that hugs the shape of its pathways** (not a circle). Behaves like a document. A Thought can belong to many Memories; multiple Memories live on the same canvas and may overlap.
- **Inner Space** — your canvas. Pannable and zoomable.
- **Constellation** — what your Thoughts and Memories *become* at a distance: zoomed out, Thoughts are stars and Memory bubbles are constellation outlines. Not decoration — your actual data seen from altitude.
- **The Galaxy** — the public layer (later phase). Published Memories from everyone form the wider sky. Public work is visible to all, deletable by none, rebuttable by anyone.
- **Stardust** — the staging inbox. Quick captures and AI-extracted Thoughts land here for review before being placed on the canvas. *(Name proposed — confirm or rename.)*
- **Timeline** — replay of everything from the Big Bang (your first Thought) to now. Backed by the `events` table.
- **Forgotten** — Memories untouched for a long stretch, surfaced for revisiting.
- **The chibi / astronaut** — the mascot. Floats to whatever you're touching; later, interacts.

---

## The three altitudes (semantic zoom)

One camera, one space, three readings. This unifies zoom, stars, constellations, and the Galaxy into a single mechanic:

1. **Workspace** (zoomed in) — readable Thought bubbles, pathway colors, Memory blobs. Where you work.
2. **Constellation view** (zoomed out) — Thoughts shrink to stars, blobs become glowing constellation outlines, names float beside them. The more you've built, the fuller your sky. Where you *see* your mind.
3. **Galaxy** (far out, later phase) — your whole Inner Space is one bright cluster among everyone's published constellations. Where your work meets the world.

Zoom is continuous (wheel-to-cursor / pinch); the rendering crossfades between altitudes.

---

## Data model

Already built (Phase 1): `thoughts`, `thought_depth`, `memories`, `memory_thoughts` (many-to-many), `connections`, `tags`/`taggables`, `events`. All timestamped.

**Additions needed for v2:**

- `thoughts.source` — optional citation/provenance text (research app = show your sources).
- **Pathway color** — proposed: a lightweight `pathways` table (`id`, `origin_thought_id`, `color`, optional `name`), with connections optionally assigned to one. Auto-derived on connect; color user-overridable. *(Open decision below.)*
- **Embeddings** (later, Rediscovery phase) — a vector per Thought stored in SQLite via `sqlite-vec`, powering semantic "connect these?" suggestions. No separate vector database until the Galaxy goes multi-user (then evaluate ChromaDB/pgvector).
- **Published snapshots** (Galaxy phase) — publishing freezes a versioned snapshot of a Memory; rebuttals attach to the snapshot.

---

## Feature areas (v2 deltas)

### Inner Space
- **Zoom in/out** (missing today) — wheel-to-cursor and pinch, with the semantic-zoom altitudes above. Pan already works.
- Pathway rendering: Origin in its distinct color, branch colors, light pulses along the lines (already built — keep and upgrade).

### Memories
- Create/name a Memory from connected Thoughts; the **organic blob** perimeter grows and reshapes as pathways grow.
- Multiple Memories on one canvas; overlapping allowed (shared Thoughts).
- **Document view** — auto-composed chronologically: first Thought at top, latest at bottom, Go Deeper entries under their Thought, connection types as labels ("Confirms:", "Rebuts:"). Title and metadata editable. Every element timestamped. Reordering + hand-written narrative between sections: later.
- Print / export — the connection types carry onto the page so a printout reads as a real study.

### AI ingestion (new)
- **The extraction prompt** (`AI-Ingestion-Prompt.md`, exists now) — paste it plus any source material (research paper, article, AI conversation, speech-to-text transcript) into an AI; get back Thoughts (title, category, shortcut, content, meta-words, source) and suggested typed connections as JSON.
- **In-app import** (build later) — paste that JSON into MindFull; Thoughts land in **Stardust** for review, never dumped raw onto the canvas. You approve, place, and connect.
- Future: call the AI from inside the app (Claude API) so import is one step.

### Rediscovery
- Tag-based suggestions (v1 plan) **plus** embedding-based semantic suggestions: "this new Thought is conceptually close to one from months ago — connect them?"
- Future (the Chris feature): flag citations that don't actually support what they're cited for — semantic distance between claim and source.

### The Galaxy (public layer, later)
- Accounts. Publish a Memory → immutable versioned snapshot, visible to all.
- No one can delete or edit another's published work. The only interaction is a **rebuttal**: a Thought of your own, connected with "Rebuts."
- Published constellations from everyone form the deep background of the Galaxy altitude.

### Unchanged from v1
Music & sound, Timeline (Big Bang replay), Forgotten, chibi behavior, Go Deeper, `{{shortcut}}` references.

---

## Tech direction

- **Keep:** vanilla JS modules, Express + SQLite. It's working and it's understandable.
- **Evolve the rendering as needed:** Memory blobs and pathway colors are fine in SVG. The starfield at Constellation altitude may want a `<canvas>` layer when Thought counts grow. Don't adopt a framework until a concrete feature actually hurts without one.
- **Vectors:** `sqlite-vec` inside the existing database when Rediscovery lands — not a separate ChromaDB server. Revisit only when the Galaxy is real and multi-user.
- **Accounts:** at the Galaxy phase, not before.

---

## Phased roadmap (v2)

Each phase leaves a usable app.

**Phase 3 — Canvas depth.** Zoom (wheel-to-cursor + pinch), Origin/branch pathway colors with user override, `thoughts.source` field.

**Phase 4 — Memories.** Name a cluster, the organic blob perimeter, multiple/overlapping Memories, chronological document view, print/export.

**Phase 5 — Stardust & AI ingestion.** The staging inbox, quick capture, JSON import consuming the extraction prompt's output.

**Phase 6 — Constellation altitude.** Semantic zoom-out: Thoughts as stars, Memories as constellation outlines, the filling sky.

**Phase 7 — Rediscovery.** Tag suggestions + embeddings (`sqlite-vec`) for semantic "connect these?" nudges.

**Phase 8 — Timeline.** The Big Bang replay (events table is already recording).

**Phase 9 — Forgotten.** Surface untouched Memories.

**Phase 10 — Chibi interaction.** The astronaut starts reacting to and interacting with your work.

**Phase 11 — The Galaxy.** Accounts, publishing (immutable snapshots), rebuttals, the public sky. Re-evaluate vector/database infrastructure here.

---

## Open decisions to confirm

1. **Stardust** as the name for the staging inbox — keep or rename?
2. **Pathway storage** — proposed: `pathways` table with auto-derived branches and overridable colors. Confirm the model feels right once we see it on canvas.
3. **Rebuttal rules** in the Galaxy — can the original author *unpublish* (hide, not delete) their own work? Can rebuttals themselves be rebutted (they should be — chains of debate)? Decide at Phase 11, not now.
4. **Document view ordering** — chronological by creation is the default; is created-order or connected-order the better "story of the study"? Try chronological first, revisit with real studies.
