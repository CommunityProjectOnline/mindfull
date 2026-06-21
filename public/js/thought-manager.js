/**
 * Thought Manager Module
 * Handles creating, loading, editing, deleting, and rendering Thought nodes, plus tags
 * (meta-words) and the "Go Deeper" flow. All data is persisted via ThoughtAPI.
 */

// Add/Edit modal elements
let addThoughtBtn, addThoughtModal, closeThoughtBtn, cancelThoughtBtn, addThoughtForm;
let thoughtModalTitle, thoughtSubmitBtn;

// Go Deeper modal elements
let goDeeperModal, closeGoDeeperBtn, cancelGoDeeperBtn, goDeeperForm, goDeeperBody, goDeeperThoughtEl, goDeeperEntriesEl;

// When set, the add/edit modal is editing this Thought; null means creating.
let editingThoughtId = null;
// The Thought currently open in the Go Deeper modal.
let goDeeperThoughtId = null;

function initThoughtManager() {
    addThoughtBtn = document.getElementById('addThoughtBtn');
    addThoughtModal = document.getElementById('addThoughtModal');
    closeThoughtBtn = document.getElementById('closeThoughtModal');
    cancelThoughtBtn = document.getElementById('cancelThoughtBtn');
    addThoughtForm = document.getElementById('addThoughtForm');
    thoughtModalTitle = document.getElementById('thoughtModalTitle');
    thoughtSubmitBtn = document.getElementById('thoughtSubmitBtn');

    goDeeperModal = document.getElementById('goDeeperModal');
    closeGoDeeperBtn = document.getElementById('closeGoDeeper');
    cancelGoDeeperBtn = document.getElementById('cancelGoDeeper');
    goDeeperForm = document.getElementById('goDeeperForm');
    goDeeperBody = document.getElementById('goDeeperBody');
    goDeeperThoughtEl = document.getElementById('goDeeperThought');
    goDeeperEntriesEl = document.getElementById('goDeeperEntries');

    if (!addThoughtBtn || !addThoughtModal || !addThoughtForm) {
        console.error('❌ Thought Manager: Required elements not found');
        return;
    }

    setupEventListeners();
    console.log('✅ Thought Manager initialized');
}

function setupEventListeners() {
    addThoughtBtn.addEventListener('click', () => openModalForCreate());
    closeThoughtBtn.addEventListener('click', closeModal);
    cancelThoughtBtn.addEventListener('click', closeModal);
    addThoughtModal.addEventListener('click', (e) => { if (e.target === addThoughtModal) closeModal(); });
    addThoughtForm.addEventListener('submit', handleFormSubmit);

    if (goDeeperModal) {
        closeGoDeeperBtn.addEventListener('click', closeGoDeeper);
        cancelGoDeeperBtn.addEventListener('click', closeGoDeeper);
        goDeeperModal.addEventListener('click', (e) => { if (e.target === goDeeperModal) closeGoDeeper(); });
        goDeeperForm.addEventListener('submit', handleGoDeeperSubmit);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (goDeeperModal && !goDeeperModal.classList.contains('hidden')) closeGoDeeper();
        else if (!addThoughtModal.classList.contains('hidden')) closeModal();
    });
}

