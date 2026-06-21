# MindFull — Vision & Build Plan

*A study tool that thinks the way an associative mind does. Personal side project.*

---

## For the AI building this (read first)

This is a ground-up rebuild of an existing prototype that lives in this same folder. **Keep the soul, rebuild the engine.** The look, the name, the logo, the canvas feel, the music, the sound effects, and the astronaut mascot all stay. The data model and backend get rebuilt from scratch, because the new concept needs things the old code was never designed for (one note belonging to many groupings, sharing, a full timeline).

Borrow freely from the existing files. The pieces worth reusing or upgrading:

- `public/css/*.css` — the whole dark "space" aesthetic (base, navbar, sidebar, constellation, modal, audio, astronaut, settings). Reuse and modernize.
- `public/js/connections/connection-animator.js` — already animates a particle of light traveling along a connection. This is the "neural light pulse" effect described below. Reuse and upgrade it.
- `public/js/connections/connection-manager.js` — port-to-port connection drawing logic.
- `public/js/canvas/dragging.js`, `public/js/canvas/panning.js` — drag and pan behavior.
- `public/js/audio.js` and `public/js/config.js` — audio system and central config/tuning constants.
- `public/js/ui/astronaut-controller.js` — mascot movement.
- `public/assets/` — logo (`logo-constellation.svg`), favicon, astronaut art (`astronaut_chibi2.png`).
- `mindfull-music/`, `mindfull-sound-effects/`, `public/sounds/` — ambient tracks and the click/connect sound already exist. Use them.
- `ROADMAP.md`, `NOTES.md` — original notes for context.

The old backend (`src/`) was Express with **in-memory** storage and a model where a "card" was the whole unit. Do not carry that model forward. Use it only as a reference for the API shape.

---

## The concept

MindFull is a study tool for people who don't think in straight lines. Paper notes are linear — write a line, write the next line, and the connections between ideas live only in your head. MindFull puts the connections on the surface.

You drop a **Thought** onto a canvas (your "Inner Space"). You drop another near it. You draw a connection between them, and you label what kind of connection it is — one scripture *confirms* another, or *rebuts* it, or *branches from* it. As thoughts connect and cluster, they form a **Memory**: a named, growing body of connected thinking. A Memory reads like a document — a white paper you can name, study, print, and one day share.

The whole thing should feel like art. Beautiful, calm, no ceiling on where a study can go. The mascot is an astronaut because this is *inner* space — your mind — not outer space. The connections behave like neural pathways between neurons, with light pulsing along them as ideas link up.

---

## Locked terminology

These terms are fixed. Use them exactly, everywhere — UI, code, comments.

- **Thought** — the core unit. A bubble/card on the canvas. Has a title, category, shortcut, content, and meta tags. (This was called a "memory" in the old prototype. It is now a Thought.)
- **Memory** — a named cluster of connected Thoughts. Drawn as a circle/perimeter around the group that **grows** as more Thoughts join. A Memory behaves like a document (the "white paper") — it can be named, read top to bottom, printed, and shared. A single Thought can belong to **many** Memories.
- **Connection** — a typed link between two Thoughts (e.g. confirms, rebuts, branches from). Connections are the neural pathways. Making one plays a sound and sends a pulse of light down the line.
- **Inner Space** — the canvas where Thoughts and Memories live.
- **Constellation** — the image formed in the background by your stars (your Thoughts and Memories) as your Inner Space fills in.
- **Timeline** — a replay of everything you've created or touched, from the "Big Bang" (your first Thought) to now.
- **Forgotten** — Memories you haven't touched in a long time, surfaced so you can revisit them.
- **The chibi / astronaut** — the mascot. Floats to whatever Thought or Memory you're touching. Later, it can interact with them.

---

## Data model

The model must support, from day one: a Thought living in multiple Memories, typed connections, and a complete history for the timeline.

**Thought**
- `id`
- `title`
- `category` (Scripture, Note, Prayer, Recipe, Quote, Idea, Goal, etc.)
- `shortcut` (unique handle for referencing, e.g. `{{jn3:16}}`)
- `content` (the main body)
- `depth` (additional, in-depth content added later via "Go Deeper" — can be one rich field or a list of appended entries)
- `tags` (meta-words; see Tags below)
- `position` (x, y on the canvas)
- `created`, `updated`, `lastTouched` timestamps

**Memory**
- `id`
- `name` (user-given; this is the "white paper" title)
- `thoughtIds` (the Thoughts in this Memory — many-to-many; a Thought can be in several Memories)
- `tags`
- `created`, `updated`, `lastTouched` timestamps

**Connection**
- `id`
- `fromThoughtId`, `toThoughtId`
- `type` (the relationship — see Connection types below)
- `created` timestamp

Everything timestamped so the Timeline can reconstruct the full history.

> **Open decision (proposed default):** what makes a Memory's circle grow? Proposed default — the radius scales with the number of Thoughts in the Memory plus the number of Connections among them, so denser, more-developed studies visibly become bigger Memories. *Confirm or adjust.*

