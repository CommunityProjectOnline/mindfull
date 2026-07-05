/**
 * Star Field Module
 * The Constellation altitude. Every Thought owns a star at the center of where its card
 * sits: a colored glow (its category's color) around a bright white core, drawn above
 * the thin space-blue constellation lines. The more connections a Thought has, the
 * bigger and brighter its star - hubs become major stars. Origins wear a gold ring.
 * Clicking a star flies the camera back down to that Thought's card.
 *
 * Behind everything, a fixed layer of faint dust stars drifts with gentle parallax
 * for depth - decoration only; your data are the bright ones.
 */

const StarField = {
    _group: null,
    _stars: new Map(), // thoughtId -> { g, glow, core, title }
    _rafId: null,

    _dustCanvas: null,
    _dust: [],
    _dustKey: '',

    init() {
        const svg = AppState.svgLayer;
        if (!svg) return;
        this._group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this._group.setAttribute('class', 'star-field');
        svg.appendChild(this._group); // last child: stars render above lines and bubbles

        this._initDust();
        this._animate();
        console.log('✅ Star field initialized');
        console.log('🌌 TIP: Zoom all the way out - your Thoughts become the stars!');
    },

    _animate(timestamp) {
        this._update((timestamp || 0) / 1000);
        this._drawDust();
        this._rafId = requestAnimationFrame((ts) => this._animate(ts));
    },

    _update(t) {
        const altitude = window.CanvasViewport ? CanvasViewport.altitude : 0;
        this._group.style.opacity = altitude;
        if (altitude <= 0) {
            if (this._group.style.display !== 'none') this._group.style.display = 'none';
            return;
        }
        if (this._group.style.display === 'none') this._group.style.display = '';

        const zoom = CanvasViewport.zoom || 1;
        const counterScale = Math.min(12, 1 / zoom); // constant screen size, capped

        // Gravity: how many connections each Thought holds right now.
        const degree = new Map();
        AppState.getConnections().forEach((c) => {
            degree.set(c.fromThoughtId, (degree.get(c.fromThoughtId) || 0) + 1);
            degree.set(c.toThoughtId, (degree.get(c.toThoughtId) || 0) + 1);
        });

        const ns = 'http://www.w3.org/2000/svg';
        const seen = new Set();

        document.querySelectorAll('.thought-node').forEach((node) => {
            const id = Number(node.getAttribute('data-thought-id'));
            if (!id) return;
            seen.add(id);

            let star = this._stars.get(id);
            if (!star) {
                const g = document.createElementNS(ns, 'g');
                const glow = document.createElementNS(ns, 'circle');
                const core = document.createElementNS(ns, 'circle');
                const title = document.createElementNS(ns, 'title');
                core.setAttribute('fill', 'rgba(255, 255, 255, 0.95)');
                core.style.pointerEvents = 'none';
                g.appendChild(glow);
                g.appendChild(core);
                g.appendChild(title);
                g.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._descendTo(id);
                });
                this._group.appendChild(g);
                star = { g, glow, core, title };
                this._stars.set(id, star);
            }

            // Keep the tooltip in step with edits
            const name = node.querySelector('.thought-node-title')?.textContent || '';
            if (star.title.textContent !== name) star.title.textContent = name;

            const isOrigin = node.classList.contains('origin');
            const cx = node.offsetLeft + node.offsetWidth / 2;
            const cy = node.offsetTop + node.offsetHeight / 2;

            // The star wears its category's color; connections give it size.
            const color = window.CategoryColors
                ? CategoryColors.colorFor(node.dataset.category)
                : '#e0e7ff';
            const deg = degree.get(id) || 0;
            const base = 3.2 + Math.min(4.8, deg * 1.1) + (isOrigin ? 0.6 : 0);

            // Twinkle: a gentle breath, each star on its own phase.
            const breath = 0.9 + 0.1 * Math.sin(t * 1.5 + id * 2.399);
            const R = base * counterScale * breath;

            star.glow.setAttribute('cx', cx);
            star.glow.setAttribute('cy', cy);
            star.glow.setAttribute('r', R);
            star.glow.setAttribute('fill', color);
            star.glow.setAttribute('opacity', 0.78 + 0.18 * Math.sin(t * 1.5 + id * 2.399));
            star.glow.style.filter = `drop-shadow(0 0 ${R * 1.7}px ${color})`;
            if (isOrigin) {
                star.glow.setAttribute('stroke', 'rgba(255, 234, 167, 0.95)');
                star.glow.setAttribute('stroke-width', 1.4 * counterScale);
            } else {
                star.glow.removeAttribute('stroke');
                star.glow.removeAttribute('stroke-width');
            }

            star.core.setAttribute('cx', cx);
            star.core.setAttribute('cy', cy);
            star.core.setAttribute('r', R * 0.42);
        });

        // Sweep stars whose Thoughts are gone.
        this._stars.forEach((star, id) => {
            if (!seen.has(id)) {
                star.g.remove();
                this._stars.delete(id);
            }
        });
    },

    // Fly from the sky back down to a Thought's card.
    _descendTo(thoughtId) {
        const node = document.getElementById('thought-' + thoughtId);
        if (!node || !window.CanvasViewport) return;
        CanvasViewport.centerOn(
            node.offsetLeft + node.offsetWidth / 2,
            node.offsetTop + node.offsetHeight / 2,
            1
        );
        if (window.MindfulAudio) MindfulAudio.playSound('click');
        if (window.jumpToThought) jumpToThought(node);
        console.log('🔭 Descended to Thought', thoughtId);
    },

    /* ---------- background dust ---------- */

    _initDust() {
        this._dustCanvas = document.getElementById('dustLayer');
        if (!this._dustCanvas) return;

        // A few hundred faint motes, each on its own parallax depth.
        this._dust = Array.from({ length: 240 }, () => ({
            x: Math.random(),
            y: Math.random(),
            r: 0.4 + Math.random() * 1.1,
            a: 0.2 + Math.random() * 0.5,
            p: 0.04 + Math.random() * 0.18 // parallax: farther motes drift less
        }));

        const resize = () => {
            this._dustCanvas.width = this._dustCanvas.clientWidth;
            this._dustCanvas.height = this._dustCanvas.clientHeight;
            this._dustKey = ''; // force redraw
        };
        window.addEventListener('resize', resize);
        resize();
    },

    _drawDust() {
        if (!this._dustCanvas || !window.CanvasViewport) return;
        const { panX, panY, altitude } = CanvasViewport;
        const W = this._dustCanvas.width;
        const H = this._dustCanvas.height;

        // Only repaint when the camera actually moved.
        const key = `${Math.round(panX)}:${Math.round(panY)}:${altitude.toFixed(2)}:${W}x${H}`;
        if (key === this._dustKey) return;
        this._dustKey = key;

        const ctx = this._dustCanvas.getContext('2d');
        ctx.clearRect(0, 0, W, H);
        // Subtle in the workspace, fuller in the sky.
        const vis = 0.35 + 0.65 * altitude;
        ctx.fillStyle = '#c8d4ff';
        this._dust.forEach((d) => {
            const x = ((d.x * W + panX * d.p) % W + W) % W;
            const y = ((d.y * H + panY * d.p) % H + H) % H;
            ctx.globalAlpha = d.a * vis;
            ctx.beginPath();
            ctx.arc(x, y, d.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
};

// Expose globally
window.StarField = StarField;

console.log('🌌 Star Field module loaded');
