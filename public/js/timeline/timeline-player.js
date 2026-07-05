/**
 * Timeline Player Module
 * The Big Bang replay. Opens a full-screen observatory over the canvas and plays the
 * event journal from the first Thought to now: stars appear (category-colored),
 * constellation lines form, Memory outlines bloom - with play/pause, speed, a
 * scrubber, the date, and a ticker narrating each moment.
 *
 * The replay is a pure projection of /api/timeline: state at any point is rebuilt
 * from scratch (event counts are personal-sized), so scrubbing backwards is free.
 */

const TimelinePlayer = {
    overlay: null,
    svg: null,
    ticker: null,
    playBtn: null,
    speedBtn: null,
    scrubber: null,
    dateEl: null,
    counterEl: null,

    events: [],
    progress: 0,       // fractional event index: state = events[0 .. floor(progress))
    playing: false,
    speedIndex: 0,
    SPEEDS: [1, 2, 5, 10],
    BASE_RATE: 1.6,    // events per second at 1x

    _rafId: null,
    _lastTs: 0,
    _lastRendered: -1,
    _posOverride: new Map(), // thoughtId -> today's position (nicer than historical)
    _view: null,             // computed viewBox + scale unit

    init() {
        this.overlay = document.getElementById('timelineOverlay');
        if (!this.overlay) return;
        this.svg = document.getElementById('timelineSvg');
        this.ticker = document.getElementById('timelineTicker');
        this.playBtn = document.getElementById('timelinePlayBtn');
        this.speedBtn = document.getElementById('timelineSpeedBtn');
        this.scrubber = document.getElementById('timelineScrubber');
        this.dateEl = document.getElementById('timelineDate');
        this.counterEl = document.getElementById('timelineCounter');

        document.getElementById('closeTimeline').addEventListener('click', () => this.close());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) this.close();
        });
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.speedBtn.addEventListener('click', () => this.cycleSpeed());
        this.scrubber.addEventListener('input', () => {
            this.progress = Number(this.scrubber.value);
            this.playing = false;
            this.updatePlayBtn();
            this.render();
        });

        console.log('✅ Timeline player initialized');
    },

    async open() {
        if (window.MemoryManager) MemoryManager.closePanel();
        if (window.StardustManager) StardustManager.closePanel();
        if (window.RediscoveryPanel) RediscoveryPanel.closePanel();

        this.events = await TimelineAPI.getEvents();
        this.overlay.classList.remove('hidden');

        // Prefer today's layout for Thoughts that still exist - the constellation you
        // know materializes; deleted Thoughts fall back to where the journal saw them.
        this._posOverride.clear();
        document.querySelectorAll('.thought-node').forEach((n) => {
            this._posOverride.set(Number(n.getAttribute('data-thought-id')), {
                x: n.offsetLeft + n.offsetWidth / 2,
                y: n.offsetTop + n.offsetHeight / 2
            });
        });

        this.scrubber.max = this.events.length;
        this.progress = 0;
        this._lastRendered = -1;
        this._computeView();

        if (!this.events.length) {
            this.ticker.textContent = 'No history yet - the journal starts with your first Thought.';
            this.playing = false;
        } else {
            this.playing = true; // the Big Bang begins on open
        }
        this.updatePlayBtn();
        this.render();
        this._lastTs = 0;
        this._loop(performance.now());
    },

    close() {
        this.overlay.classList.add('hidden');
        this.playing = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._rafId = null;
    },

    togglePlay() {
        if (!this.events.length) return;
        if (!this.playing && this.progress >= this.events.length) this.progress = 0; // replay from the Bang
        this.playing = !this.playing;
        this.updatePlayBtn();
    },

    cycleSpeed() {
        this.speedIndex = (this.speedIndex + 1) % this.SPEEDS.length;
        this.speedBtn.textContent = this.SPEEDS[this.speedIndex] + '×';
    },

    updatePlayBtn() {
        this.playBtn.textContent = this.playing ? '⏸' : '▶';
    },

    _loop(ts) {
        if (this.overlay.classList.contains('hidden')) return;
        if (this._lastTs && this.playing) {
            const dt = (ts - this._lastTs) / 1000;
            this.progress += dt * this.BASE_RATE * this.SPEEDS[this.speedIndex];
            if (this.progress >= this.events.length) {
                this.progress = this.events.length;
                this.playing = false;
                this.updatePlayBtn();
            }
            this.render();
        }
        this._lastTs = ts;
        this._rafId = requestAnimationFrame((t) => this._loop(t));
    },

    /* ---------- state reconstruction ---------- */

    _positionFor(id, payload) {
        const live = this._posOverride.get(id);
        if (live) return live;
        // Journal snapshot: payload x/y is the card's top-left; approximate its heart.
        return { x: (payload && payload.x != null ? payload.x : 100) + 160, y: (payload && payload.y != null ? payload.y : 100) + 90 };
    },

    _stateAt(count) {
        const s = { thoughts: new Map(), connections: new Map(), memories: new Map() };
        for (let i = 0; i < count && i < this.events.length; i++) {
            const ev = this.events[i];
            const p = ev.payload || {};
            switch (ev.type) {
                case 'thought.created':
                    s.thoughts.set(ev.entityId, {
                        title: p.title || '',
                        category: p.category || 'Note',
                        pos: this._positionFor(ev.entityId, p)
                    });
                    break;
                case 'thought.deleted':
                    s.thoughts.delete(ev.entityId);
                    break;
                case 'connection.created':
                    s.connections.set(ev.entityId, { from: p.fromThoughtId, to: p.toThoughtId });
                    break;
                case 'connection.deleted':
                    s.connections.delete(ev.entityId);
                    break;
                case 'memory.created':
                    s.memories.set(ev.entityId, {
                        name: p.name || '',
                        color: p.color || '#8ec5ff',
                        members: new Set(p.thoughtIds || [])
                    });
                    break;
                case 'memory.thoughts_added': {
                    const m = s.memories.get(ev.entityId);
                    if (m) (p.thoughtIds || []).forEach((id) => m.members.add(id));
                    break;
                }
                case 'memory.thought_removed': {
                    const m = s.memories.get(ev.entityId);
                    if (m) m.members.delete(p.thoughtId);
                    break;
                }
                case 'memory.updated': {
                    const m = s.memories.get(ev.entityId);
                    if (m && p.name) m.name = p.name;
                    break;
                }
                case 'memory.deleted':
                    s.memories.delete(ev.entityId);
                    break;
                // thought.updated / thought.deepened / connection.updated / pathway.*
                // don't change the replay picture - they narrate via the ticker only.
            }
        }
        return s;
    },

    /* ---------- rendering ---------- */

    _computeView() {
        // Frame every position the journal will ever show.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const consider = (pt) => {
            minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
            minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
        };
        this._posOverride.forEach(consider);
        this.events.forEach((ev) => {
            if (ev.type === 'thought.created') consider(this._positionFor(ev.entityId, ev.payload || {}));
        });
        if (minX === Infinity) { minX = 0; minY = 0; maxX = 1000; maxY = 700; }

        const pad = Math.max((maxX - minX), (maxY - minY)) * 0.15 + 120;
        const w = (maxX - minX) + pad * 2;
        const h = (maxY - minY) + pad * 2;
        this.svg.setAttribute('viewBox', `${minX - pad} ${minY - pad} ${w} ${h}`);
        this._view = { unit: Math.max(w, h) / 1000 }; // 1 "screen-ish pixel" in world units
    },

    render() {
        const count = Math.floor(this.progress);
        this.scrubber.value = count;
        this.counterEl.textContent = `${count} / ${this.events.length}`;

        const current = count > 0 ? this.events[count - 1] : null;
        this.dateEl.textContent = current
            ? new Date(current.at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            : (this.events.length ? 'Before the Big Bang' : '');
        if (current) this.ticker.textContent = this._describe(current, this._stateAt(count));

        if (count === this._lastRendered) return;
        const popped = count === this._lastRendered + 1; // stepping forward: animate the newcomer
        this._lastRendered = count;

        const s = this._stateAt(count);
        const u = this._view.unit;
        const ns = 'http://www.w3.org/2000/svg';
        this.svg.innerHTML = '';

        // Memory outlines first (behind everything)
        s.memories.forEach((m) => {
            const pts = [...m.members].map((id) => s.thoughts.get(id)).filter(Boolean).map((t) => t.pos);
            if (pts.length < 2) return;
            const hull = this._hull(pts);
            const cx = hull.reduce((a, p) => a + p.x, 0) / hull.length;
            const cy = hull.reduce((a, p) => a + p.y, 0) / hull.length;
            const padded = hull.map((p) => {
                const dx = p.x - cx, dy = p.y - cy;
                const len = Math.hypot(dx, dy) || 1;
                return { x: p.x + (dx / len) * 60, y: p.y + (dy / len) * 60 };
            });
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', padded.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ') + ' Z');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', m.color);
            path.setAttribute('stroke-width', 1.2 * u);
            path.setAttribute('opacity', '0.45');
            this.svg.appendChild(path);

            const label = document.createElementNS(ns, 'text');
            const top = padded.reduce((a, p) => (p.y < a.y ? p : a), padded[0]);
            label.setAttribute('x', top.x);
            label.setAttribute('y', top.y - 10 * u);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('fill', m.color);
            label.setAttribute('font-size', 15 * u);
            label.textContent = m.name;
            this.svg.appendChild(label);
        });

        // Constellation lines
        s.connections.forEach((c, id) => {
            const A = s.thoughts.get(c.from);
            const B = s.thoughts.get(c.to);
            if (!A || !B) return;
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', A.pos.x); line.setAttribute('y1', A.pos.y);
            line.setAttribute('x2', B.pos.x); line.setAttribute('y2', B.pos.y);
            line.setAttribute('stroke', 'rgba(148, 168, 226, 0.55)');
            line.setAttribute('stroke-width', 1.1 * u);
            if (popped && current && current.type === 'connection.created' && current.entityId === id) {
                this._fadeIn(line);
            }
            this.svg.appendChild(line);
        });

        // Stars
        s.thoughts.forEach((t, id) => {
            const color = window.CategoryColors ? CategoryColors.colorFor(t.category) : '#e0e7ff';
            const glow = document.createElementNS(ns, 'circle');
            glow.setAttribute('cx', t.pos.x); glow.setAttribute('cy', t.pos.y);
            glow.setAttribute('r', 5 * u);
            glow.setAttribute('fill', color);
            glow.style.filter = `drop-shadow(0 0 ${8 * u}px ${color})`;
            const core = document.createElementNS(ns, 'circle');
            core.setAttribute('cx', t.pos.x); core.setAttribute('cy', t.pos.y);
            core.setAttribute('r', 2.1 * u);
            core.setAttribute('fill', 'rgba(255,255,255,0.95)');
            if (popped && current && current.type === 'thought.created' && current.entityId === id) {
                this._burst(t.pos, color, u);
                this._fadeIn(glow);
                this._fadeIn(core);
            }
            this.svg.appendChild(glow);
            this.svg.appendChild(core);
        });
    },

    _fadeIn(el) {
        const ns = 'http://www.w3.org/2000/svg';
        const anim = document.createElementNS(ns, 'animate');
        anim.setAttribute('attributeName', 'opacity');
        anim.setAttribute('from', '0');
        anim.setAttribute('to', '1');
        anim.setAttribute('dur', '0.45s');
        anim.setAttribute('fill', 'freeze');
        el.appendChild(anim);
    },

    // A little nova when a star is born.
    _burst(pos, color, u) {
        const ns = 'http://www.w3.org/2000/svg';
        const ring = document.createElementNS(ns, 'circle');
        ring.setAttribute('cx', pos.x); ring.setAttribute('cy', pos.y);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', color);
        ring.setAttribute('stroke-width', 1.4 * u);
        const grow = document.createElementNS(ns, 'animate');
        grow.setAttribute('attributeName', 'r');
        grow.setAttribute('from', 2 * u); grow.setAttribute('to', 26 * u);
        grow.setAttribute('dur', '0.7s'); grow.setAttribute('fill', 'freeze');
        const fade = document.createElementNS(ns, 'animate');
        fade.setAttribute('attributeName', 'opacity');
        fade.setAttribute('from', '0.9'); fade.setAttribute('to', '0');
        fade.setAttribute('dur', '0.7s'); fade.setAttribute('fill', 'freeze');
        ring.appendChild(grow);
        ring.appendChild(fade);
        this.svg.appendChild(ring);
    },

    _hull(points) {
        const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
        if (pts.length <= 2) return pts;
        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
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
        lower.pop(); upper.pop();
        return lower.concat(upper);
    },

    _describe(ev, state) {
        const p = ev.payload || {};
        const title = (id) => (state.thoughts.get(id) || {}).title || 'a Thought';
        switch (ev.type) {
            case 'thought.created': return `✨ "${p.title}" was born`;
            case 'thought.updated': return `✎ "${p.title || title(ev.entityId)}" was refined`;
            case 'thought.deepened': return `🔎 Went deeper on "${title(ev.entityId)}"`;
            case 'thought.deleted': return `🌑 "${p.title || 'a Thought'}" faded away`;
            case 'connection.created': return `⚡ ${title(p.fromThoughtId)} → ${title(p.toThoughtId)} (${p.type})`;
            case 'connection.updated': return `↻ A connection changed to "${p.type}"`;
            case 'connection.deleted': return `✂ A connection was undone`;
            case 'pathway.created': return `🌈 A new pathway lit up`;
            case 'pathway.updated': return `🎨 A pathway changed color`;
            case 'memory.created': return `🫧 Memory "${p.name}" formed (${(p.thoughtIds || []).length} Thoughts)`;
            case 'memory.updated': return `✎ Memory renamed to "${p.name}"`;
            case 'memory.thoughts_added': return `🫧 A Memory grew`;
            case 'memory.thought_removed': return `🫧 A Memory let a Thought go`;
            case 'memory.deleted': return `🫧 Memory "${p.name}" dissolved`;
            default: return ev.type;
        }
    }
};

// Expose globally
window.TimelinePlayer = TimelinePlayer;

console.log('🕐 Timeline Player module loaded');
