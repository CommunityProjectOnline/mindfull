/**
 * Connection Animator Module
 * Handles animating particles traveling along connection paths
 */

const ConnectionAnimator = {
    animationFrameId: null,

    /**
     * Initialize and start animation loop
     */
    init() {
        this.startAnimation();
        console.log('✅ Connection Animator initialized');
    },

    /**
     * Start the animation loop
     */
    startAnimation() {
        this.animate();
    },

    /**
     * Stop the animation loop
     */
    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    /**
     * Main animation loop
     */
    animate() {
        this.updateParticles();
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    },

    /**
     * Update all particle positions and effects
     */
    updateParticles() {
        AppState.connections.forEach(conn => {
            // Move particle forward
            conn.progress += conn.speed;

            // Loop back to start when reaching end
            if (conn.progress >= 1) {
                conn.progress = 0;
            }

            // Increment pulse phases
            conn.pulsePhase += MindfulConfig.particles.animation.pulseSpeed;
            conn.haloPhase += MindfulConfig.particles.animation.haloSpeed;

            // Get port positions
            const fromPos = ConnectionManager.getPortPosition(conn.fromPort);
            const toPos = ConnectionManager.getPortPosition(conn.toPort);
            const { cp1x, cp1y, cp2x, cp2y } = conn.controlPoints;

            // Calculate particle position on bezier curve
            const point = this.getPointOnBezier(
                conn.progress,
                fromPos.x, fromPos.y,
                cp1x, cp1y,
                cp2x, cp2y,
                toPos.x, toPos.y
            );

            const particleX = point.x;
            const particleY = point.y;

            // Calculate travel angle (tangent to curve)
            const angle = this.getTangentAngle(
                conn.progress,
                fromPos.x, fromPos.y,
                cp1x, cp1y,
                cp2x, cp2y,
                toPos.x, toPos.y
            );

            // Calculate trail position
            const trailProgress = Math.max(0, conn.progress - MindfulConfig.connections.trailLengthRatio);
            const trailStart = this.getPointOnBezier(
                trailProgress,
                fromPos.x, fromPos.y,
                cp1x, cp1y,
                cp2x, cp2y,
                toPos.x, toPos.y
            );

            // Update trail
            conn.trail.setAttribute('x1', trailStart.x);
            conn.trail.setAttribute('y1', trailStart.y);
            conn.trail.setAttribute('x2', particleX);
            conn.trail.setAttribute('y2', particleY);

            const rgb = conn.rgb || '102, 126, 234'; // per-connection color (by type)
            const trailBrightness = Math.sin(conn.pulsePhase) * 0.3 + MindfulConfig.particles.trail.minBrightness;
            conn.trail.setAttribute('stroke', `rgba(${rgb}, ${trailBrightness})`);

            // Update particle
            conn.particle.setAttribute('cx', particleX);
            conn.particle.setAttribute('cy', particleY);
            conn.particle.setAttribute('transform', `rotate(${angle} ${particleX} ${particleY})`);

            // Particle pulsing effect
            const pulseIntensity = Math.sin(conn.pulsePhase) * 0.5 + 0.5;
            const currentRx = MindfulConfig.particles.core.baseRx +
                (MindfulConfig.particles.core.maxRx - MindfulConfig.particles.core.baseRx) * pulseIntensity;
            const currentRy = MindfulConfig.particles.core.baseRy +
                (MindfulConfig.particles.core.maxRy - MindfulConfig.particles.core.baseRy) * pulseIntensity;

            conn.particle.setAttribute('rx', currentRx);
            conn.particle.setAttribute('ry', currentRy);

            const minBrightness = 0.6;
            const brightness = minBrightness + (1 - minBrightness) * pulseIntensity;
            conn.particle.setAttribute('fill', `rgba(255, 255, 255, ${brightness})`);
            conn.particle.style.filter = `drop-shadow(0 0 ${8 + pulseIntensity * 8}px rgba(${rgb}, ${brightness}))`;

            // Update halo
            conn.halo.setAttribute('cx', particleX);
            conn.halo.setAttribute('cy', particleY);
            conn.halo.setAttribute('transform', `rotate(${angle} ${particleX} ${particleY})`);

            const haloIntensity = Math.sin(conn.haloPhase) * 0.5 + 0.5;
            const currentHaloRx = MindfulConfig.particles.halo.baseRx +
                (MindfulConfig.particles.halo.maxRx - MindfulConfig.particles.halo.baseRx) * haloIntensity;
            const currentHaloRy = MindfulConfig.particles.halo.baseRy +
                (MindfulConfig.particles.halo.maxRy - MindfulConfig.particles.halo.baseRy) * haloIntensity;

            conn.halo.setAttribute('rx', currentHaloRx);
            conn.halo.setAttribute('ry', currentHaloRy);

            const haloOpacity = MindfulConfig.particles.halo.minOpacity +
                (MindfulConfig.particles.halo.maxOpacity - MindfulConfig.particles.halo.minOpacity) * haloIntensity;

            // Fade at start and end of journey
            const fadeDistance = MindfulConfig.panning.fadeDistance;
            let travelOpacity = 1;

            if (conn.progress < fadeDistance) {
                travelOpacity = conn.progress / fadeDistance;
            } else if (conn.progress > 1 - fadeDistance) {
                travelOpacity = (1 - conn.progress) / fadeDistance;
            }

            conn.particle.setAttribute('opacity', travelOpacity * brightness);
            conn.halo.setAttribute('opacity', travelOpacity * haloOpacity);
        });
    },

    /**
     * Calculate point on cubic bezier curve at time t (0 to 1)
     * @param {number} t - Time parameter (0-1)
     * @param {number} p0x - Start X
     * @param {number} p0y - Start Y
     * @param {number} cp1x - Control point 1 X
     * @param {number} cp1y - Control point 1 Y
     * @param {number} cp2x - Control point 2 X
     * @param {number} cp2y - Control point 2 Y
     * @param {number} p1x - End X
     * @param {number} p1y - End Y
     * @returns {Object} Point {x, y}
     */
    getPointOnBezier(t, p0x, p0y, cp1x, cp1y, cp2x, cp2y, p1x, p1y) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = mt3 * p0x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * p1x;
        const y = mt3 * p0y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * p1y;

        return { x, y };
    },

    /**
     * Get tangent angle on bezier curve at time t
     * @param {number} t - Time parameter (0-1)
     * @param {number} p0x - Start X
     * @param {number} p0y - Start Y
     * @param {number} cp1x - Control point 1 X
     * @param {number} cp1y - Control point 1 Y
     * @param {number} cp2x - Control point 2 X
     * @param {number} cp2y - Control point 2 Y
     * @param {number} p1x - End X
     * @param {number} p1y - End Y
     * @returns {number} Angle in degrees
     */
    getTangentAngle(t, p0x, p0y, cp1x, cp1y, cp2x, cp2y, p1x, p1y) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;

        const dx = 3 * mt2 * (cp1x - p0x) + 6 * mt * t * (cp2x - cp1x) + 3 * t2 * (p1x - cp2x);
        const dy = 3 * mt2 * (cp1y - p0y) + 6 * mt * t * (cp2y - cp1y) + 3 * t2 * (p1y - cp2y);

        return Math.atan2(dy, dx) * (180 / Math.PI);
    }
};

// Expose globally
window.ConnectionAnimator = ConnectionAnimator;

console.log('✨ Connection Animator module loaded');
