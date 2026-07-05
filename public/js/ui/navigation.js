/**
 * Navigation Module
 * Handles sidebar navigation interactions
 */

const Navigation = {
    /**
     * Initialize navigation
     */
    init() {
        this.setupNavigation();
        console.log('✅ Navigation initialized');
        console.log('📋 Sidebar navigation ready!');
    },

    /**
     * Setup navigation event listeners
     */
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all items
                document.querySelectorAll('.nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                });

                // Add active class to clicked item
                item.classList.add('active');

                // Handle specific navigation actions
                const itemId = item.id;
                this.handleNavigation(itemId);
            });
        });
    },

    /**
     * Ascend to the Constellation altitude: frame every Thought, far enough out
     * that the cards have become stars.
     */
    ascendToConstellations() {
        if (!window.CanvasViewport) return;
        const nodes = document.querySelectorAll('.thought-node');
        if (!nodes.length) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach((n) => {
            minX = Math.min(minX, n.offsetLeft);
            minY = Math.min(minY, n.offsetTop);
            maxX = Math.max(maxX, n.offsetLeft + n.offsetWidth);
            maxY = Math.max(maxY, n.offsetTop + n.offsetHeight);
        });

        // One camera flight: frame everything, and high enough that it reads as sky.
        const rect = AppState.constellation.getBoundingClientRect();
        const w = Math.max(maxX - minX, 1);
        const h = Math.max(maxY - minY, 1);
        const fitZoom = Math.min(1, Math.min(rect.width / w, rect.height / h) * 0.7);
        const zoom = Math.min(fitZoom, MindfulConfig.zoom.altitudeFull * 0.9);
        CanvasViewport.centerOn((minX + maxX) / 2, (minY + maxY) / 2, zoom);
        console.log('🌌 Ascending to the constellation sky');
    },

    /**
     * Handle navigation item click
     * @param {string} itemId - Navigation item ID
     */
    handleNavigation(itemId) {
        switch (itemId) {
            case 'navInnerSpace':
                console.log('🌌 Inner Space clicked');
                if (window.CanvasViewport) CanvasViewport.reset(); // back to the workspace
                break;

            case 'navMemories':
                console.log('📚 Memories clicked');
                if (window.MemoryManager) MemoryManager.togglePanel();
                break;

            case 'navTimeline':
                console.log('🕐 Timeline clicked');
                if (window.TimelinePlayer) TimelinePlayer.open();
                break;

            case 'navConstellations':
                console.log('⭐ Constellations clicked');
                this.ascendToConstellations();
                break;

            case 'navForgotten':
                console.log('💭 Forgotten Memories clicked');
                // Future: Load forgotten memories
                break;

            case 'navSettings':
                console.log('⚙️ Settings clicked');
                // Settings is handled by audio.js
                break;

            default:
                console.log('Navigation:', itemId);
        }
    }
};

// Expose globally
window.Navigation = Navigation;

console.log('📋 Navigation module loaded');
