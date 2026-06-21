/**
 * Connection Manager Module
 * Handles creating, updating, and managing connections between Thought nodes
 */

const ConnectionManager = {
    /**
     * Initialize connection system
     */
    init() {
        // Attach port handlers to existing nodes
        const existingNodes = document.querySelectorAll('.thought-node');
        existingNodes.forEach(node => this.attachPortHandlers(node));

        // Global handlers for connection dragging
        document.addEventListener('mousemove', this.handleConnectionDrag.bind(this));
        document.addEventListener('mouseup', this.handleConnectionRelease.bind(this));

        console.log('✅ Connection Manager initialized');
        console.log('🧠 Pathways activated - Hover over Thought cards to see connection ports!');
    },

    /**
     * Attach connection port handlers to a node
     * @param {HTMLElement} node - Memory node element
     */
    attachPortHandlers(node) {
        const ports = node.querySelectorAll('.connection-port');

        ports.forEach(port => {
            // Start dragging connection
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                AppState.isDraggingConnection = true;
                AppState.dragStartPort = port;
                port.classList.add('active');

                const startPos = this.getPortPosition(port);
                AppState.tempConnectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                const pathData = `M ${startPos.x} ${startPos.y} L ${e.clientX} ${e.clientY}`;
                AppState.tempConnectionLine.setAttribute('d', pathData);
                AppState.tempConnectionLine.setAttribute('stroke', 'rgba(102, 126, 234, 0.5)');
                AppState.tempConnectionLine.setAttribute('stroke-width', '4');
                AppState.tempConnectionLine.setAttribute('stroke-dasharray', '6,6');
                AppState.tempConnectionLine.setAttribute('fill', 'none');
                AppState.tempConnectionLine.style.pointerEvents = 'none';

                AppState.svgLayer.appendChild(AppState.tempConnectionLine);

                console.log(`⭐ Dragging connection from ${port.parentElement.id}`);
            });

            // Visual feedback on hover
            port.addEventListener('mouseenter', () => {
                port.style.opacity = '1';
                if (AppState.isDraggingConnection && AppState.dragStartPort !== port) {
                    port.classList.add('hover-target');
                }
            });

            port.addEventListener('mouseleave', () => {
                port.classList.remove('hover-target');
            });
        });
    },

    /**
     * Handle connection dragging (mouse move)
     * @param {MouseEvent} e - Mouse event
     */
    handleConnectionDrag(e) {
        if (!AppState.isDraggingConnection || !AppState.tempConnectionLine || !AppState.dragStartPort) {
            return;
        }

        const startPos = this.getPortPosition(AppState.dragStartPort);
        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = Math.min(distance * MindfulConfig.connections.curveIntensity,
                                      MindfulConfig.connections.maxCurveOffset);

        const cp1x = startPos.x + curveOffset;
        const cp1y = startPos.y;
        const cp2x = e.clientX - curveOffset;
        const cp2y = e.clientY;

        const pathData = `M ${startPos.x} ${startPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${e.clientX} ${e.clientY}`;
        AppState.tempConnectionLine.setAttribute('d', pathData);
    },

    /**
     * Handle connection release (mouse up)
     * @param {MouseEvent} e - Mouse event
     */
    handleConnectionRelease(e) {
        if (!AppState.isDraggingConnection) return;

        // Check if mouse is over a valid port
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetPort = targetElement?.classList.contains('connection-port') ? targetElement : null;

        // Clean up temporary line and states
        if (AppState.dragStartPort) {
            AppState.dragStartPort.classList.remove('active');
        }

        document.querySelectorAll('.connection-port').forEach(port => {
            port.classList.remove('hover-target');
        });

        // Create connection if valid target
        if (targetPort && AppState.dragStartPort && targetPort !== AppState.dragStartPort) {
            // Don't allow connecting to same card
            if (AppState.dragStartPort.parentElement === targetPort.parentElement) {
                console.log('⚠️ Cannot connect a Thought to itself!');
            } else {
                const connectionCreated = this.createConnection(AppState.dragStartPort, targetPort);

                if (connectionCreated && window.MindfulAudio) {
                    window.MindfulAudio.playSound('connect');
                    console.log('✨ String created!');
                }
            }
        } else {
            console.log('❌ Connection cancelled');
        }

        AppState.resetConnectionDragging();
    },

    /**
     * Get absolute position of a connection port
     * @param {HTMLElement} port - Port element
     * @returns {Object} Position {x, y}
     */
    getPortPosition(port) {
        const rect = port.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    },

    /**
     * Check if connection already exists between two nodes
     * @param {HTMLElement} fromPort - Starting port
     * @param {HTMLElement} toPort - Ending port
     * @returns {boolean} True if connection exists
     */
    connectionExists(fromPort, toPort) {
        const fromThought = fromPort.parentElement;
        const toThought = toPort.parentElement;

        return AppState.connections.some(conn => {
            const connFromThought = conn.fromPort.parentElement;
            const connToThought = conn.toPort.parentElement;

            // Check both directions (A->B or B->A)
            return (connFromThought === fromThought && connToThought === toThought) ||
                   (connFromThought === toThought && connToThought === fromThought);
        });
    },

    /**
     * Create a new connection between two ports
     * @param {HTMLElement} fromPort - Starting port
     * @param {HTMLElement} toPort - Ending port
     * @returns {boolean} True if connection created successfully
     */
    createConnection(fromPort, toPort) {
        // Check if connection already exists
        if (this.connectionExists(fromPort, toPort)) {
            console.log('⚠️ Connection already exists between these Thoughts!');
            return false;
        }

        const fromPos = this.getPortPosition(fromPort);
        const toPos = this.getPortPosition(toPort);

        // Create SVG path with bezier curve
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = Math.min(distance * MindfulConfig.connections.curveIntensity,
                                      MindfulConfig.connections.maxCurveOffset);

        const cp1x = fromPos.x + curveOffset;
        const cp1y = fromPos.y;
        const cp2x = toPos.x - curveOffset;
        const cp2y = toPos.y;

        const pathData = `M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPos.x} ${toPos.y}`;

        path.setAttribute('d', pathData);
        path.setAttribute('class', 'string');
        path.setAttribute('stroke', MindfulConfig.connections.strokeColor);
        path.setAttribute('stroke-width', MindfulConfig.connections.strokeWidth);
        path.setAttribute('fill', 'none');

        AppState.svgLayer.appendChild(path);

        // Create particle elements (trail, particle, halo)
        const trail = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        trail.setAttribute('stroke-width', MindfulConfig.particles.trail.strokeWidth);
        trail.setAttribute('stroke-linecap', 'round');
        trail.style.pointerEvents = 'none';
        trail.style.filter = `blur(${MindfulConfig.particles.trail.blur}px)`;
        AppState.svgLayer.appendChild(trail);

        const particle = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        particle.setAttribute('rx', MindfulConfig.particles.core.baseRx);
        particle.setAttribute('ry', MindfulConfig.particles.core.baseRy);
        particle.setAttribute('fill', MindfulConfig.particles.core.color);
        particle.style.filter = 'drop-shadow(0 0 6px ' + MindfulConfig.particles.core.glowColor + ')';
        AppState.svgLayer.appendChild(particle);

        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        halo.setAttribute('rx', MindfulConfig.particles.halo.baseRx);
        halo.setAttribute('ry', MindfulConfig.particles.halo.baseRy);
        halo.setAttribute('fill', 'rgba(102, 126, 234, 0.3)');
        halo.style.filter = 'blur(8px)';
        AppState.svgLayer.appendChild(halo);

        // Store connection data
        const connectionData = {
            path,
            controlPoints: { cp1x, cp1y, cp2x, cp2y },
            trail,
            particle,
            halo,
            fromPort,
            toPort,
            progress: 0,
            speed: MindfulConfig.connections.particleSpeed,
            pulsePhase: 0,
            haloPhase: 0
        };

        AppState.addConnection(connectionData);

        console.log(`⚡ String created: ${fromPort.parentElement.id} → ${toPort.parentElement.id}`);
        return true;
    },

    /**
     * Update all connection positions (called when nodes move)
     */
    updateConnections() {
        AppState.connections.forEach(conn => {
            const fromPos = this.getPortPosition(conn.fromPort);
            const toPos = this.getPortPosition(conn.toPort);

            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const curveOffset = Math.min(distance * MindfulConfig.connections.curveIntensity,
                                          MindfulConfig.connections.maxCurveOffset);

            const cp1x = fromPos.x + curveOffset;
            const cp1y = fromPos.y;
            const cp2x = toPos.x - curveOffset;
            const cp2y = toPos.y;

            conn.controlPoints = { cp1x, cp1y, cp2x, cp2y };

            const pathData = `M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPos.x} ${toPos.y}`;
            conn.path.setAttribute('d', pathData);
        });
    }
};

// Expose globally
window.ConnectionManager = ConnectionManager;

console.log('🔗 Connection Manager module loaded');
