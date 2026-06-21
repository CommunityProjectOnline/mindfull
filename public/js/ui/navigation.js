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
     * Handle navigation item click
     * @param {string} itemId - Navigation item ID
     */
    handleNavigation(itemId) {
        switch (itemId) {
            case 'navInnerSpace':
                console.log('🌌 Inner Space clicked');
                // Future: Load inner space view
                break;

            case 'navMemories':
                console.log('📚 Memories clicked');
                // Future: Load memories list view
                break;

            case 'navTimeline':
                console.log('🕐 Timeline clicked');
                // Future: Load timeline view
                break;

            case 'navConstellations':
                console.log('⭐ Constellations clicked');
                // Future: Load constellations view
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
