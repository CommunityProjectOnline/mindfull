/**
 * Connection Skeleton Module
 * Sorts every connection into MAIN BRANCH or CROSS-LINK, so the canvas can draw the
 * study's shape without the spaghetti.
 *
 * The main branch is a spanning tree walked outward from the pathway Origins: the
 * lines that first knit each Thought into the study. Everything beyond that - the
 * "it ALSO connects to..." threads that crisscross between branches - is a cross-link.
 * Cross-links rest as near-invisible ghosts (and vanish entirely in the constellation
 * sky). Two ways to light them up:
 *   - hover a card (Focus Mode) - its cross-links glow while you look
 *   - click the card's +N badge  - its cross-links stay lit until clicked again
 */

const ConnectionSkeleton = {
    _pinned: new Set(), // thought ids whose cross-links stay revealed
    _timer: null,

    // Cheap and idempotent - safe to call after any connection change. Debounced so a
    // full canvas load recomputes once, not once per line.
    scheduleRecompute() {
        if (this._timer) return;
        this._timer = setTimeout(() => {
            this._timer = null;
            this.recompute();
        }, 50);
    },

    recompute() {
        const conns = AppState.getConnections();
        const adj = new Map();
        const touch = (id, entry) => {
            if (!adj.has(id)) adj.set(id, []);
            adj.get(id).push(entry);
        };
        conns.forEach((c) => {
            c._secondary = true;
            touch(c.fromThoughtId, { other: c.toThoughtId, conn: c });
            touch(c.toThoughtId, { other: c.fromThoughtId, conn: c });
        });
        // Walk neighbors in document order (thought ids climb with creation), the same
        // order the server's formation layout uses - so the visible main lines are the
        // short parent-to-child hops the formation was shaped around.
        adj.forEach((list) => list.sort((a, b) => a.other - b.other));

        // Start each walk at a pathway Origin, earliest Thought first (again matching
        // the layout); any Thought never reached from an Origin seeds its own tree.
        const seeds = [];
        if (window.PathwayManager) {
            PathwayManager._pathways.forEach((p) => seeds.push(p.originThoughtId));
        }
        seeds.sort((a, b) => a - b);
        [...adj.keys()].sort((a, b) => a - b).forEach((id) => seeds.push(id));

        const visited = new Set();
        for (const seed of seeds) {
            if (visited.has(seed) || !adj.has(seed)) continue;
            visited.add(seed);
            const queue = [seed];
            while (queue.length) {
                const cur = queue.shift();
                for (const { other, conn } of adj.get(cur)) {
                    if (visited.has(other)) continue;
                    visited.add(other);
                    conn._secondary = false; // the line that first joined `other` to the study
                    queue.push(other);
                }
            }
        }

        this._updateBadges();
    },

    // Should this connection show at full strength right now?
    isRevealed(conn) {
        const f = AppState.focusThoughtId;
        if (f != null && (conn.fromThoughtId === f || conn.toThoughtId === f)) return true;
        return this._pinned.has(conn.fromThoughtId) || this._pinned.has(conn.toThoughtId);
    },

    togglePin(thoughtId) {
        if (this._pinned.has(thoughtId)) this._pinned.delete(thoughtId);
        else this._pinned.add(thoughtId);
        const node = document.getElementById('thought-' + thoughtId);
        const badge = node && node.querySelector('.xlink-badge');
        if (badge) badge.classList.toggle('pinned', this._pinned.has(thoughtId));
    },

    // The "+N" badge: how many cross-links a card has beyond its main-branch lines.
    _updateBadges() {
        const counts = new Map();
        AppState.getConnections().forEach((c) => {
            if (!c._secondary) return;
            counts.set(c.fromThoughtId, (counts.get(c.fromThoughtId) || 0) + 1);
            counts.set(c.toThoughtId, (counts.get(c.toThoughtId) || 0) + 1);
        });

        document.querySelectorAll('.thought-node').forEach((node) => {
            const id = Number(node.getAttribute('data-thought-id'));
            const n = counts.get(id) || 0;
            let badge = node.querySelector('.xlink-badge');

            if (!n) {
                if (badge) badge.remove();
                this._pinned.delete(id);
                return;
            }
            if (!badge) {
                badge = document.createElement('button');
                badge.type = 'button';
                badge.className = 'xlink-badge';
                // The badge must never start a card drag or a card click.
                badge.addEventListener('mousedown', (e) => e.stopPropagation());
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePin(id);
                });
                node.appendChild(badge);
            }
            badge.textContent = '+' + n;
            badge.title = `${n} more connection${n === 1 ? '' : 's'} beyond the main branch — click to keep ${n === 1 ? 'it' : 'them'} lit`;
            badge.classList.toggle('pinned', this._pinned.has(id));
        });
    }
};

// Expose globally
window.ConnectionSkeleton = ConnectionSkeleton;

console.log('🦴 Connection Skeleton module loaded');