> **Open decision (proposed default):** are Connection types a fixed list or user-defined? Proposed default — ship a small fixed starter set (**Confirms, Rebuts, Branches from, Relates to, Question**), each with its own color/icon, and allow custom types later. *Confirm or adjust.*

---

## Feature areas

### Inner Space (the canvas)
The existing dark grid canvas, modernized. Draggable Thoughts, pan around freely, smooth and calm. This is home base.

### Thoughts
- Add a Thought via a modal: title, category, shortcut, content, tags.
- **Go Deeper** — a button on an existing Thought to add more in-depth content after it's created. Lets a Thought grow without cluttering the bubble.
- Reference Thoughts elsewhere by their `{{shortcut}}`.

### Connections (neural pathways)
- Draw connections port-to-port between Thoughts (logic already exists in the prototype).
- Pick a **type** for each connection (confirms, rebuts, etc.).
- **On connect:** play the existing connect sound, and send a **pulse of light traveling down the line** from one Thought to the other — the neural light effect. Reuse/upgrade `connection-animator.js`.

### Memories
- A Memory forms from connected Thoughts and is **named** by the user.
- The circle/perimeter around the cluster **grows** as Thoughts and connections are added.
- **Document view:** read a Memory as a flowing white paper — its Thoughts as sections, its connections as labeled relationships ("Confirms:", "Rebuts:"). This is the study artifact.
- **Bring Memories together** — combine Memories (they can share Thoughts).
- **Print / export** — print a Memory or a Thought. The connection *types* carry onto the page as labels so the printout reads as a real study, not a flat list.

### Tags / meta-words
- Every Thought and Memory can carry meta-words.
- As your vocabulary of tags grows over time, MindFull **surfaces forgotten links** — e.g. "this new Thought shares tags with one from months ago. Connect them?" Tags don't just label; they introduce Thoughts to each other.

### Constellations
- As Thoughts and Memories accumulate, stars appear in the background and form images — Constellations. The beautiful, generative payoff of building.

### Timeline (Big Bang)
- Scrub through the entire history, from your first Thought (the Big Bang) to now.
- Watch Thoughts appear, connections form, and Memories grow over time.

### Forgotten
- Memories untouched for a long stretch collect here. Open the view to revisit them.

### The chibi / astronaut
- Floats to whatever Thought or Memory you're currently touching/grabbing.
- Future: can interact with Thoughts and Memories (e.g. prompts, reactions, help).

### Music & sound
- Ambient space-hum starts playing automatically on sign-in. Calm, made for deep, relaxed study — not distracting.
- In **Settings:** change the station/track, change the volume, or turn music off entirely.
- Connecting Thoughts plays a sound (asset already in the folder).

### Sharing (later phase)
- Share a Memory with friends or the world.
- Others can **tap into** a shared Memory and, if it holds together, add their own **rebuttal** Thoughts to your thinking — collaborative study.

---

## Tech direction

- **Keep:** name, logo, the dark space aesthetic and CSS, the canvas/drag/pan feel, the music + sound effects, the astronaut, the light-pulse animation.
- **Rebuild:** the backend and data layer. Use a **real database** (e.g. SQLite to start — simple, file-based, perfect for a personal side project; can move to Postgres later) with a schema built for many-to-many (Thoughts ↔ Memories) and full timestamping.
- **Frontend:** the prototype is vanilla JS modules and that's fine to continue, but the canvas interactions (a growing-circle Memory, the timeline, lots of moving nodes) may be smoother with a light framework or a canvas/SVG rendering layer. Builder's call — keep it as simple as the feature set allows.
- **Accounts:** needed once sharing arrives. Can wait until then.

---

## Phased roadmap

Small phases. Each one should leave a usable app.

**Phase 1 — Foundation**
Rebuild the data model and database (Thought, Memory, Connection, tags, timestamps). Wire up create/read/update/delete. Get the canvas rendering Thoughts from the database.

**Phase 2 — Thoughts & Connections**
Add Thought modal, Go Deeper, drag/pan, typed connections, connect sound, and the neural light pulse.

**Phase 3 — Memories**
Clusters form Memories, the growing circle, naming, the document/white-paper view, print/export.

**Phase 4 — Tags & rediscovery**
Meta-words on Thoughts and Memories, plus the "you might want to connect these" suggestions driven by shared tags.

**Phase 5 — Constellations & background stars**
Stars appear and form Constellations as Inner Space fills.

**Phase 6 — Timeline**
The Big Bang replay of all history.

**Phase 7 — Forgotten**
Surface untouched Memories.

**Phase 8 — Chibi interaction**
The astronaut starts interacting with Thoughts and Memories.

**Phase 9 — Sharing & collaboration**
Accounts, share a Memory, others tap in and add rebuttals.

---

## Open decisions to confirm

1. How a Memory's circle grows (proposed: thoughts + connections count).
2. Connection types — fixed starter set vs. custom (proposed: fixed starter set now, custom later).
3. Whether the Memory "document view" is a written narrative you author on top of the Thoughts, or an auto-composed read of the Thoughts and their connections (proposed: auto-composed first, hand-editable later).

*These are starting positions, not final calls. Adjust before Phase 1.*
