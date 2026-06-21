/**
 * Astronaut Controller Module
 * Manages the astronaut mascot interactions and animations
 */

const AstronautController = {
    astronaut: null,

    /**
     * Initialize astronaut controller
     */
    init() {
        this.astronaut = document.getElementById('astronaut');

        if (!this.astronaut) {
            console.warn('⚠️ Astronaut element not found');
            return;
        }

        // Wave when page loads
        setTimeout(() => {
            this.wave();
        }, 1000);

        console.log('✅ Astronaut controller initialized');
        console.log('🧑‍🚀 Astronaut mascot ready - Click on Thought cards to see him jump!');
    },

    /**
     * Astronaut floats to a Thought card
     * @param {HTMLElement} thoughtNode - Target Thought node
     */
    jumpToThought(thoughtNode) {
        if (!this.astronaut) return;

        const rect = thoughtNode.getBoundingClientRect();

        // Position astronaut near the Thought card (bottom-right)
        const targetX = rect.right - 60;
        const targetY = rect.bottom - 70;

        this.astronaut.classList.add('moving');
        this.astronaut.classList.remove('at-thought');

        // Use requestAnimationFrame for smooth transition
        requestAnimationFrame(() => {
            this.astronaut.style.bottom = 'auto';
            this.astronaut.style.right = 'auto';
            this.astronaut.style.left = targetX + 'px';
            this.astronaut.style.top = targetY + 'px';
        });

        // Animation completes
        setTimeout(() => {
            this.astronaut.classList.remove('moving');
            this.astronaut.classList.add('at-thought');
        }, MindfulConfig.animations.astronautMove);

        console.log('🚀 Astronaut floating to Thought:', thoughtNode.id);
    },

    /**
     * Astronaut returns home (bottom-right corner)
     */
    returnHome() {
        if (!this.astronaut) return;

        this.astronaut.classList.add('moving');
        this.astronaut.classList.remove('at-thought');

        this.astronaut.style.bottom = '30px';
        this.astronaut.style.right = '30px';
        this.astronaut.style.left = 'auto';
        this.astronaut.style.top = 'auto';

        setTimeout(() => {
            this.astronaut.classList.remove('moving');
        }, MindfulConfig.animations.astronautMove);

        console.log('🚀 Astronaut returned home');
    },

    /**
     * Astronaut thinking pose
     */
    startThinking() {
        if (!this.astronaut) return;
        this.astronaut.classList.add('thinking');
        console.log('🤔 Astronaut is thinking...');
    },

    /**
     * Stop thinking pose
     */
    stopThinking() {
        if (!this.astronaut) return;
        this.astronaut.classList.remove('thinking');
    },

    /**
     * Astronaut celebrates
     */
    celebrate() {
        if (!this.astronaut) return;

        this.astronaut.classList.add('celebrating');
        setTimeout(() => {
            this.astronaut.classList.remove('celebrating');
        }, MindfulConfig.animations.astronautCelebrate);

        console.log('🎉 Astronaut is celebrating!');
    },

    /**
     * Astronaut waves
     */
    wave() {
        if (!this.astronaut) return;

        this.astronaut.classList.add('waving');
        setTimeout(() => {
            this.astronaut.classList.remove('waving');
        }, MindfulConfig.animations.astronautWave);

        console.log('👋 Astronaut is waving!');
    }
};

// Expose globally for backward compatibility
window.jumpToThought = (node) => AstronautController.jumpToThought(node);
window.returnHome = () => AstronautController.returnHome();
window.startThinking = () => AstronautController.startThinking();
window.stopThinking = () => AstronautController.stopThinking();
window.celebrate = () => AstronautController.celebrate();
window.wave = () => AstronautController.wave();

window.AstronautController = AstronautController;

console.log('🧑‍🚀 Astronaut Controller module loaded');
