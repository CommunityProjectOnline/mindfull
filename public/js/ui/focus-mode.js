/**
 * Focus Mode Module
 * The spotlight: rest the mouse on a Thought for a beat and the canvas dims around
 * it - only that card, its directly-connected neighbors, and the lines between them
 * stay at full strength. Move away and everything breathes back. This is how a dense
 * web of connections stays readable without hiding anything.
 */

const FocusMode = {
    _timer: null,

    init() {
        document.addEventListener('mouseover', (e) => {
            const node = e.target.closest && e.target.closest('.thought-node');
            if (!node) return;
            clearTimeout(this._timer);
            // A short dwell, so just mousing across the canvas doesn't strobe the lights.
            this._timer = setTimeout(() => this._activate(node), 220);
        });

        document.addEventListener('mouseout', (e) => {
            const node = e.target.closest && e.target.closest('.thought-node');
            if (!node) return;
            // Still inside the same card (moving between its children)? Stay focused.
            if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.thought-node') === node) return;
            clearTimeout(this._timer);
            this._deactivate();
        });

        console.log('✅ Focus mode initialized (hover a Thought to spotlight its connections)');
    },

    _activate(node) {
        // Not while mid-gesture - the spotlight would fight the interaction.
        if (AppState.isDragging || AppState.isDraggingConnection || AppState.isPanning) return;
        if (document.body.classList.contains('memory-selecting')) return;
        if (document.body.classList.contains('constellation-mode')) return;

        const id = Number(node.getAttribute('data-thought-id'));
        AppState.focusThoughtId = id;
        document.body.classList.add('focus-active');

        this._clearMarks();
        node.classList.add('focus-self');
        AppState.getConnections().forEach((c) => {
            if (c.fromThoughtId === id || c.toThoughtId === id) {
                const other = c.fromThoughtId === id ? c.toThoughtId : c.fromThoughtId;
                const el = document.getElementById('thought-' + other);
                if (el) el.classList.add('focus-neighbor');
            }
        });
    },

    _deactivate() {
        AppState.focusThoughtId = null;
        document.body.classList.remove('focus-active');
        this._clearMarks();
    },

    _clearMarks() {
        document.querySelectorAll('.thought-node.focus-self, .thought-node.focus-neighbor')
            .forEach((n) => n.classList.remove('focus-self', 'focus-neighbor'));
    }
};

// Expose globally
window.FocusMode = FocusMode;

console.log('🔦 Focus Mode module loaded');
