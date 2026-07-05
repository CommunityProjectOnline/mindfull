/**
 * Memory Renderer Module
 * Draws each Memory as an organic, softly-wobbling bubble that hugs the shape of its
 * member Thoughts, with the Memory's name floating on the rim. The bubble reshapes
 * live as Thoughts are dragged, and grows as Thoughts join.
 *
 * How the shape is built each frame:
 *   member cards' corners -> convex hull -> pushed outward from the centroid (padding
 *   + a slow per-vertex sine wobble) -> smoothed into a closed Catmull-Rom curve.
 */

const MemoryRenderer = {
    memories: new Map(),  // id -> memory list item {id, name, color, thoughtIds, ...}
    _visuals: new Map(),  // id -> { blob, labelGroup, labelText }
    _group: null,         // SVG <g> under the connection lines
    _rafId: null,
    _t: 0,

    // Dragging a whole Memory by its name label
    _drag: null,               // { memoryId, startX, startY, nodes: [{el, left, top}], moved }
    _suppressClickUntil: 0,    // a drag's mouseup also fires a click - swallow it

    PAD: 46,              // how far the bubble breathes out from the cards
    WOBBLE: 5,            // wobble amplitude in px
    WOBBLE_SPEED: 0.7,    // radians per SECOND (~9s per full breath) - clock-based, not frame-based

    init() {
        const svg = AppState.svgLayer;
        if (!svg) return;
        this._group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this._group.setAttribute('class', 'memory-layer');
        // Right after <defs>, so bubbles render UNDER the connection lines and pulses.
        const defs = svg.querySelector('defs');
        svg.insertBefore(this._group, defs ? defs.nextSibling : svg.firstChild);

        // Whole-Memory dragging (started from a name label's mousedown)
        document.addEventListener('mousemove', (e) => this._onDragMove(e));
        document.addEventListener('mouseup', () => this._onDragEnd());

        this._animate();
        console.log('✅ Memory renderer initialized');
    },

    async load() {
        const list = await MemoryAPI.getAll();
        this.memories = new Map(list.map((m) => [m.id, m]));
        this._rebuildVisuals();
        console.log('🫧 Loaded', list.length, 'memories');
    },

    upsert(memory) {
        this.memories.set(memory.id, memory);
        this._rebuildVisuals();
    },

    removeMemory(id) {
        this.memories.delete(id);
        this._rebuildVisuals();
    },

    _rebuildVisuals() {
        this._visuals.forEach((v) => {
            v.blob.remove();
            v.labelGroup.remove();
        });
        this._visuals.clear();

        this.memories.forEach((memory) => {
            const ns = 'http://www.w3.org/2000/svg';
            const rgb = this._hexToRgb(memory.color) || '142, 197, 255';

            const blob = document.createElementNS(ns, 'path');
            blob.setAttribute('class', 'memory-blob');
            blob.style.fill = `rgba(${rgb}, 0.07)`;
            blob.style.stroke = `rgba(${rgb}, 0.45)`;
            blob.style.filter = `drop-shadow(0 0 12px rgba(${rgb}, 0.25))`;
            this._group.appendChild(blob);

            const labelGroup = document.createElementNS(ns, 'g');
            labelGroup.setAttribute('class', 'memory-name');
            const labelText = document.createElementNS(ns, 'text');
            labelText.setAttribute('text-anchor', 'middle');
            labelText.style.fill = `rgba(${rgb}, 0.9)`;
            labelGroup.appendChild(labelText);
            const title = document.createElementNS(ns, 'title');
            title.textContent = 'Drag to move this Memory · click to open it as a document';
            labelGroup.appendChild(title);
            this._group.appendChild(labelGroup);

            // Drag the whole Memory by its name (workspace only - from the sky, it's a click).
            labelGroup.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (document.body.classList.contains('constellation-mode')) return;
                e.stopPropagation();
                e.preventDefault();
                this._beginDrag(memory.id, e.clientX, e.clientY);
            });

            labelGroup.addEventListener('click', (e) => {
                e.stopPropagation();
                if (Date.now() < this._suppressClickUntil) return; // that was a drag, not a click
                if (window.MemoryDocument) MemoryDocument.open(memory.id);
                if (window.MindfulAudio) MindfulAudio.playSound('click');
            });

            this._visuals.set(memory.id, { blob, labelGroup, labelText });
        });
        this.update();
    },

    /**
     * Recompute every bubble's path from the live positions of its Thought cards.
     * Cheap enough to run per animation frame (hulls of a handful of rectangles).
     */
    update() {
        this.memories.forEach((memory, id) => {
            const v = this._visuals.get(id);
            if (!v) return;

            const points = [];
            memory.thoughtIds.forEach((tid) => {
                const node = document.getElementById('thought-' + tid);
                if (!node) return;
                const x = node.offsetLeft, y = node.offsetTop;
                const w = node.offsetWidth, h = node.offsetHeight;
                points.push([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
            });

            if (!points.length) {
                v.blob.style.display = 'none';
                v.labelGroup.style.display = 'none';
                return;
            }
            v.blob.style.display = '';
            v.labelGroup.style.display = '';

            const hull = this._convexHull(points);
            const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
            const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;

            // Push each hull vertex outward, with a slow organic wobble.
            const padded = hull.map(([x, y], i) => {
                const dx = x - cx, dy = y - cy;
                const len = Math.hypot(dx, dy) || 1;
                const wobble = Math.sin(this._t * this.WOBBLE_SPEED + i * 1.7 + id) * this.WOBBLE;
                const out = this.PAD + wobble;
                return [x + (dx / len) * out, y + (dy / len) * out];
            });

            v.blob.setAttribute('d', this._smoothClosedPath(padded));

            // At altitude the bubble reads as a constellation outline: hold the stroke's
            // screen weight, and keep the name readable by counter-scaling it.
            const zoom = window.CanvasViewport ? CanvasViewport.zoom : 1;
            const cs = Math.max(1, 0.5 / zoom);
            v.blob.style.strokeWidth = 2 * cs;

            // Name label at the top of the bubble
            let top = padded[0];
            padded.forEach((p) => { if (p[1] < top[1]) top = p; });
            v.labelText.textContent = `${memory.name} · ${memory.thoughtIds.length}`;
            const labelScale = Math.min(6, Math.max(1, 0.8 / zoom));
            v.labelGroup.setAttribute('transform', `translate(${top[0]} ${top[1] - 12 * labelScale}) scale(${labelScale})`);
        });
    },

    _animate(timestamp) {
        // Seconds on the wall clock, so the breathing speed is the same on every monitor.
        this._t = (timestamp || 0) / 1000;
        this.update();
        this._rafId = requestAnimationFrame((ts) => this._animate(ts));
    },

    /* ---------- whole-Memory dragging ---------- */

    _beginDrag(memoryId, clientX, clientY) {
        const memory = this.memories.get(memoryId);
        if (!memory) return;
        const nodes = memory.thoughtIds
            .map((tid) => document.getElementById('thought-' + tid))
            .filter(Boolean)
            .map((el) => ({ el, left: el.offsetLeft, top: el.offsetTop }));
        if (!nodes.length) return;
        this._drag = { memoryId, startX: clientX, startY: clientY, nodes, moved: false };
        document.body.classList.add('memory-dragging');
    },

    _onDragMove(e) {
        if (!this._drag) return;
        e.preventDefault();
        const zoom = window.CanvasViewport ? CanvasViewport.zoom : 1;
        const dx = (e.clientX - this._drag.startX) / zoom;
        const dy = (e.clientY - this._drag.startY) / zoom;
        if (Math.hypot(e.clientX - this._drag.startX, e.clientY - this._drag.startY) > 4) {
            this._drag.moved = true;
        }
        this._drag.nodes.forEach((n) => {
            n.el.style.left = n.left + dx + 'px';
            n.el.style.top = n.top + dy + 'px';
        });
        // Lines and the bubble follow on their own animation frames.
    },

    async _onDragEnd() {
        if (!this._drag) return;
        const drag = this._drag;
        this._drag = null;
        document.body.classList.remove('memory-dragging');
        if (!drag.moved) return; // it was a click - the label's click handler takes it

        this._suppressClickUntil = Date.now() + 350;
        // Persist every member's new position.
        await Promise.all(drag.nodes.map((n) =>
            ThoughtAPI.update(Number(n.el.getAttribute('data-thought-id')), {
                x: parseFloat(n.el.style.left),
                y: parseFloat(n.el.style.top)
            })
        ));
        console.log(`🫧 Memory ${drag.memoryId} moved (${drag.nodes.length} thoughts saved)`);
    },

    /* ---------- geometry ---------- */

    // Andrew's monotone chain convex hull.
    _convexHull(points) {
        const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        if (pts.length <= 2) return pts;
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lower = [];
        for (const p of pts) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
            lower.push(p);
        }
        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
            upper.push(p);
        }
        lower.pop();
        upper.pop();
        return lower.concat(upper);
    },

    // Closed Catmull-Rom spline through the hull vertices -> smooth cubic bezier path.
    _smoothClosedPath(pts) {
        const n = pts.length;
        if (n < 3) {
            // Degenerate (a single Thought's padded corners can collapse) - draw an ellipse-ish loop.
            if (n === 2) {
                const [a, b] = pts;
                const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
                const r = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2 + this.PAD;
                return `M ${mx - r} ${my} A ${r} ${r} 0 1 0 ${mx + r} ${my} A ${r} ${r} 0 1 0 ${mx - r} ${my} Z`;
            }
            return '';
        }
        let d = `M ${pts[0][0]} ${pts[0][1]} `;
        for (let i = 0; i < n; i++) {
            const p0 = pts[(i - 1 + n) % n];
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            const p3 = pts[(i + 2) % n];
            const c1x = p1[0] + (p2[0] - p0[0]) / 6;
            const c1y = p1[1] + (p2[1] - p0[1]) / 6;
            const c2x = p2[0] - (p3[0] - p1[0]) / 6;
            const c2y = p2[1] - (p3[1] - p1[1]) / 6;
            d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]} `;
        }
        return d + 'Z';
    },

    _hexToRgb(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
        if (!m) return null;
        const nnn = parseInt(m[1], 16);
        return `${(nnn >> 16) & 255}, ${(nnn >> 8) & 255}, ${nnn & 255}`;
    }
};

// Expose globally
window.MemoryRenderer = MemoryRenderer;

console.log('🫧 Memory Renderer module loaded');
