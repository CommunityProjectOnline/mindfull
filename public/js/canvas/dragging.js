/**
 * Node Dragging Module
 * Handles dragging Thought nodes across Inner Space
 */

const NodeDragging = {
    /**
     * Initialize dragging event listeners
     */
    init() {
        // Add drag handlers to existing nodes
        const existingNodes = document.querySelectorAll('.thought-node');
        existingNodes.forEach(node => this.attachDragHandlers(node));

        // Global mouse move and up handlers
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        console.log('✅ Node dragging initialized');
    },

    /**
     * Attach drag event handlers to a Thought node
     * @param {HTMLElement} node - Thought node element
     */
    attachDragHandlers(node) {
        node.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on a connection port or a header action button
            if (e.target.classList.contains('connection-port')) return;
            if (e.target.closest('.thought-node-actions')) return;

            AppState.isDragging = true;
            AppState.currentNode = node;

            // Calculate offset from mouse to node position
            AppState.offsetX = e.clientX - node.offsetLeft;
            AppState.offsetY = e.clientY - node.offsetTop;

            // Add dragging class for visual feedback
            node.classList.add('dragging');

            // Prevent text selection while dragging
            e.preventDefault();
        });

        // Click handler for astronaut interaction
        node.addEventListener('click', (e) => {
            if (e.target.classList.contains('connection-port')) return;
            if (e.target.closest('.thought-node-actions')) return;
            if (AppState.isDragging) return;
            if (typeof jumpToThought !== 'undefined') {
                jumpToThought(node);
            }
        });
    },

    /**
     * Handle mouse move during dragging
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!AppState.isDragging || !AppState.currentNode) return;

        // Calculate new position
        const newX = e.clientX - AppState.offsetX;
        const newY = e.clientY - AppState.offsetY;

        // Update node position
        AppState.currentNode.style.left = newX + 'px';
        AppState.currentNode.style.top = newY + 'px';

        // Update connection lines if ConnectionManager is available
        if (window.ConnectionManager && typeof window.ConnectionManager.updateConnections === 'function') {
            window.ConnectionManager.updateConnections();
        }
    },

    /**
     * Handle mouse up to stop dragging
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        if (AppState.isDragging && AppState.currentNode) {
            AppState.currentNode.classList.remove('dragging');

            // Save position to backend if function exists
            const thoughtId = AppState.currentNode.getAttribute('data-thought-id');
            const x = parseInt(AppState.currentNode.style.left);
            const y = parseInt(AppState.currentNode.style.top);

            if (typeof saveThoughtPosition !== 'undefined' && thoughtId) {
                saveThoughtPosition(thoughtId, x, y);
            }

            AppState.resetDragging();
        }
    }
};

// Expose globally
window.NodeDragging = NodeDragging;

console.log('🎯 Node Dragging module loaded');
