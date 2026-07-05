// Spatial layout - keeps newborn Thoughts and imported studies off of occupied ground,
// and lays a connected study out as an organic left-to-right formation.
//
// Every card is estimated as a generous rectangle (width is fixed by CSS; height varies
// with content, so we assume a tall one). Two searches, both spiraling outward from the
// preferred spot until they find clear space:
//   findFreeSpot   - one card
//   findClearArea  - a whole study's footprint (kept a wider berth, since a Memory
//                    bubble will wrap it)
// Plus:
//   organicTree    - positions for a study: the Origin on the far left, each connection
//                    step one column to the right, branches fanning up and down, with a
//                    touch of per-card jitter so nothing sits on a ruler line.

const db = require('../db/connection');

const CARD_W = 340;  // 320px card + breathing room
const CARD_H = 380;  // tall-card estimate
const MARGIN = 60;   // minimum gap between cards

// Formation spacing. Columns/rows are far enough apart that even max jitter
// leaves clear water between cards (520-340-2*45 = 90px, 500-380-2*40 = 40px).
const TREE_STEP_X = 520;
const TREE_STEP_Y = 500;
const JITTER_X = 45;
const JITTER_Y = 40;

function thoughtRects(excludeIds) {
    const skip = excludeIds ? new Set(excludeIds.map(Number)) : null;
    return db.prepare('SELECT id, x, y FROM thoughts').all()
        .filter((t) => !skip || !skip.has(t.id))
        .map((t) => ({ x: t.x, y: t.y, w: CARD_W, h: CARD_H }));
}

// Deterministic per-card jitter, so the same study always lands the same way.
function hashKey(key) {
    const s = String(key);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function jitterFor(key) {
    return {
        x: ((hashKey(key) % 1000) / 1000 - 0.5) * 2 * JITTER_X,
        y: ((hashKey(key + '~y') % 1000) / 1000 - 0.5) * 2 * JITTER_Y
    };
}

function intersects(a, b, margin) {
    return a.x < b.x + b.w + margin && a.x + a.w + margin > b.x &&
           a.y < b.y + b.h + margin && a.y + a.h + margin > b.y;
}

function isFree(rect, rects, margin) {
    return !rects.some((r) => intersects(rect, r, margin));
}

// Spiral outward from (x, y) until the probe rect lands on clear ground.
function spiralSearch(probe, rects, margin, step, maxRings) {
    const startX = probe.x;
    const startY = probe.y;
    if (isFree(probe, rects, margin)) return { x: startX, y: startY };
    for (let ring = 1; ring <= maxRings; ring++) {
        const spots = ring * 8;
        for (let i = 0; i < spots; i++) {
            const angle = (i / spots) * Math.PI * 2;
            probe.x = startX + Math.cos(angle) * ring * step;
            probe.y = startY + Math.sin(angle) * ring * step;
            if (isFree(probe, rects, margin)) return { x: probe.x, y: probe.y };
        }
    }
    return { x: startX, y: startY }; // space is infinite; this should never happen
}

const Layout = {
    CARD_W,
    CARD_H,

    // Nearest clear spot for a single card, preferring (x, y).
    findFreeSpot(x, y) {
        return spiralSearch({ x, y, w: CARD_W, h: CARD_H }, thoughtRects(), MARGIN, 160, 40);
    },

    // Nearest clear region for a whole study of the given size, preferring (x, y)
    // as its top-left. Wider margin: the Memory bubble needs room to breathe.
    // excludeIds: Thoughts that are being re-arranged, so they don't block their
    // own new home.
    findClearArea(w, h, x, y, excludeIds) {
        return spiralSearch({ x, y, w, h }, thoughtRects(excludeIds), 160, 300, 60);
    },

    // Lay a connected study out as a formation instead of a grid.
    //
    // A breadth-first walk from the Origin turns the connection graph into a spanning
    // tree: depth from the Origin becomes the column (so the study reads left to
    // right), and a tidy-tree pass stacks each branch's leaves into rows and centers
    // every parent on its children (so branches visibly fan up and down). Cross-links
    // don't move cards - they're extra threads across a shape the tree already set.
    //
    // nodeIds: every card in the study, in document order (ids or refs).
    // edges:   [{ from, to }] between those ids; unknown endpoints are ignored.
    // seedIds: preferred roots (pathway Origins), most senior first.
    //
    // Returns { positions: Map(id -> {x, y}), width, height } with the formation's
    // top-left at (0, 0) - the caller anchors it wherever there's clear ground.
    organicTree(nodeIds, edges, seedIds = []) {
        const order = new Map(nodeIds.map((id, i) => [id, i]));
        const adj = new Map(nodeIds.map((id) => [id, []]));
        edges.forEach((e) => {
            if (!adj.has(e.from) || !adj.has(e.to) || e.from === e.to) return;
            adj.get(e.from).push(e.to);
            adj.get(e.to).push(e.from);
        });
        // Walk neighbors in document order so the branch fan follows the paper.
        adj.forEach((list) => list.sort((a, b) => order.get(a) - order.get(b)));

        const visited = new Set();
        const children = new Map();
        const depth = new Map();
        const roots = [];
        const seeds = [...seedIds.filter((id) => adj.has(id)), ...nodeIds];

        for (const seed of seeds) {
            if (visited.has(seed)) continue;
            roots.push(seed);
            visited.add(seed);
            depth.set(seed, 0);
            children.set(seed, []);
            const queue = [seed];
            while (queue.length) {
                const cur = queue.shift();
                for (const nb of adj.get(cur)) {
                    if (visited.has(nb)) continue;
                    visited.add(nb);
                    depth.set(nb, depth.get(cur) + 1);
                    children.set(nb, []);
                    children.get(cur).push(nb);
                    queue.push(nb);
                }
            }
        }

        // Tidy-tree rows: each leaf takes the next free row; parents sit centered
        // on their children, which is what makes a branch read as a fan.
        let nextRow = 0;
        const row = new Map();
        const placeRows = (id) => {
            const kids = children.get(id);
            if (!kids.length) {
                row.set(id, nextRow++);
                return;
            }
            kids.forEach(placeRows);
            row.set(id, (row.get(kids[0]) + row.get(kids[kids.length - 1])) / 2);
        };
        roots.forEach((r, i) => {
            if (i > 0) nextRow += 1; // clear water between disconnected clusters
            placeRows(r);
        });

        const positions = new Map();
        let maxX = 0;
        let maxY = 0;
        nodeIds.forEach((id) => {
            const j = jitterFor(id);
            const x = depth.get(id) * TREE_STEP_X + JITTER_X + j.x;
            const y = row.get(id) * TREE_STEP_Y + JITTER_Y + j.y;
            positions.set(id, { x, y });
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        return {
            positions,
            width: maxX + CARD_W + JITTER_X,
            height: maxY + CARD_H + JITTER_Y
        };
    }
};

module.exports = Layout;
