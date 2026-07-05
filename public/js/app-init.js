/**
 * Application Initialization
 * Main entry point that initializes all modules
 */

const MindfulApp = {
    /**
     * Initialize the entire application
     */
    async init() {
        console.log('🚀 Initializing MindFull Application...');

        try {
            // Initialize state first
            if (!AppState.init()) {
                throw new Error('Failed to initialize application state');
            }

            // Initialize all modules
            CanvasViewport.init();
            CanvasPanning.init();
            NodeDragging.init();
            ConnectionManager.init();
            ConnectionAnimator.init();
            MemoryRenderer.init();
            MemoryDocument.init();
            MemoryManager.init();
            StardustManager.init();
            StarField.init();
            RediscoveryPanel.init();
            TimelinePlayer.init();
            AstronautController.init();
            Navigation.init();
            FocusMode.init();

            console.log('✨ MindFull Application initialized successfully!');
            console.log('💡 Tips:');
            console.log('   - Drag Thought cards to move them');
            console.log('   - Hold SHIFT and drag to pan the canvas');
            console.log('   - Hover over cards to see connection ports');
            console.log('   - Drag from port to port to create connections');

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MindfulApp.init());
} else {
    MindfulApp.init();
}

// Expose globally
window.MindfulApp = MindfulApp;

console.log('🎬 Application initialization module loaded');
