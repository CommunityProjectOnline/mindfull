/**
 * Canvas Viewport Module
 * Owns the camera for Inner Space: pan + zoom, applied as one transform on the #world
 * container (which holds the SVG connection layer and every Thought node).
 *
 * The grid background stays on #constellation itself and is kept in step by shifting
 * background-position (pan) and scaling background-size (zoom), so the grid always
 * tracks the world without the element ever moving.
 *
 * Zoom: mouse wheel (and trackpad pinch, which browsers deliver as ctrl+wheel),
 * always centered on the cursor. Plus the on-screen +/- controls.
 */

const CanvasViewport = {
    zoom: 1,
    panX: 0,
    panY: 0,
    altitude: 0,   // 0 = workspace, 1 = full constellation view (see config zoom.altitude*)
    world: null,
    constellation: null,
    zoomLabel: null,

    init() {
        this.constellation = AppState.constellation;
        this.world = AppState.world;
        if (!this.constellation || !this.world) {
            console.error('❌ Cannot initialize viewport: world container not found');
            return;
        }

        // Wheel = zoom to cursor. passive:false so we can preventDefault page scroll.
        this.constellation.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = Math.exp(-e.deltaY * MindfulConfig.zoom.wheelSensitivity);
            this.zoomAt(e.clientX, e.clientY, factor);
        }, { passive: false });

        // On-screen controls
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomResetBtn = document.getElementById('zoomResetBtn');
        this.zoomLabel = zoomResetBtn;

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomAtCenter(MindfulConfig.zoom.step));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomAtCenter(1 / MindfulConfig.zoom.step));
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.reset());

        this.apply();
        console.log('✅ Canvas viewport initialized');
        console.log('🔭 TIP: Scroll to zoom in and out of your Inner Space!');
    },

    clampZoom(z) {
        return Math.min(MindfulConfig.zoom.max, Math.max(MindfulConfig.zoom.min, z));
    },

    /**
     * Zoom by `factor`, keeping the world point under (clientX, clientY) fixed on screen.
     */
    zoomAt(clientX, clientY, factor) {
        this.cancelFlight(); // a hand on the wheel overrides any camera flight
        const newZoom = this.clampZoom(this.zoom * factor);
        if (newZoom === this.zoom) return;

        const rect = this.constellation.getBoundingClientRect();
        const cx = clientX - rect.left;
        const cy = clientY - rect.top;

        // The world point currently under the cursor...
        const wx = (cx - this.panX) / this.zoom;
        const wy = (cy - this.panY) / this.zoom;

        // ...stays under the cursor at the new zoom.
        this.zoom = newZoom;
        this.panX = cx - wx * this.zoom;
        this.panY = cy - wy * this.zoom;
        this.apply();
    },

    zoomAtCenter(factor) {
        const rect = this.constellation.getBoundingClientRect();
        this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },

    setPan(x, y) {
        this.cancelFlight();
        this.panX = x;
        this.panY = y;
        this.apply();
    },

    reset() {
        this.animateTo(1, 0, 0, 700);
    },

    /* ---------- camera flights ---------- */

    _flight: null,

    cancelFlight() {
        if (this._flight) {
            cancelAnimationFrame(this._flight);
            this._flight = null;
        }
    },

    /**
     * Ease the camera to a target view instead of snapping: zoom moves exponentially
     * (perceptually even), while the point at screen center glides to the target's.
     */
    animateTo(zoom, panX, panY, duration = 900) {
        this.cancelFlight();
        const rect = this.constellation.getBoundingClientRect();
        const targetZ = this.clampZoom(zoom);
        const z0 = this.zoom;
        const c0 = { x: (rect.width / 2 - this.panX) / z0, y: (rect.height / 2 - this.panY) / z0 };
        const c1 = { x: (rect.width / 2 - panX) / targetZ, y: (rect.height / 2 - panY) / targetZ };
        const t0 = performance.now();
        const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

        const step = (now) => {
            const p = Math.min(1, (now - t0) / duration);
            const e = ease(p);
            this.zoom = z0 * Math.pow(targetZ / z0, e);
            const cx = c0.x + (c1.x - c0.x) * e;
            const cy = c0.y + (c1.y - c0.y) * e;
            this.panX = rect.width / 2 - cx * this.zoom;
            this.panY = rect.height / 2 - cy * this.zoom;
            this.apply();
            this._flight = p < 1 ? requestAnimationFrame(step) : null;
        };
        this._flight = requestAnimationFrame(step);
    },

    /**
     * Jump the camera to a specific view (used by "fly to Memory" etc).
     */
    setView(zoom, panX, panY) {
        this.zoom = this.clampZoom(zoom);
        this.panX = panX;
        this.panY = panY;
        this.apply();
    },

    /**
     * Frame a world-space rectangle in the viewport (with breathing room).
     */
    fitBounds(minX, minY, maxX, maxY) {
        const rect = this.constellation.getBoundingClientRect();
        const w = Math.max(maxX - minX, 1);
        const h = Math.max(maxY - minY, 1);
        // Never zoom IN past 100% to frame something - only out to fit it.
        const zoom = this.clampZoom(Math.min(1, Math.min(rect.width / w, rect.height / h) * 0.7));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        this.animateTo(zoom, rect.width / 2 - cx * zoom, rect.height / 2 - cy * zoom);
    },

    apply() {
        this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;

        // Altitude: how far into the constellation view we are (0 workspace -> 1 sky).
        // Cards crossfade to stars via the --altitude CSS variable; the grid fades to space.
        const zc = MindfulConfig.zoom;
        this.altitude = Math.max(0, Math.min(1, (zc.altitudeStart - this.zoom) / (zc.altitudeStart - zc.altitudeFull)));
        this.constellation.style.setProperty('--altitude', this.altitude.toFixed(3));
        document.body.classList.toggle('constellation-mode', this.altitude > 0.6);

        // Keep the grid in step: layer 1 is the fixed vignette, layers 2+3 are the grid lines
        // (which dissolve as you ascend, leaving deep space for the stars).
        const g = MindfulConfig.grid.size * this.zoom;
        const gridAlpha = (MindfulConfig.grid.lineOpacity * (1 - this.altitude)).toFixed(3);
        this.constellation.style.backgroundImage =
            `radial-gradient(ellipse 800px 800px at 50% 50%, rgba(80, 80, 90, 0.08) 0%, transparent 100%),` +
            `linear-gradient(90deg, rgba(100, 100, 120, ${gridAlpha}) 1px, transparent 1px),` +
            `linear-gradient(rgba(100, 100, 120, ${gridAlpha}) 1px, transparent 1px)`;
        this.constellation.style.backgroundSize = `100% 100%, ${g}px ${g}px, ${g}px ${g}px`;
        this.constellation.style.backgroundPosition =
            `center, ${this.panX}px ${this.panY}px, ${this.panX}px ${this.panY}px`;

        if (this.zoomLabel) this.zoomLabel.textContent = Math.round(this.zoom * 100) + '%';

        // Keep legacy pan state in sync for the panning module.
        AppState.panOffsetX = this.panX;
        AppState.panOffsetY = this.panY;
    },

    /**
     * Fly the camera to center on a world point at the given zoom.
     */
    centerOn(wx, wy, zoom) {
        const rect = this.constellation.getBoundingClientRect();
        const z = this.clampZoom(zoom);
        this.animateTo(z, rect.width / 2 - wx * z, rect.height / 2 - wy * z);
    },

    /**
     * Convert viewport (client) coordinates to world coordinates.
     */
    toWorld(clientX, clientY) {
        const rect = this.constellation.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.panX) / this.zoom,
            y: (clientY - rect.top - this.panY) / this.zoom
        };
    }
};

// Expose globally
window.CanvasViewport = CanvasViewport;

console.log('🔭 Canvas Viewport module loaded');
