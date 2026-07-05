/**
 * Application State Management
 * Centralized global state for the MindFull application
 */

const AppState = {
    // Dragging state
    isDragging: false,
    currentNode: null,
    offsetX: 0,
    offsetY: 0,

    // Connection state
    connections: [],
    isDraggingConnection: false,
    dragStartPort: null,
    tempConnectionLine: null,

    // Focus mode (hover spotlight) - the Thought id under the spotlight, or null
    focusThoughtId: null,

    // Canvas panning state
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panOffsetX: 0,
    panOffsetY: 0,

    // DOM References (initialized on load)
    constellation: null,
    world: null,
    svgLayer: null,

    /**
     * Initialize state with DOM references
     */
    init() {
        this.constellation = document.getElementById('constellation');
        this.world = document.getElementById('world');
        this.svgLayer = document.getElementById('connectionLayer');

        if (!this.constellation || !this.world || !this.svgLayer) {
            console.error('❌ Failed to initialize AppState: Required DOM elements not found');
            return false;
        }

        console.log('✅ Application state initialized');
        return true;
    },

    /**
     * Reset dragging state
     */
    resetDragging() {
        this.isDragging = false;
        this.currentNode = null;
        this.offsetX = 0;
        this.offsetY = 0;
    },

    /**
     * Reset connection dragging state
     */
    resetConnectionDragging() {
        this.isDraggingConnection = false;
        this.dragStartPort = null;

        if (this.tempConnectionLine && this.svgLayer) {
            this.svgLayer.removeChild(this.tempConnectionLine);
            this.tempConnectionLine = null;
        }
    },

    /**
     * Reset panning state
     */
    resetPanning() {
        this.isPanning = false;
    },

    /**
     * Add a connection to state
     * @param {Object} connection - Connection data object
     */
    addConnection(connection) {
        this.connections.push(connection);
        // The main-branch/cross-link split shifts whenever the web changes.
        if (window.ConnectionSkeleton) ConnectionSkeleton.scheduleRecompute();
    },

    /**
     * Remove a connection from state
     * @param {Object} connection - Connection data object to remove
     */
    removeConnection(connection) {
        const index = this.connections.indexOf(connection);
        if (index > -1) {
            this.connections.splice(index, 1);
        }
        if (window.ConnectionSkeleton) ConnectionSkeleton.scheduleRecompute();
    },

    /**
     * Get all connections
     * @returns {Array} Array of connection objects
     */
    getConnections() {
        return this.connections;
    }
};

// Expose globally for backward compatibility
window.AppState = AppState;

console.log('🗂️ Application State module loaded');