/* ----- helpers ----- */
function stripBraces(s) {
    return (s || '').replace(/^\{\{/, '').replace(/\}\}$/, '');
}
function wrapShortcut(s) {
    const t = (s || '').trim();
    if (!t) return '';
    return t.startsWith('{{') ? t : `{{${t}}}`;
}
function parseTags(str) {
    return (str || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
}

/* ----- Add / Edit modal ----- */
function openModalForCreate() {
    editingThoughtId = null;
    addThoughtForm.reset();
    if (thoughtModalTitle) thoughtModalTitle.textContent = '✨ Create New Thought';
    if (thoughtSubmitBtn) thoughtSubmitBtn.textContent = 'Create Thought';
    addThoughtModal.classList.remove('hidden');
    document.getElementById('thoughtTitle').focus();
}

function openModalForEdit(thought) {
    editingThoughtId = thought.id;
    document.getElementById('thoughtTitle').value = thought.title || '';
    document.getElementById('thoughtCategory').value = thought.category || '';
    document.getElementById('thoughtShortcut').value = stripBraces(thought.shortcut);
    document.getElementById('thoughtContent').value = thought.content || '';
    document.getElementById('thoughtTags').value = (thought.tags || []).join(', ');
    if (thoughtModalTitle) thoughtModalTitle.textContent = '✎ Edit Thought';
    if (thoughtSubmitBtn) thoughtSubmitBtn.textContent = 'Save Thought';
    addThoughtModal.classList.remove('hidden');
    document.getElementById('thoughtTitle').focus();
}

function closeModal() {
    addThoughtModal.classList.add('hidden');
    addThoughtForm.reset();
    editingThoughtId = null;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const data = {
        title: document.getElementById('thoughtTitle').value.trim(),
        category: document.getElementById('thoughtCategory').value,
        shortcut: wrapShortcut(document.getElementById('thoughtShortcut').value),
        content: document.getElementById('thoughtContent').value.trim(),
        tags: parseTags(document.getElementById('thoughtTags').value)
    };

    if (!data.title || !data.category) {
        alert('Title and category are required.');
        return;
    }

    try {
        if (editingThoughtId) {
            const updated = await ThoughtAPI.update(editingThoughtId, data);
            if (!updated) throw new Error('Update failed (the shortcut may already be in use)');
            updateThoughtNode(updated);
            console.log('✏️ Thought updated:', updated);
        } else {
            data.x = Math.random() * (window.innerWidth - 400) + 200;
            data.y = Math.random() * (window.innerHeight - 400) + 200;
            const created = await ThoughtAPI.create(data);
            if (!created) throw new Error('Create failed (the shortcut may already be in use)');
            createThoughtNode(created);
            console.log('✨ Thought created:', created);
            if (window.celebrate) celebrate();
            if (window.MindfulAudio) window.MindfulAudio.playSound('create');
        }
        closeModal();
    } catch (error) {
        console.error('❌ Error saving thought:', error);
        alert(error.message || 'Failed to save Thought. Please try again.');
    }
}

/* ----- Go Deeper modal ----- */
async function openGoDeeper(id) {
    // Fetch fresh so we have the latest depth entries.
    const thought = await ThoughtAPI.getById(id);
    if (!thought) return;
    goDeeperThoughtId = id;
    goDeeperThoughtEl.innerHTML =
        `<div class="go-deeper-title">${escapeHtml(thought.title)}</div>` +
        `<div class="go-deeper-original">${escapeHtml(thought.content || '')}</div>`;
    renderDepthEntries(thought.depth || []);
    goDeeperForm.reset();
    goDeeperModal.classList.remove('hidden');
    goDeeperBody.focus();
}

function renderDepthEntries(entries) {
    if (!entries.length) {
        goDeeperEntriesEl.innerHTML = '<div class="go-deeper-empty">No deeper entries yet. Add the first below.</div>';
        return;
    }
    goDeeperEntriesEl.innerHTML = entries
        .map((d, i) => `<div class="go-deeper-entry"><span class="go-deeper-num">${i + 1}</span>${escapeHtml(d.body)}</div>`)
        .join('');
}

function closeGoDeeper() {
    goDeeperModal.classList.add('hidden');
    goDeeperForm.reset();
    goDeeperThoughtId = null;
}

async function handleGoDeeperSubmit(e) {
    e.preventDefault();
    const body = goDeeperBody.value.trim();
    if (!body || !goDeeperThoughtId) return;

    const updated = await ThoughtAPI.addDepth(goDeeperThoughtId, body);
    if (!updated) {
        alert('Failed to add depth. Please try again.');
        return;
    }
    renderDepthEntries(updated.depth || []);
    goDeeperForm.reset();
    updateThoughtNode(updated); // refresh the card's depth indicator
    goDeeperBody.focus();
    console.log('🔎 Went deeper on Thought', goDeeperThoughtId);
}

/* ----- Node rendering ----- */
function createThoughtNode(thought) {
    const node = document.createElement('div');
    node.className = 'thought-node';
    node.id = 'thought-' + thought.id;
    node.setAttribute('data-thought-id', thought.id);
    node.style.left = thought.x + 'px';
    node.style.top = thought.y + 'px';

    node.innerHTML = `
        <div class="connection-port port-top" data-port="top"></div>
        <div class="connection-port port-right" data-port="right"></div>
        <div class="connection-port port-bottom" data-port="bottom"></div>
        <div class="connection-port port-left" data-port="left"></div>
        <div class="thought-node-header">
            <span class="thought-node-title"></span>
            <div class="thought-node-actions">
                <button class="thought-action-btn deeper" type="button" title="Go Deeper">🔎</button>
                <button class="thought-action-btn edit" type="button" title="Edit Thought">✎</button>
                <button class="thought-action-btn delete" type="button" title="Delete Thought">×</button>
            </div>
        </div>
        <div class="thought-node-meta">
            <span class="thought-node-category"></span>
            <span class="thought-node-shortcut"></span>
        </div>
        <div class="thought-node-content"></div>
        <div class="thought-node-tags"></div>
        <div class="thought-node-depth"></div>
    `;

    applyThoughtData(node, thought);
    AppState.constellation.appendChild(node);

    if (window.NodeDragging) NodeDragging.attachDragHandlers(node);
    if (window.ConnectionManager) ConnectionManager.attachPortHandlers(node);

    node.querySelector('.thought-action-btn.deeper').addEventListener('click', (e) => {
        e.stopPropagation();
        openGoDeeper(thought.id);
    });
    node.querySelector('.thought-action-btn.edit').addEventListener('click', async (e) => {
        e.stopPropagation();
        const fresh = await ThoughtAPI.getById(thought.id);
        if (fresh) openModalForEdit(fresh);
    });
    node.querySelector('.thought-action-btn.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteThought(thought.id);
    });

    return node;
}

