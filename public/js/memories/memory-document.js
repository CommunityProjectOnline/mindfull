/**
 * Memory Document Module
 * The "white paper" view: a Memory read as a flowing document. Thoughts appear as
 * chronological sections (first Thought at the top, latest at the bottom), each with
 * its source, content, Go Deeper entries, and its labeled relationships to the other
 * Thoughts in the Memory ("Confirms →", "← Rebutted by"). Printable; title editable.
 */

const MemoryDocument = {
    modal: null,
    titleInput: null,
    metaEl: null,
    bodyEl: null,
    currentId: null,

    init() {
        this.modal = document.getElementById('memoryDocModal');
        if (!this.modal) return;
        this.titleInput = document.getElementById('memoryDocTitle');
        this.metaEl = document.getElementById('memoryDocMeta');
        this.bodyEl = document.getElementById('memoryDocBody');

        document.getElementById('closeMemoryDoc').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) this.close();
        });

        document.getElementById('printMemoryBtn').addEventListener('click', () => this.print());
        document.getElementById('arrangeMemoryBtn').addEventListener('click', () => this.arrange());
        document.getElementById('deleteMemoryBtn').addEventListener('click', () => this.deleteMemory());

        // Rename on Enter or when leaving the field
        this.titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.titleInput.blur(); }
        });
        this.titleInput.addEventListener('blur', () => this.saveTitle());

        console.log('✅ Memory document view initialized');
    },

    async open(id) {
        const memory = await MemoryAPI.getById(id);
        if (!memory) return;
        this.currentId = id;
        this.render(memory);
        this.modal.classList.remove('hidden');
    },

    close() {
        this.modal.classList.add('hidden');
        this.currentId = null;
    },

    async refresh() {
        if (this.currentId == null) return;
        const memory = await MemoryAPI.getById(this.currentId);
        if (memory) this.render(memory);
    },

    render(memory) {
        this.titleInput.value = memory.name;

        const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        this.metaEl.innerHTML =
            `<span class="doc-dot" style="background:${memory.color}"></span>` +
            `${memory.thoughts.length} Thought${memory.thoughts.length === 1 ? '' : 's'} · ` +
            `${memory.connections.length} Connection${memory.connections.length === 1 ? '' : 's'} · ` +
            `Born ${fmt(memory.created)} · Last touched ${fmt(memory.lastTouched)}`;

        const titleOf = new Map(memory.thoughts.map((t) => [t.id, t.title]));

        this.bodyEl.innerHTML = memory.thoughts.map((t, i) => {
            const type = (name) => (window.ConnectionTypes ? ConnectionTypes.byName(name) : null);

            // Relationships: outgoing ("Confirms → X") and incoming ("← Confirmed by X")
            const rels = memory.connections
                .filter((c) => c.fromThoughtId === t.id || c.toThoughtId === t.id)
                .map((c) => {
                    const outgoing = c.fromThoughtId === t.id;
                    const otherId = outgoing ? c.toThoughtId : c.fromThoughtId;
                    const other = titleOf.get(otherId);
                    if (!other) return '';
                    const tObj = type(c.type);
                    const color = tObj ? tObj.color : '#539bf5';
                    const icon = tObj ? tObj.icon : '↔';
                    const text = outgoing
                        ? `${c.type} → ${this.esc(other)}`
                        : `← ${c.type} — ${this.esc(other)}`;
                    return `<div class="doc-rel" style="border-color:${color}">` +
                           `<span class="doc-rel-icon" style="color:${color}">${icon}</span>${text}</div>`;
                }).join('');

            const depth = (t.depth || []).map((d, di) =>
                `<div class="doc-depth"><span class="doc-depth-num">${di + 1}</span>${this.esc(d.body)}</div>`
            ).join('');

            const tags = (t.tags || []).map((tag) => `<span class="doc-tag">${this.esc(tag)}</span>`).join('');

            return `
            <section class="doc-section">
                <div class="doc-section-head">
                    <span class="doc-section-num">${i + 1}</span>
                    <h3 class="doc-section-title">${this.esc(t.title)}</h3>
                    <span class="doc-section-category" style="background:${window.CategoryColors ? CategoryColors.colorFor(t.category) : '#667eea'};color:#14141c">${this.esc(t.category)}</span>
                    ${t.shortcut ? `<span class="doc-section-shortcut">${this.esc(t.shortcut)}</span>` : ''}
                    <button class="doc-remove-btn no-print" data-thought-id="${t.id}" title="Remove from this Memory">×</button>
                </div>
                <div class="doc-section-date">${fmt(t.created)}</div>
                ${t.source ? `<div class="doc-source">Source · ${this.esc(t.source)}</div>` : ''}
                ${t.content ? `<p class="doc-content">${this.esc(t.content)}</p>` : ''}
                ${depth}
                ${rels ? `<div class="doc-rels">${rels}</div>` : ''}
                ${tags ? `<div class="doc-tags">${tags}</div>` : ''}
            </section>`;
        }).join('');

        // Remove-from-memory buttons
        this.bodyEl.querySelectorAll('.doc-remove-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const tid = Number(btn.getAttribute('data-thought-id'));
                if (!confirm('Remove this Thought from the Memory? (The Thought itself stays in your Inner Space.)')) return;
                const updated = await MemoryAPI.removeThought(this.currentId, tid);
                if (updated && window.MemoryRenderer) MemoryRenderer.upsert(updated);
                if (window.MemoryManager) MemoryManager.refreshPanel();
                this.refresh();
            });
        });
    },

    async saveTitle() {
        if (this.currentId == null) return;
        const name = this.titleInput.value.trim();
        if (!name) { this.refresh(); return; }
        const current = window.MemoryRenderer ? MemoryRenderer.memories.get(this.currentId) : null;
        if (current && current.name === name) return;
        const updated = await MemoryAPI.rename(this.currentId, name);
        if (updated) {
            if (window.MemoryRenderer) MemoryRenderer.upsert(updated);
            if (window.MemoryManager) MemoryManager.refreshPanel();
            console.log('✏️ Memory renamed:', updated.name);
        }
    },

    // Re-lay this Memory out as an organic formation, then fly the camera to it.
    async arrange() {
        if (this.currentId == null) return;
        const id = this.currentId;
        const updated = await MemoryAPI.arrange(id);
        if (!updated) { alert('Could not arrange the Memory.'); return; }
        this.close();
        if (window.loadThoughts) await loadThoughts();
        if (window.MemoryManager) MemoryManager.flyTo(id);
        console.log('✨ Memory arranged into formation:', updated.name);
    },

    async deleteMemory() {
        if (this.currentId == null) return;
        if (!confirm('Delete this Memory? Its Thoughts stay in your Inner Space - only the grouping and its document are removed.')) return;
        const ok = await MemoryAPI.delete(this.currentId);
        if (!ok) { alert('Could not delete the Memory.'); return; }
        if (window.MemoryRenderer) MemoryRenderer.removeMemory(this.currentId);
        if (window.MemoryManager) MemoryManager.refreshPanel();
        this.close();
    },

    print() {
        // Give the printed page (and PDF filename) the Memory's name.
        const prevTitle = document.title;
        document.title = this.titleInput.value || 'MindFull Memory';
        document.body.classList.add('printing');
        const done = () => {
            document.body.classList.remove('printing');
            document.title = prevTitle;
            window.removeEventListener('afterprint', done);
        };
        window.addEventListener('afterprint', done);
        window.print();
    },

    esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
};

// Expose globally
window.MemoryDocument = MemoryDocument;

console.log('📄 Memory Document module loaded');
