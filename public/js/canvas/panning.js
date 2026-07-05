/**
 * Canvas Panning Module
 * Handles infinite workspace panning. Pan by dragging empty canvas, holding SHIFT
 * while dragging, or using the middle mouse button. The actual camera move is
 * delegated to CanvasViewport, which owns the pan/zoom transform.
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

        constellation.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        console.log('✅ Canvas panning initialized');
        console.log('🗺️ TIP: Drag empty space (or SHIFT+drag / middle mouse) to pan the canvas!');
    },

    /**
     * Handle mouse down for panning
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        // Middle mouse, SHIFT + left click, or a plain left click on empty canvas
        // (the constellation/world itself, not a Thought node or other UI).
        const onEmptyCanvas = e.target === AppState.constellation || e.target === AppState.world;
        if (e.button === 1 || (e.button === 0 && (e.shiftKey || onEmptyCanvas))) {
            e.preventDefault();
            AppState.isPanning = true;
            AppState.panStartX = e.clientX - AppState.panOffsetX;
            AppState.panStartY = e.clientY - AppState.panOffsetY;
            AppState.constellation.classList.add('panning');
        }
    },

    /**
     * Handle mouse move during panning
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!AppState.isPanning) return;

        e.preventDefault();
        CanvasViewport.setPan(e.clientX - AppState.panStartX, e.clientY - AppState.panStartY);
    },

    /**
     * Handle mouse up to stop panning
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        if (AppState.isPanning) {
            AppState.resetPanning();
            AppState.constellation.classList.remove('panning');
        }
    }
};

// Expose globally
window.CanvasPanning = CanvasPanning;

console.log('🗺️ Canvas Panning module loaded');
