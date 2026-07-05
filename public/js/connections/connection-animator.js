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
        // Counter-scale: as the camera pulls out, lines grow in world units so they hold
        // a steady screen weight - constellation lines instead of vanishing hairs.
        const zoom = window.CanvasViewport ? CanvasViewport.zoom : 1;
        const cs = Math.max(1, 0.5 / zoom);
        // At altitude the light pulses bow out entirely (a clean star map), and the lines
        // re-anchor from the card ports to the star centers.
        const alt = window.CanvasViewport ? CanvasViewport.altitude : 0;
        const pulseVis = Math.max(0, 1 - alt * 1.6); // pulses are gone well before full sky

        // Crowd control: the denser the web, the quieter each line rests...
        const n = AppState.connections.length;
        const baseAlpha = n > 30 ? 0.22 : n > 16 ? 0.3 : 0.4;
        // ...and past a dozen connections the pulses take turns - a rotating crew of 8
        // instead of every line flying a comet at once.
        const budgeted = n > 12;
        const dutyCycle = Math.floor(performance.now() / 5000);
        // The spotlight: when a Thought is focused, only its own lines stay lit.
        const focusId = AppState.focusThoughtId;

        AppState.connections.forEach((conn, i) => {
            const touchesFocus = focusId != null &&
                (conn.fromThoughtId === focusId || conn.toThoughtId === focusId);
            // Cross-links (beyond the main branch) rest as ghosts unless the user asks
            // for them - by hovering a card or pinning its +N badge.
            const revealed = window.ConnectionSkeleton ? ConnectionSkeleton.isRevealed(conn) : false;
            const ghost = conn._secondary && !revealed;
            let dimTarget = 1;
            if (focusId != null && !touchesFocus) dimTarget = 0.06;
            if (ghost) dimTarget = Math.min(dimTarget, alt > 0 ? 0 : 0.1);
            conn._dim = (conn._dim == null ? 1 : conn._dim) + (dimTarget - (conn._dim == null ? 1 : conn._dim)) * 0.18;
            const dim = conn._dim;
            // Endpoints: ports in the workspace, blending to card centers in the sky.
            const fromPos = ConnectionManager.endpointFor(conn.fromPort, alt);
            const toPos = ConnectionManager.endpointFor(conn.toPort, alt);
            const cps = ConnectionManager.controlPointsFor(fromPos, toPos);
            conn.controlPoints = cps;
            const { cp1x, cp1y, cp2x, cp2y } = cps;

            // The line: redrawn each frame so it straightens and re-anchors as the camera
            // ascends. In the workspace lines wear their pathway colors; in the sky every
            // line settles into the same thin space-blue, glow off - a classic star map
            // where the STARS carry the color.
            conn.path.setAttribute('d', ConnectionManager.pathData(fromPos, toPos, cps));
            if (alt <= 0) {
                conn.path.style.strokeWidth = (ghost ? 1.5 : 3) * cs;
                conn.path.style.stroke = `rgba(${conn.rgb}, ${(baseAlpha * dim).toFixed(3)})`;
                conn.path.style.filter = dim < 0.5
                    ? 'none'
                    : `drop-shadow(0 0 5px rgba(${conn.rgb}, ${(0.55 * dim).toFixed(3)}))`;
            } else {
                const [r, g, b] = conn.rgb.split(',').map(Number);
                const mix = (from, to) => Math.round(from + (to - from) * alt);
                const skyRgb = `${mix(r, 148)}, ${mix(g, 168)}, ${mix(b, 226)}`;
                conn.path.style.strokeWidth = (3 * cs) * (1 - alt) + (1.1 / zoom) * alt;
                conn.path.style.stroke = `rgba(${skyRgb}, ${((0.4 + 0.18 * alt) * dim).toFixed(3)})`;
                conn.path.style.filter = alt > 0.8
                    ? 'none'
                    : `drop-shadow(0 0 5px rgba(${conn.rgb}, ${(0.55 * (1 - alt) * dim).toFixed(3)}))`;
            }

            // The type badge dims with its line (and fades with altitude), and a
            // ghosted badge shouldn't catch clicks meant for the canvas.
            conn.label.style.opacity = (dim * (1 - alt)).toFixed(3);
            conn.label.style.pointerEvents = dim < 0.3 ? 'none' : 'auto';

            // Is this line's comet flying right now? Ghosts never fly; focused lines
            // always do; otherwise it must be this line's turn in the rotating crew
            // (or the web is small).
            const onDuty = !budgeted || (((i - dutyCycle) % n) + n) % n < 8;
            const pulseAllowed = !ghost && (focusId != null ? touchesFocus : onDuty);

            // Show or hide the pulse trio in one go.
            const pulseDisplay = pulseVis > 0 && pulseAllowed ? '' : 'none';
            if (conn.particle.style.display !== pulseDisplay) {
                conn.particle.style.display = pulseDisplay;
                conn.halo.style.display = pulseDisplay;
                conn.trail.style.display = pulseDisplay;
            }
            if (pulseVis <= 0 || !pulseAllowed) return;

            // Move particle forward
            conn.progress += conn.speed;

            // Loop back to start when reaching end
            if (conn.progress >= 1) {
                conn.progress = 0;
            }

            // Increment pulse phases
            conn.pulsePhase += MindfulConfig.particles.animation.pulseSpeed;
            conn.haloPhase += MindfulConfig.particles.animation.haloSpeed;

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
            conn.trail.setAttribute('stroke-width', MindfulConfig.particles.trail.strokeWidth);

            const rgb = conn.rgb || '102, 126, 234'; // per-connection color (by type)
            const trailBrightness = (Math.sin(conn.pulsePhase) * 0.3 + MindfulConfig.particles.trail.minBrightness) * pulseVis;
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

            conn.particle.setAttribute('opacity', travelOpacity * brightness * pulseVis);
            conn.halo.setAttribute('opacity', travelOpacity * haloOpacity * pulseVis);
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
