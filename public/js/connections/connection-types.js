/**
 * Connection Types - the fixed starter set of typed relationships (neural pathways).
 * Each has its own color (for the line + light pulse) and an icon (shown on the pathway).
 * Custom, user-defined types can come later; for now this set is locked.
 *
 * `rgb` is the "r, g, b" triplet the animator interpolates alpha over, e.g. rgba(63,185,80, a).
 */

const ConnectionTypes = {
    list: [
        { name: 'Confirms',      color: '#3fb950', rgb: '63, 185, 80',   icon: '✓' },
        { name: 'Rebuts',        color: '#f85149', rgb: '248, 81, 73',   icon: '✕' },
        { name: 'Branches from', color: '#a371f7', rgb: '163, 113, 247', icon: '⎇' },
        { name: 'Relates to',    color: '#539bf5', rgb: '83, 155, 245',  icon: '↔' },
        { name: 'Question',      color: '#d29922', rgb: '210, 153, 34',  icon: '?' }
    ],

    byName(name) {
        return this.list.find((t) => t.name === name) || this.default();
    },

    default() {
        return this.list.find((t) => t.name === 'Relates to');
    }
};

window.ConnectionTypes = ConnectionTypes;

console.log('🎨 Connection Types loaded -', ConnectionTypes.list.map((t) => t.name).join(', '));
