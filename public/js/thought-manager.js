/**
 * Thought Manager Module
 * Handles creating, loading, editing, deleting, and rendering Thought nodes.
 * All data is persisted to the backend (SQLite) via ThoughtAPI.
 */

// Get DOM elements (initialized after DOM loads)
let addThoughtBtn, addThoughtModal, closeThoughtBtn, cancelThoughtBtn, addThoughtForm;
let thoughtModalTitle, thoughtSubmitBtn;

// When set, the modal is editing this Thought; when null, it's creating a new one.
let editingThoughtId = null;

/**
 * Initialize Thought manager
 */
function initThoughtManager() {
    addThoughtBtn = document.getElementById('addThoughtBtn');
    addThoughtModal = document.getElementById('addThoughtModal');
    closeThoughtBtn = document.getElementById('closeThoughtModal');
    cancelThoughtBtn = document.getElementById('cancelThoughtBtn');
    addThoughtForm = document.getElementById('addThoughtForm');
    thoughtModalTitle = document.getElementById('thoughtModalTitle');
    thoughtSubmitBtn = document.getElementById('thoughtSubmitBtn');

    if (!addThoughtBtn || !addThoughtModal || !addThoughtForm) {
        console.error('❌ Thought Manager: Required elements not found');
        return;
    }

    setupEventListeners();
    console.log('✅ Thought Manager initialized');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Open modal in "create" mode
    addThoughtBtn.addEventListener('click', () => openModalForCreate());

    // Close modal handlers
    closeThoughtBtn.addEventListener('click', closeModal);
    cancelThoughtBtn.addEventListener('click', closeModal);

    addThoughtModal.addEventListener('click', (e) => {
        if (e.target === addThoughtModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !addThoughtModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Form submission (handles both create and edit)
    addThoughtForm.addEventListener('submit', handleFormSubmit);
}

/* ----- Shortcut helpers: stored with {{braces}}, edited without them ----- */
function stripBraces(s) {
    return (s || '').replace(/^\{\{/, '').replace(/\}\}$/, '');
}
function wrapShortcut(s) {
    const t = (s || '').trim();
    if (!t) return '';
    return t.startsWith('{{') ? t : `{{${t}}}`;
}

/**
 * Open the modal to create a new Thought
 */
function openModalForCreate() {
    editingThoughtId = null;
    addThoughtForm.reset();
    if (thoughtModalTitle) thoughtModalTitle.textContent = '✨ Create New Thought';
    if (thoughtSubmitBtn) thoughtSubmitBtn.textContent = 'Create Thought';
    addThoughtModal.classList.remove('hidden');
    document.getElementById('thoughtTitle').focus();
}

/**
 * Open the modal to edit an existing Thought
 * @param {Object} thought - Thought data
 */
function openModalForEdit(thought) {
    editingThoughtId = thought.id;
    document.getElementById('thoughtTitle').value = thought.title || '';
    document.getElementById('thoughtCategory').value = thought.category || '';
    document.getElementById('thoughtShortcut').value = stripBraces(thought.shortcut);
    document.getElementById('thoughtContent').value = thought.content || '';
    if (thoughtModalTitle) thoughtModalTitle.textContent = '✎ Edit Thought';
    if (thoughtSubmitBtn) thoughtSubmitBtn.textContent = 'Save Thought';
    addThoughtModal.classList.remove('hidden');
    document.getElementById('thoughtTitle').focus();
}

/**
 * Close the modal
 */
function closeModal() {
    addThoughtModal.classList.add('hidden');
    addThoughtForm.reset();
    editingThoughtId = null;
}

/**
 * Handle form submission - creates or updates depending on mode
 * @param {Event} e - Submit event
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const data = {
        title: document.getElementById('thoughtTitle').value.trim(),
        category: document.getElementById('thoughtCategory').value,
        shortcut: wrapShortcut(document.getElementById('thoughtShortcut').value),
        content: document.getElementById('thoughtContent').value.trim()
    };

    if (!data.title || !data.category) {
        alert('Title and category are required.');
        return;
    }

    try {
        if (editingThoughtId) {
            // EDIT
            const updated = await ThoughtAPI.update(editingThoughtId, data);
            if (!updated) throw new Error('Update failed (the shortcut may already be in use)');
            updateThoughtNode(updated);
            console.log('✏️ Thought updated:', updated);
        } else {
            // CREATE - drop it at a random spot in Inner Space
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

/**
 * Create a new Thought node in the DOM
 * @param {Object} thought - Thought data object
 * @returns {HTMLElement} The created node element
 */
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
                <button class="thought-action-btn edit" type="button" title="Edit Thought">✎</button>
                <button class="thought-action-btn delete" type="button" title="Delete Thought">×</button>
            </div>
        </div>
        <div class="thought-node-meta">
            <span class="thought-node-category"></span>
            <span class="thought-node-shortcut"></span>
        </div>
        <div class="thought-node-content"></div>
    `;

    applyThoughtData(node, thought);
    AppState.constellation.appendChild(node);

    // Attach drag + connection-port handlers
    if (window.NodeDragging) NodeDragging.attachDragHandlers(node);
    if (window.ConnectionManager) ConnectionManager.attachPortHandlers(node);

    // Edit / delete actions (stopPropagation so they don't start a drag or astronaut jump)
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

/**
 * Fill a node's text fields from a Thought object
 */
function applyThoughtData(node, thought) {
    node.querySelector('.thought-node-title').textContent = thought.title;
    node.querySelector('.thought-node-category').textContent = thought.category;
    node.querySelector('.thought-node-shortcut').textContent = thought.shortcut || '';
    node.querySelector('.thought-node-content').textContent = thought.content || '';
}

/**
 * Update an existing Thought node in the DOM after an edit
 * @param {Object} thought - Updated Thought data
 */
function updateThoughtNode(thought) {
    const node = document.getElementById('thought-' + thought.id);
    if (!node) return;
    applyThoughtData(node, thought);
}

/**
 * Delete a Thought (with confirmation), removing its node and any in-canvas connections
 * @param {number} id - Thought ID
 */
async function deleteThought(id) {
    const node = document.getElementById('thought-' + id);
    const title = node ? node.querySelector('.thought-node-title').textContent : 'this Thought';
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    const ok = await ThoughtAPI.delete(id);
    if (!ok) {
        alert('Failed to delete Thought.');
        return;
    }

    // Remove any connections touching this node from the canvas + state
    if (node && window.AppState) {
        AppState.getConnections().slice().forEach(conn => {
            if (conn.fromPort.parentElement === node || conn.toPort.parentElement === node) {
                [conn.path, conn.trail, conn.particle, conn.halo].forEach(el => {
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                });
                AppState.removeConnection(conn);
            }
        });
    }

    if (node) node.remove();
    console.log('🗑️ Thought deleted:', id);
}

/**
 * Load all Thoughts from backend and render them
 */
async function loadThoughts() {
    try {
        const thoughts = await ThoughtAPI.getAll();
        console.log('📦 Loading', thoughts.length, 'thoughts');

        document.querySelectorAll('.thought-node').forEach(n => n.remove());
        thoughts.forEach(t => createThoughtNode(t));

        console.log('✅ Thoughts loaded');
    } catch (error) {
        console.error('❌ Error loading thoughts:', error);
    }
}

/**
 * Save a Thought's position to the backend (called after dragging)
 * @param {string} thoughtId - Thought ID
 * @param {number} x - X position
 * @param {number} y - Y position
 */
async function saveThoughtPosition(thoughtId, x, y) {
    try {
        const result = await ThoughtAPI.update(thoughtId, { x, y });
        if (result) console.log('💾 Saved position:', thoughtId, x, y);
    } catch (error) {
        console.error('❌ Error saving position:', error);
    }
}

// Expose functions globally
window.saveThoughtPosition = saveThoughtPosition;
window.loadThoughts = loadThoughts;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initThoughtManager();
    // Load Thoughts after a short delay to ensure backend is ready
    setTimeout(loadThoughts, 300);
});

console.log('🧠 Thought Manager module loaded');
