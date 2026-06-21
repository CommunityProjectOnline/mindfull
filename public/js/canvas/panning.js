/**
 * Canvas Panning Module
 * Handles infinite workspace panning with SHIFT+drag or middle mouse
 */

const CanvasPanning = {
    /**
     * Initialize panning event listeners
     */
    init() {
        const constellation = AppState.constellation;
        if (!constellation) {
            console.error('❌ Cannot initialize panning: constellation not found');
            return;
        }

        // Start panning on middle mouse or SHIFT + left click
        constellation.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        console.log('✅ Canvas panning initialized');
        console.log('🗺️ TIP: Hold SHIFT + drag or use middle mouse button to pan the canvas!');
    },

    /**
     * Handle mouse down for panning
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        // Middle mouse button (1) OR left click (0) + SHIFT
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            e.preventDefault();
            AppState.isPanning = true;
            AppState.panStartX = e.clientX - AppState.panOffsetX;
            AppState.panStartY = e.clientY - AppState.panOffsetY;
            AppState.constellation.classList.add('panning');
            console.log('🗺️ Panning Inner Space...');
        }
    },

    /**
     * Handle mouse move during panning
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!AppState.isPanning) return;

        e.preventDefault();
        AppState.panOffsetX = e.clientX - AppState.panStartX;
        AppState.panOffsetY = e.clientY - AppState.panStartY;

        // Update grid background position
        AppState.constellation.style.backgroundPosition =
            `center, ${AppState.panOffsetX}px ${AppState.panOffsetY}px, ${AppState.panOffsetX}px ${AppState.panOffsetY}px, center, 0 0`;

        // Move all content (nodes and connections) with the grid
        AppState.constellation.style.transform =
            `translate(${AppState.panOffsetX}px, ${AppState.panOffsetY}px)`;
    },

    /**
     * Handle mouse up to stop panning
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        if (AppState.isPanning) {
            AppState.resetPanning();
            AppState.constellation.classList.remove('panning');
            console.log('✅ Pan complete');
        }
    }
};

// Expose globally
window.CanvasPanning = CanvasPanning;

console.log('🗺️ Canvas Panning module loaded');
