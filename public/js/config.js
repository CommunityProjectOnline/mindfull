/**
 * MindFull Application Configuration
 * Centralized constants and configuration values
 */

const MindfulConfig = {
    // Grid Configuration
    grid: {
        size: 100,                  // Grid cell size in pixels
        lineOpacity: 0.12,          // Grid line opacity
        lineColor: 'rgba(100, 100, 120, 0.12)'
    },

    // Canvas Panning
    panning: {
        fadeDistance: 0.15          // Fade connections at edges (0-1)
    },

    // Canvas Zoom & Altitudes
    zoom: {
        min: 0.1,                   // Furthest out (10%) - deep in the constellation sky
        max: 2.5,                   // Closest in (250%)
        step: 1.25,                 // Factor per +/- button press
        wheelSensitivity: 0.0015,   // Wheel delta -> zoom factor exponent
        altitudeStart: 0.55,        // Below this zoom, cards begin fading into stars
        altitudeFull: 0.35          // At/below this zoom, the constellation view is complete
    },

    // Connection/String Configuration
    connections: {
        strokeWidth: 8,
        strokeColor: 'rgba(102, 126, 234, 0.3)',
        curveIntensity: 0.3,        // Bezier curve intensity
        maxCurveOffset: 150,        // Max pixels for curve offset
        particleSpeed: 0.0015,      // Particle travel speed
        trailLengthRatio: 0.05      // Trail length as % of curve
    },

    // Particle/Light Effect Configuration
    particles: {
        core: {
            baseRx: 8,              // Horizontal radius
            maxRx: 12,
            baseRy: 4,              // Vertical radius
            maxRy: 6,
            color: 'rgba(255, 255, 255, 1)',
            glowColor: 'rgba(102, 126, 234, 1)'
        },
        halo: {
            baseRx: 16,
            maxRx: 24,
            baseRy: 10,
            maxRy: 14,
            minOpacity: 0.1,
            maxOpacity: 0.4
        },
        trail: {
            strokeWidth: 10,
            blur: 6,
            minBrightness: 0.8,
            maxBrightness: 1.1
        },
        animation: {
            pulseSpeed: 0.03,       // Core particle pulse speed
            haloSpeed: 0.05         // Halo pulse speed
        }
    },

    // Thought Node Configuration
    thoughtNode: {
        width: 320,                 // Card width in pixels
        maxContentHeight: 120,      // Max scrollable content height
        portSize: 12,               // Connection port size
        portOffset: -6              // Port positioning offset
    },

    // Animation Timings
    animations: {
        astronautMove: 3000,        // ms for astronaut movement
        astronautCelebrate: 600,    // ms for celebration
        astronautWave: 1000,        // ms for wave
        modalSlideIn: 300,          // ms for modal animation
        nowPlayingFade: 4000        // ms before now playing fades
    },

    // Colors
    colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#ffeaa7',
        background: '#010103',
        cardBg: 'rgba(42, 42, 48, 0.95)',
        cardBorder: 'rgba(102, 126, 234, 0.4)',
        text: '#e0e0e0',
        textSecondary: '#b0b0b0'
    },

    // Audio Configuration
    audio: {
        defaultVolume: 0.3,
        soundEffectVolume: 0.5,
        fadeStep: 0.01,
        fadeInterval: 50
    },

    // Z-Index Layers
    zIndex: {
        connectionLayer: 1,
        thoughtNode: 10,
        draggingNode: 1000,
        sidebar: 9999,
        modal: 10000,
        navbar: 10000,
        muteBtn: 9999,
        settingsPanel: 9999
    }
};

// Freeze config to prevent modifications
Object.freeze(MindfulConfig);
Object.freeze(MindfulConfig.grid);
Object.freeze(MindfulConfig.panning);
Object.freeze(MindfulConfig.zoom);
Object.freeze(MindfulConfig.connections);
Object.freeze(MindfulConfig.particles);
Object.freeze(MindfulConfig.particles.core);
Object.freeze(MindfulConfig.particles.halo);
Object.freeze(MindfulConfig.particles.trail);
Object.freeze(MindfulConfig.particles.animation);
Object.freeze(MindfulConfig.thoughtNode);
Object.freeze(MindfulConfig.animations);
Object.freeze(MindfulConfig.colors);
Object.freeze(MindfulConfig.audio);
Object.freeze(MindfulConfig.zIndex);

console.log('⚙️ MindFull Configuration loaded');
