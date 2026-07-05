/**
 * Rediscovery Panel Module
 * "This Thought shares meta-words with one from months ago - connect them?"
 * A drawer of suggested connections between unconnected Thoughts, driven by shared
 * tags, similar wording, and time gaps (see src/models/rediscovery.js). Each card:
 * connect (with a chosen type), fly to see the pair, or dismiss forever.
 */

const RediscoveryPanel = {
    panel: null,
    listEl: null,
    badge: null,

    init() {
        this.panel = document.getElementById('rediscoveryPanel');
        this.listEl = document.getElementById('rediscoveryList');
        this.badge = document.getElementById('rediscoveryCount');
        if (!this.panel) return;

        document.getElementById('rediscoveryBtn').addEventListener('click', () => this.togglePanel());
        document.getElementById('closeRediscoveryPanel').addEventListener('click', () => this.closePanel());

        // The badge quietly reflects how many introductions are waiting.
        setTimeout(() => this.refreshBadge(), 1500);
        console.log('✅ Rediscovery panel initialized');
    },

    togglePanel() {
        if (this.panel.classList.contains('hidden')) this.openPanel();
        else this.closePanel();
    },

    openPanel() {
        if (window.MemoryManager) MemoryManager.closePanel();
        if (window.StardustManager) StardustManager.closePanel();
        this.panel.classList.remove('hidden');
        this.refresh();
    },

    closePanel() {
        this.panel.classList.add('hidden');
    },

    async refreshBadge() {
        const suggestions = await RediscoveryAPI.getSuggestions();
        this.updateBadge(suggestions.length);
    },

    updateBadge(n) {
        if (!this.badge) return;
        this.badge.textContent = n;
        this.badge.classList.toggle('hidden', n === 0);
    },

    async refresh() {
        const suggestions = await RediscoveryAPI.getSuggestions();
        this.updateBadge(suggestions.length);
        this.render(suggestions);
    },

    render(suggestions) {
        const esc = (s) => MemoryDocument.esc(s);
        const catColor = (c) => (window.CategoryColors ? CategoryColors.colorFor(c) : '#667eea');

        if (!suggestions.length) {
            this.listEl.innerHTML =
                '<div class="rediscovery-empty">Nothing to introduce right now. As you add Thoughts and ' +
                'meta-words, MindFull will notice when two unconnected Thoughts probably belong together.</div>';
            return;
        }

        const typeOptions = ConnectionTypes.list
            .map((t) => `<option value="${esc(t.name)}"${t.name === 'Relates to' ? ' selected' : ''}>${t.icon} ${esc(t.name)}</option>`)
            .join('');

        this.listEl.innerHTML = suggestions.map((s, i) => `
            <div class="rediscovery-card" data-index="${i}">
                <div class="rediscovery-pair">
                    <span class="rediscovery-thought"><span class="rediscovery-cat-dot" style="background:${catColor(s.a.category)}"></span>${esc(s.a.title)}</span>
                    <span class="rediscovery-link-mark">↔</span>
                    <span class="rediscovery-thought"><span class="rediscovery-cat-dot" style="background:${catColor(s.b.category)}"></span>${esc(s.b.title)}</span>
                </div>
                ${s.sharedTags.length ? `<div class="rediscovery-tags">${s.sharedTags.map((t) => `<span class="thought-tag">${esc(t)}</span>`).join('')}</div>` : ''}
                <div class="rediscovery-reasons">${esc(s.reasons.join(' · '))}</div>
                <div class="rediscovery-actions">
                    <select class="rediscovery-type">${typeOptions}</select>
                    <button class="btn-primary rediscovery-connect">Connect</button>
                    <button class="btn-secondary rediscovery-show" title="Fly to this pair">👁</button>
                    <button class="btn-secondary rediscovery-dismiss" title="Not related - never suggest again">✕</button>
                </div>
            </div>
        `).join('');

        this.listEl.querySelectorAll('.rediscovery-card').forEach((card) => {
            const s = suggestions[Number(card.getAttribute('data-index'))];
            card.querySelector('.rediscovery-connect').addEventListener('click', () =>
                this.connect(s, card.querySelector('.rediscovery-type').value));
            card.querySelector('.rediscovery-show').addEventListener('click', () => this.showPair(s));
            card.querySelector('.rediscovery-dismiss').addEventListener('click', () => this.dismiss(s));
        });
    },

    async connect(s, typeName) {
        const fromNode = document.getElementById('thought-' + s.a.id);
        const toNode = document.getElementById('thought-' + s.b.id);
        if (!fromNode || !toNode) {
            alert('Could not find those Thoughts on the canvas.');
            return;
        }
        const ports = ConnectionManager.pickClosestPorts(fromNode, toNode);
        if (!ports) return;
        // createConnection persists, draws the line, plays the sound, sends the pulse.
        const ok = await ConnectionManager.createConnection(ports.fromPort, ports.toPort, ConnectionTypes.byName(typeName));
        if (ok) {
            if (window.celebrate) celebrate();
            this.refresh();
        }
    },

    showPair(s) {
        const nodes = [s.a.id, s.b.id]
            .map((id) => document.getElementById('thought-' + id))
            .filter(Boolean);
        if (!nodes.length || !window.CanvasViewport) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach((n) => {
            minX = Math.min(minX, n.offsetLeft);
            minY = Math.min(minY, n.offsetTop);
            maxX = Math.max(maxX, n.offsetLeft + n.offsetWidth);
            maxY = Math.max(maxY, n.offsetTop + n.offsetHeight);
        });
        CanvasViewport.fitBounds(minX, minY, maxX, maxY);
    },

    async dismiss(s) {
        const ok = await RediscoveryAPI.dismiss(s.a.id, s.b.id);
        if (ok) this.refresh();
    }
};

// Expose globally
window.RediscoveryPanel = RediscoveryPanel;

console.log('💫 Rediscovery Panel module loaded');
