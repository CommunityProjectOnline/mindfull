/**
 * Memory Manager Module
 * The human side of Memories: the "New Memory" flow (click Thoughts to gather them,
 * double-click to grab a whole connected cluster, name it, save), plus the Memories
 * side panel (list, fly-to-cluster, open document).
 */

const MemoryManager = {
    selecting: false,
    selected: new Set(), // thought ids gathered for the new Memory
    _downPos: null,      // drag guard: ignore "clicks" that were really drags

    bar: null,
    nameInput: null,
    countEl: null,
    panel: null,
    listEl: null,

    init() {
        this.bar = document.getElementById('memoryBar');
        this.nameInput = document.getElementById('memoryNameInput');
        this.countEl = document.getElementById('memorySelCount');
        this.panel = document.getElementById('memoriesPanel');
        this.listEl = document.getElementById('memoriesList');

        const startBtn = document.getElementById('createMemoryBtn');
        if (startBtn) startBtn.addEventListener('click', () => this.toggleSelecting());

        document.getElementById('memoryCreateConfirm').addEventListener('click', () => this.confirmCreate());
        document.getElementById('memoryCancelBtn').addEventListener('click', () => this.exitSelecting());
        this.nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.confirmCreate(); }
        });

        document.getElementById('closeMemoriesPanel').addEventListener('click', () => this.closePanel());

        // Capture-phase handlers so selection mode wins over the cards' own click behavior.
        document.addEventListener('mousedown', (e) => { this._downPos = { x: e.clientX, y: e.clientY }; }, true);
        document.addEventListener('click', this._onClick.bind(this), true);
        document.addEventListener('dblclick', this._onDblClick.bind(this), true);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selecting) this.exitSelecting();
        });

        console.log('✅ Memory manager initialized');
    },

    /* ---------- selection mode ---------- */

    toggleSelecting() {
        if (this.selecting) this.exitSelecting();
        else this.enterSelecting();
    },

    enterSelecting() {
        this.selecting = true;
        this.selected.clear();
        this.bar.classList.remove('hidden');
        document.body.classList.add('memory-selecting');
        this.nameInput.value = '';
        this._updateCount();
        this.nameInput.focus();
        console.log('🫧 Building a Memory - click Thoughts to include them');
    },

    exitSelecting() {
        this.selecting = false;
        this.bar.classList.add('hidden');
        document.body.classList.remove('memory-selecting');
        document.querySelectorAll('.thought-node.memory-selected')
            .forEach((n) => n.classList.remove('memory-selected'));
        this.selected.clear();
    },

    _nodeFromEvent(e) {
        if (!this.selecting) return null;
        const node = e.target.closest && e.target.closest('.thought-node');
        if (!node) return null;
        // Ports and card action buttons keep their normal behavior.
        if (e.target.classList.contains('connection-port')) return null;
        if (e.target.closest('.thought-node-actions')) return null;
        return node;
    },

    _onClick(e) {
        const node = this._nodeFromEvent(e);
        if (!node) return;
        // A drag that ended on the card is not a selection click.
        if (this._downPos && Math.hypot(e.clientX - this._downPos.x, e.clientY - this._downPos.y) > 5) return;
        e.stopPropagation();
        e.preventDefault();
        this._toggleNode(node);
    },

    _onDblClick(e) {
        const node = this._nodeFromEvent(e);
        if (!node) return;
        e.stopPropagation();
        e.preventDefault();
        // Double-click gathers the whole connected cluster.
        const startId = Number(node.getAttribute('data-thought-id'));
        this._clusterOf(startId).forEach((id) => {
            this.selected.add(id);
            const el = document.getElementById('thought-' + id);
            if (el) el.classList.add('memory-selected');
        });
        this._updateCount();
        if (window.MindfulAudio) MindfulAudio.playSound('click');
    },

    _toggleNode(node) {
        const id = Number(node.getAttribute('data-thought-id'));
        if (this.selected.has(id)) {
            this.selected.delete(id);
            node.classList.remove('memory-selected');
        } else {
            this.selected.add(id);
            node.classList.add('memory-selected');
        }
        this._updateCount();
        if (window.MindfulAudio) MindfulAudio.playSound('click');
    },

    // Breadth-first walk over the live connections to find the connected cluster.
    _clusterOf(startId) {
        const cluster = new Set([startId]);
        const queue = [startId];
        while (queue.length) {
            const id = queue.shift();
            AppState.getConnections().forEach((c) => {
                [[c.fromThoughtId, c.toThoughtId], [c.toThoughtId, c.fromThoughtId]].forEach(([a, b]) => {
                    if (a === id && !cluster.has(b)) {
                        cluster.add(b);
                        queue.push(b);
                    }
                });
            });
        }
        return cluster;
    },

    _updateCount() {
        const n = this.selected.size;
        this.countEl.textContent = n === 1 ? '1 Thought' : `${n} Thoughts`;
    },

    async confirmCreate() {
        const name = this.nameInput.value.trim();
        if (!name) { this.nameInput.focus(); return; }
        if (!this.selected.size) { alert('Click at least one Thought to include in this Memory.'); return; }

        const memory = await MemoryAPI.create({ name, thoughtIds: [...this.selected] });
        if (!memory) { alert('Could not create the Memory.'); return; }

        this.exitSelecting();
        if (window.MemoryRenderer) MemoryRenderer.upsert(memory);
        this.refreshPanel();
        if (window.celebrate) celebrate();
        if (window.MindfulAudio) MindfulAudio.playSound('create');
        console.log('🫧 Memory born:', memory.name, `(${memory.thoughtIds.length} thoughts)`);
    },

    /* ---------- Memories panel ---------- */

    togglePanel() {
        if (this.panel.classList.contains('hidden')) this.openPanel();
        else this.closePanel();
    },

    openPanel() {
        // One right-hand drawer at a time
        if (window.StardustManager) StardustManager.closePanel();
        if (window.RediscoveryPanel) RediscoveryPanel.closePanel();
        this.panel.classList.remove('hidden');
        this.refreshPanel();
    },

    closePanel() {
        this.panel.classList.add('hidden');
    },

    refreshPanel() {
        if (!this.listEl || this.panel.classList.contains('hidden')) return;
        const memories = window.MemoryRenderer ? [...MemoryRenderer.memories.values()] : [];

        if (!memories.length) {
            this.listEl.innerHTML =
                '<div class="memories-empty">No Memories yet. Connect some Thoughts, then press ' +
                '<strong>New Memory</strong> and gather them into one.</div>';
            return;
        }

        const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        this.listEl.innerHTML = memories.map((m) => `
            <div class="memory-row" data-memory-id="${m.id}">
                <span class="memory-row-dot" style="background:${m.color}"></span>
                <div class="memory-row-info">
                    <div class="memory-row-name">${MemoryDocument.esc(m.name)}</div>
                    <div class="memory-row-meta">${m.thoughtIds.length} Thoughts · ${m.connectionCount} Connections · ${fmt(m.updated)}</div>
                </div>
                <button class="memory-row-open" title="Open as document">📄</button>
            </div>
        `).join('');

        this.listEl.querySelectorAll('.memory-row').forEach((rowEl) => {
            const id = Number(rowEl.getAttribute('data-memory-id'));
            rowEl.addEventListener('click', () => this.flyTo(id));
            rowEl.querySelector('.memory-row-open').addEventListener('click', (e) => {
                e.stopPropagation();
                MemoryDocument.open(id);
            });
        });
    },

    // Frame the Memory's cluster in the viewport.
    flyTo(id) {
        const memory = window.MemoryRenderer ? MemoryRenderer.memories.get(id) : null;
        if (!memory || !window.CanvasViewport) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, found = false;
        memory.thoughtIds.forEach((tid) => {
            const node = document.getElementById('thought-' + tid);
            if (!node) return;
            found = true;
            minX = Math.min(minX, node.offsetLeft);
            minY = Math.min(minY, node.offsetTop);
            maxX = Math.max(maxX, node.offsetLeft + node.offsetWidth);
            maxY = Math.max(maxY, node.offsetTop + node.offsetHeight);
        });
        if (found) CanvasViewport.fitBounds(minX, minY, maxX, maxY);
    }
};

// Expose globally
window.MemoryManager = MemoryManager;

console.log('🗂️ Memory Manager module loaded');