function applyThoughtData(node, thought) {
    node.querySelector('.thought-node-title').textContent = thought.title;
    node.querySelector('.thought-node-category').textContent = thought.category;
    node.querySelector('.thought-node-shortcut').textContent = thought.shortcut || '';
    node.querySelector('.thought-node-content').textContent = thought.content || '';

    // Tags (meta-words) as chips
    const tagsEl = node.querySelector('.thought-node-tags');
    const tags = thought.tags || [];
    tagsEl.innerHTML = tags.map((t) => `<span class="thought-tag">${escapeHtml(t)}</span>`).join('');

    // Depth indicator
    const depthEl = node.querySelector('.thought-node-depth');
    const count = thought.depthCount != null ? thought.depthCount : (thought.depth ? thought.depth.length : 0);
    depthEl.textContent = count > 0 ? `🔎 ${count} deeper` : '';
}

function updateThoughtNode(thought) {
    const node = document.getElementById('thought-' + thought.id);
    if (!node) return;
    applyThoughtData(node, thought);
}

async function deleteThought(id) {
    const node = document.getElementById('thought-' + id);
    const title = node ? node.querySelector('.thought-node-title').textContent : 'this Thought';
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    const ok = await ThoughtAPI.delete(id);
    if (!ok) {
        alert('Failed to delete Thought.');
        return;
    }

    // The DB cascades this Thought's connections; remove their visuals from the canvas too.
    if (node && window.AppState && window.ConnectionManager) {
        AppState.getConnections().slice().forEach((conn) => {
            if (conn.fromPort.parentElement === node || conn.toPort.parentElement === node) {
                ConnectionManager.removeConnectionVisual(conn);
            }
        });
    }

    if (node) node.remove();
    console.log('🗑️ Thought deleted:', id);
}

/* ----- Load ----- */
async function loadThoughts() {
    try {
        const thoughts = await ThoughtAPI.getAll();
        console.log('📦 Loading', thoughts.length, 'thoughts');

        document.querySelectorAll('.thought-node').forEach((n) => n.remove());
        thoughts.forEach((t) => createThoughtNode(t));

        // Connections must load after the nodes (their ports) exist.
        if (window.ConnectionManager && ConnectionManager.loadConnections) {
            await ConnectionManager.loadConnections();
        }
        console.log('✅ Thoughts loaded');
    } catch (error) {
        console.error('❌ Error loading thoughts:', error);
    }
}

async function saveThoughtPosition(thoughtId, x, y) {
    try {
        const result = await ThoughtAPI.update(thoughtId, { x, y });
        if (result) console.log('💾 Saved position:', thoughtId, x, y);
    } catch (error) {
        console.error('❌ Error saving position:', error);
    }
}

/* ----- util ----- */
function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Expose functions globally
window.saveThoughtPosition = saveThoughtPosition;
window.loadThoughts = loadThoughts;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initThoughtManager();
    setTimeout(loadThoughts, 300);
});

console.log('🧠 Thought Manager module loaded');
