/**
 * Stardust Manager Module
 * The staging inbox. Two ways in: a quick capture (jot it now, place it later) and an
 * AI import (paste the JSON produced by the extraction prompt). Items wait here until
 * you review them and place them on the canvas - the AI never dumps onto your Inner
 * Space unreviewed.
 */

const StardustManager = {
    panel: null,
    listEl: null,
    badge: null,
    importModal: null,

    init() {
        this.panel = document.getElementById('stardustPanel');
        this.listEl = document.getElementById('stardustList');
        this.badge = document.getElementById('stardustCount');
        this.importModal = document.getElementById('stardustImportModal');
        if (!this.panel) return;

        document.getElementById('stardustBtn').addEventListener('click', () => this.togglePanel());
        document.getElementById('closeStardustPanel').addEventListener('click', () => this.closePanel());

        // Quick capture
        document.getElementById('stardustCaptureForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.quickCapture();
        });

        // Import modal
        document.getElementById('openImportBtn').addEventListener('click', () => this.openImport());
        document.getElementById('closeImportModal').addEventListener('click', () => this.closeImport());
        document.getElementById('cancelImportBtn').addEventListener('click', () => this.closeImport());
        this.importModal.addEventListener('click', (e) => { if (e.target === this.importModal) this.closeImport(); });
        document.getElementById('confirmImportBtn').addEventListener('click', () => this.doImport());
        document.getElementById('copyPromptBtn').addEventListener('click', () => this.copyPrompt());

        this.refreshBadge();
        console.log('✅ Stardust manager initialized');
    },

    /* ---------- panel ---------- */

    togglePanel() {
        if (this.panel.classList.contains('hidden')) this.openPanel();
        else this.closePanel();
    },

    openPanel() {
        // One right-hand drawer at a time
        if (window.MemoryManager) MemoryManager.closePanel();
        if (window.RediscoveryPanel) RediscoveryPanel.closePanel();
        this.panel.classList.remove('hidden');
        this.refresh();
    },

    closePanel() {
        this.panel.classList.add('hidden');
    },

    async refresh() {
        const inbox = await StardustAPI.getInbox();
        this.renderList(inbox);
        this.updateBadge(inbox.items.length);
    },

    async refreshBadge() {
        const inbox = await StardustAPI.getInbox();
        this.updateBadge(inbox.items.length);
    },

    updateBadge(n) {
        if (!this.badge) return;
        this.badge.textContent = n;
        this.badge.classList.toggle('hidden', n === 0);
    },

    renderList(inbox) {
        const esc = (s) => MemoryDocument.esc(s);
        const byBatch = new Map();
        const loose = [];
        inbox.items.forEach((item) => {
            if (item.batchId) {
                if (!byBatch.has(item.batchId)) byBatch.set(item.batchId, []);
                byBatch.get(item.batchId).push(item);
            } else {
                loose.push(item);
            }
        });

        const itemHtml = (item) => `
            <div class="stardust-item" data-item-id="${item.id}">
                <div class="stardust-item-main">
                    <div class="stardust-item-title">${esc(item.title)}</div>
                    <div class="stardust-item-meta">
                        <span class="stardust-item-category">${esc(item.category)}</span>
                        ${item.content ? `<span class="stardust-item-preview">${esc(item.content.slice(0, 90))}${item.content.length > 90 ? '…' : ''}</span>` : ''}
                    </div>
                </div>
                <div class="stardust-item-actions">
                    <button class="stardust-place-btn" title="Place on canvas">📍</button>
                    <button class="stardust-discard-btn" title="Discard">×</button>
                </div>
            </div>`;

        let html = '';

        inbox.batches.forEach((batch) => {
            const items = byBatch.get(batch.id) || [];
            html += `
            <div class="stardust-batch" data-batch-id="${batch.id}">
                <div class="stardust-batch-head">
                    <div>
                        <div class="stardust-batch-name">📥 ${esc(batch.suggestedMemoryName || 'Imported study')}</div>
                        ${batch.summary ? `<div class="stardust-batch-summary">${esc(batch.summary)}</div>` : ''}
                        <div class="stardust-batch-meta">${items.length} waiting · ${batch.linkCount} proposed connections</div>
                    </div>
                    <button class="btn-primary stardust-place-all">Place all</button>
                </div>
                ${items.map(itemHtml).join('')}
            </div>`;
        });

        if (loose.length) {
            html += `<div class="stardust-loose-title">Quick captures</div>` + loose.map(itemHtml).join('');
        }

        if (!html) {
            html = `<div class="stardust-empty">Nothing waiting. Jot a quick capture above, or use
                    <strong>Import from AI</strong> to turn a paper or conversation into Thoughts.</div>`;
        }

        this.listEl.innerHTML = html;

        this.listEl.querySelectorAll('.stardust-item').forEach((el) => {
            const id = Number(el.getAttribute('data-item-id'));
            el.querySelector('.stardust-place-btn').addEventListener('click', () => this.placeOne(id));
            el.querySelector('.stardust-discard-btn').addEventListener('click', () => this.discard(id));
        });
        this.listEl.querySelectorAll('.stardust-batch').forEach((el) => {
            const batchId = el.getAttribute('data-batch-id');
            el.querySelector('.stardust-place-all').addEventListener('click', () => this.placeAll(batchId));
        });
    },

    /* ---------- quick capture ---------- */

    async quickCapture() {
        const titleEl = document.getElementById('stardustTitle');
        const contentEl = document.getElementById('stardustContent');
        const categoryEl = document.getElementById('stardustCategory');
        const title = titleEl.value.trim();
        if (!title) { titleEl.focus(); return; }

        const item = await StardustAPI.capture({
            title,
            content: contentEl.value.trim(),
            category: categoryEl.value || 'Note'
        });
        if (!item) { alert('Could not capture that.'); return; }

        titleEl.value = '';
        contentEl.value = '';
        titleEl.focus();
        if (window.MindfulAudio) MindfulAudio.playSound('click');
        this.refresh();
    },

    /* ---------- placement ---------- */

    _viewCenter() {
        if (window.CanvasViewport) {
            return CanvasViewport.toWorld(window.innerWidth / 2, window.innerHeight / 2);
        }
        return { x: 400, y: 300 };
    },

    async placeOne(id) {
        const c = this._viewCenter();
        const result = await StardustAPI.place(
            id,
            c.x - 160 + (Math.random() - 0.5) * 200,
            c.y - 100 + (Math.random() - 0.5) * 160
        );
        if (!result) { alert('Could not place that Thought.'); return; }

        // Draw the new node, then any connections that just resolved.
        const node = createThoughtNode(result.thought);
        result.connections.forEach((conn) => {
            if (conn.pathway && window.PathwayManager) PathwayManager.register(conn.pathway);
            const fromNode = document.getElementById('thought-' + conn.fromThoughtId);
            const toNode = document.getElementById('thought-' + conn.toThoughtId);
            if (!fromNode || !toNode) return;
            const ports = ConnectionManager.pickClosestPorts(fromNode, toNode);
            if (!ports) return;
            const pathway = window.PathwayManager ? PathwayManager.get(conn.pathwayId) : null;
            ConnectionManager.drawConnection(ports.fromPort, ports.toPort, ConnectionTypes.byName(conn.type), conn.id, pathway);
        });

        if (window.MindfulAudio) MindfulAudio.playSound(result.connections.length ? 'connect' : 'create');
        if (window.jumpToThought) jumpToThought(node);
        this.refresh();
        console.log('📍 Placed stardust as Thought', result.thought.id,
            result.connections.length ? `(+${result.connections.length} connections)` : '');
    },

    async placeAll(batchId) {
        const c = this._viewCenter();
        const result = await StardustAPI.placeAll(batchId, c.x, c.y);
        if (!result) { alert('Could not place that batch.'); return; }

        // A whole study just materialized - reload the canvas wholesale so thoughts,
        // pathways, connections, and the new Memory all appear consistently.
        if (window.loadThoughts) await loadThoughts();

        if (window.celebrate) celebrate();
        if (window.MindfulAudio) MindfulAudio.playSound('create');
        this.refresh();
        if (window.MemoryManager) MemoryManager.refreshPanel();

        const parts = [`${result.thoughts.length} Thoughts`];
        if (result.connections.length) parts.push(`${result.connections.length} connections`);
        if (result.memory) parts.push(`Memory "${result.memory.name}"`);
        console.log('🌠 Batch placed:', parts.join(', '));
    },

    async discard(id) {
        if (!confirm('Discard this from Stardust? It never becomes a Thought.')) return;
        const ok = await StardustAPI.discard(id);
        if (ok) this.refresh();
    },

    /* ---------- import ---------- */

    openImport() {
        document.getElementById('importJsonInput').value = '';
        document.getElementById('importError').textContent = '';
        this.importModal.classList.remove('hidden');
        document.getElementById('importJsonInput').focus();
    },

    closeImport() {
        this.importModal.classList.add('hidden');
    },

    async doImport() {
        const input = document.getElementById('importJsonInput');
        const errEl = document.getElementById('importError');
        errEl.textContent = '';

        let raw = input.value.trim();
        if (!raw) { errEl.textContent = 'Paste the JSON the AI returned.'; return; }
        // Tolerate a pasted ```json ... ``` fence.
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

        let payload;
        try {
            payload = JSON.parse(raw);
        } catch (e) {
            errEl.textContent = 'That is not valid JSON - copy the AI\'s output exactly.';
            return;
        }

        try {
            const result = await StardustAPI.import(payload);
            this.closeImport();
            this.openPanel();
            if (window.MindfulAudio) MindfulAudio.playSound('create');
            console.log(`📥 Imported ${result.itemCount} thoughts into Stardust`);
        } catch (e) {
            errEl.textContent = e.message;
        }
    },

    async copyPrompt() {
        const btn = document.getElementById('copyPromptBtn');
        const text = await StardustAPI.getPrompt();
        if (!text) { btn.textContent = 'Prompt unavailable'; return; }
        try {
            await navigator.clipboard.writeText(text);
            const old = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = old; }, 1800);
        } catch (e) {
            alert('Could not copy - the prompt is also in AI-Ingestion-Prompt.md in the project folder.');
        }
    }
};

// Expose globally
window.StardustManager = StardustManager;

console.log('🌠 Stardust Manager module loaded');
