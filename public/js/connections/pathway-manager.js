/**
 * Pathway Manager Module
 * Client-side registry of pathways (the colored branches that emerge as Thoughts connect).
 *
 * The server decides which pathway a new connection belongs to (see src/models/pathway.js);
 * this module loads that registry, hands ConnectionManager the branch color for each line,
 * marks Origin thoughts (gold glow), and applies user color overrides.
 */

const PathwayManager = {
    _pathways: new Map(), // id -> { id, originThoughtId, color, name }
    palette: [],

    async load() {
        const [pathways, palette] = await Promise.all([PathwayAPI.getAll(), PathwayAPI.getPalette()]);
        this._pathways = new Map(pathways.map((p) => [p.id, p]));
        this.palette = palette;
        console.log('🎨 Loaded', pathways.length, 'pathways');
    },

    get(id) {
        return id != null ? this._pathways.get(id) || null : null;
    },

    /**
     * Register a pathway that was just born (returned by the connection create API)
     * and mark its Origin thought.
     */
    register(pathway) {
        if (!pathway || this._pathways.has(pathway.id)) return;
        this._pathways.set(pathway.id, pathway);
        this.markOrigin(pathway.originThoughtId);
    },

    /**
     * Add the Origin styling to every thought that roots a pathway.
     * Call after the thought nodes exist in the DOM.
     */
    markOrigins() {
        document.querySelectorAll('.thought-node.origin').forEach((n) => n.classList.remove('origin'));
        this._pathways.forEach((p) => this.markOrigin(p.originThoughtId));
    },

    markOrigin(thoughtId) {
        const node = document.getElementById('thought-' + thoughtId);
        if (node) node.classList.add('origin');
    },

    /**
     * User override: recolor a branch. Persists, then restyles every connection on it.
     */
    async setColor(id, color) {
        const updated = await PathwayAPI.update(id, { color });
        if (!updated) {
            alert('Could not change the pathway color.');
            return false;
        }
        this._pathways.set(updated.id, updated);
        AppState.getConnections()
            .filter((c) => c.pathwayId === id)
            .forEach((c) => ConnectionManager.restyleConnection(c, color));
        console.log(`🎨 Pathway ${id} recolored to ${color}`);
        return true;
    },

    /**
     * '#rrggbb' -> 'r, g, b' (the triplet format the line/pulse styling interpolates alpha over)
     */
    hexToRgbTriplet(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
    }
};

// Expose globally
window.PathwayManager = PathwayManager;

console.log('🌈 Pathway Manager module loaded');
