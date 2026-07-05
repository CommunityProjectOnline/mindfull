/**
 * Connection Manager Module
 * Draws, types, persists, and manages connections (neural pathways) between Thought nodes.
 *
 * Flow: drag port -> port. On release over a valid target, a small type picker appears
 * (Confirms / Rebuts / Branches from / Relates to / Question). Choosing a type persists the
 * connection, plays the connect sound, and starts the colored light pulse traveling the line.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag) => document.createElementNS(SVG_NS, tag);

const ConnectionManager = {
    _activePickerCleanup: null,

    init() {
        // Attach port handlers to existing nodes
        document.querySelectorAll('.thought-node').forEach((node) => this.attachPortHandlers(node));

        // Global handlers for connection dragging
        document.addEventListener('mousemove', this.handleConnectionDrag.bind(this));
        document.addEventListener('mouseup', this.handleConnectionRelease.bind(this));

        console.log('✅ Connection Manager initialized');
        console.log('🧠 Pathways activated - drag port to port to connect Thoughts!');
    },

    /**
     * Attach connection port handlers to a node
     * @param {HTMLElement} node - Thought node element
     */
    attachPortHandlers(node) {
        const ports = node.querySelectorAll('.connection-port');

        ports.forEach((port) => {
            // Start dragging a connection
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                AppState.isDraggingConnection = true;
                AppState.dragStartPort = port;
                port.classList.add('active');

                const startPos = this.getPortPosition(port);
                const cur = this.toSvgPoint(e.clientX, e.clientY);
                AppState.tempConnectionLine = svgEl('path');

                AppState.tempConnectionLine.setAttribute('d', `M ${startPos.x} ${startPos.y} L ${cur.x} ${cur.y}`);
                AppState.tempConnectionLine.setAttribute('stroke', 'rgba(102, 126, 234, 0.5)');
                AppState.tempConnectionLine.setAttribute('stroke-width', '4');
                AppState.tempConnectionLine.setAttribute('stroke-dasharray', '6,6');
                AppState.tempConnectionLine.setAttribute('fill', 'none');
                AppState.tempConnectionLine.style.pointerEvents = 'none';

                AppState.svgLayer.appendChild(AppState.tempConnectionLine);
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
     * Handle connection dragging (mouse move) - draw the dashed lead line
     */
    handleConnectionDrag(e) {
        if (!AppState.isDraggingConnection || !AppState.tempConnectionLine || !AppState.dragStartPort) {
            return;
        }

        const startPos = this.getPortPosition(AppState.dragStartPort);
        const cur = this.toSvgPoint(e.clientX, e.clientY);
        const cps = this.controlPointsFor(startPos, cur);
        AppState.tempConnectionLine.setAttribute(
            'd',
            `M ${startPos.x} ${startPos.y} C ${cps.cp1x} ${cps.cp1y}, ${cps.cp2x} ${cps.cp2y}, ${cur.x} ${cur.y}`
        );
    },

    /**
     * Handle connection release (mouse up) - if dropped on a valid target, offer a type picker
     */
    handleConnectionRelease(e) {
        if (!AppState.isDraggingConnection) return;

        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetPort = targetElement && targetElement.classList.contains('connection-port') ? targetElement : null;

        const startPort = AppState.dragStartPort;
        if (startPort) startPort.classList.remove('active');
        document.querySelectorAll('.connection-port').forEach((p) => p.classList.remove('hover-target'));

        // Tear down the dashed lead line / drag state before we open the picker.
        AppState.resetConnectionDragging();

        if (!targetPort || !startPort || targetPort === startPort) {
            console.log('❌ Connection cancelled');
            return;
        }
        if (startPort.parentElement === targetPort.parentElement) {
            console.log('⚠️ Cannot connect a Thought to itself!');
            return;
        }
        if (this.connectionExists(startPort, targetPort)) {
            console.log('⚠️ Connection already exists between these Thoughts!');
            return;
        }

        // Ask what kind of connection this is.
        this.showTypePicker(e.clientX, e.clientY, startPort, targetPort);
    },

    /**
     * Show the connection-type picker near (clientX, clientY)
     */
    showTypePicker(clientX, clientY, fromPort, toPort) {
        if (this._activePickerCleanup) this._activePickerCleanup();

        const menu = document.createElement('div');
        menu.className = 'connection-type-picker';

        const cleanup = () => {
            menu.remove();
            document.removeEventListener('mousedown', onOutside, true);
            document.removeEventListener('keydown', onEsc, true);
            if (this._activePickerCleanup === cleanup) this._activePickerCleanup = null;
        };
        const onOutside = (ev) => { if (!menu.contains(ev.target)) cleanup(); };
        const onEsc = (ev) => { if (ev.key === 'Escape') cleanup(); };

        const heading = document.createElement('div');
        heading.className = 'connection-type-picker-title';
        heading.textContent = 'Connection type';
        menu.appendChild(heading);

        ConnectionTypes.list.forEach((t) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'conn-type-option';
            btn.innerHTML =
                `<span class="conn-type-dot" style="background:${t.color}"></span>` +
                `<span class="conn-type-icon" style="color:${t.color}">${t.icon}</span>` +
                `<span class="conn-type-name">${t.name}</span>`;
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                cleanup();
                this.createConnection(fromPort, toPort, t);
            });
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        // Keep the menu on-screen
        const rect = menu.getBoundingClientRect();
        let left = clientX;
        let top = clientY;
        if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
        if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
        menu.style.left = Math.max(8, left) + 'px';
        menu.style.top = Math.max(8, top) + 'px';

        this._activePickerCleanup = cleanup;
        // Defer so the current mouseup doesn't immediately close it.
        setTimeout(() => {
            document.addEventListener('mousedown', onOutside, true);
            document.addEventListener('keydown', onEsc, true);
        }, 0);
    },

    /**
     * Create a typed connection from a UI gesture: persist it, draw it, play the sound.
     * @returns {Promise<boolean>}
     */
    async createConnection(fromPort, toPort, typeObj) {
        if (this.connectionExists(fromPort, toPort)) return false;

        const fromId = Number(fromPort.parentElement.getAttribute('data-thought-id'));
        const toId = Number(toPort.parentElement.getAttribute('data-thought-id'));

        const saved = await ConnectionAPI.create({
            fromThoughtId: fromId,
            toThoughtId: toId,
            type: typeObj.name
        });
        if (!saved) {
            alert('Could not create the connection.');
            return false;
        }

        // The server may have born a new pathway (and a new Origin) for this connection.
        if (saved.pathway && window.PathwayManager) PathwayManager.register(saved.pathway);
        const pathway = window.PathwayManager ? PathwayManager.get(saved.pathwayId) : null;

        this.drawConnection(fromPort, toPort, typeObj, saved.id, pathway);

        if (window.MindfulAudio) window.MindfulAudio.playSound('connect');
        console.log(`⚡ Connection created (${typeObj.name}): #${fromId} → #${toId}`);
        return true;
    },

    /**
     * Draw a connection's SVG (line + light pulse + type badge) and register it in state.
     * Used both for freshly-created connections and for ones loaded from the database.
     *
     * The line and light pulse take the PATHWAY's branch color when the connection belongs
     * to one; cross-links (no pathway) fall back to the connection-type color. The type
     * badge at the midpoint always keeps the type's color and icon.
     * @returns {Object} the connection data object
     */
    drawConnection(fromPort, toPort, typeObj, dbId, pathway) {
        const pathwayRgb = pathway && window.PathwayManager
            ? PathwayManager.hexToRgbTriplet(pathway.color)
            : null;
        const rgb = pathwayRgb || typeObj.rgb;
        const fromPos = this.getPortPosition(fromPort);
        const toPos = this.getPortPosition(toPort);
        const cps = this.controlPointsFor(fromPos, toPos);

        // The pathway line
        const path = svgEl('path');
        path.setAttribute('class', 'string');
        path.setAttribute('d', this.pathData(fromPos, toPos, cps));
        path.style.stroke = `rgba(${rgb}, 0.4)`;
        path.style.strokeWidth = '3';
        path.style.fill = 'none';
        path.style.filter = `drop-shadow(0 0 5px rgba(${rgb}, 0.55))`;
        AppState.svgLayer.appendChild(path);

        // Light pulse: trail + white core + colored halo
        const trail = svgEl('line');
        trail.setAttribute('stroke-width', MindfulConfig.particles.trail.strokeWidth);
        trail.setAttribute('stroke-linecap', 'round');
        trail.style.pointerEvents = 'none';
        trail.style.filter = `blur(${MindfulConfig.particles.trail.blur}px)`;
        AppState.svgLayer.appendChild(trail);

        const particle = svgEl('ellipse');
        particle.setAttribute('rx', MindfulConfig.particles.core.baseRx);
        particle.setAttribute('ry', MindfulConfig.particles.core.baseRy);
        particle.setAttribute('fill', MindfulConfig.particles.core.color);
        particle.style.filter = `drop-shadow(0 0 6px rgba(${rgb}, 1))`;
        AppState.svgLayer.appendChild(particle);

        const halo = svgEl('ellipse');
        halo.setAttribute('rx', MindfulConfig.particles.halo.baseRx);
        halo.setAttribute('ry', MindfulConfig.particles.halo.baseRy);
        halo.setAttribute('fill', `rgba(${rgb}, 0.3)`);
        halo.style.filter = 'blur(8px)';
        AppState.svgLayer.appendChild(halo);

        // Type badge (icon) at the midpoint - click to remove the connection
        const label = svgEl('g');
        label.setAttribute('class', 'connection-label');
        label.style.pointerEvents = 'auto';
        label.style.cursor = 'pointer';
        const labelBg = svgEl('circle');
        labelBg.setAttribute('r', '11');
        labelBg.setAttribute('fill', 'rgba(8, 8, 14, 0.85)');
        labelBg.setAttribute('stroke', typeObj.color);
        labelBg.setAttribute('stroke-width', '1.5');
        const labelText = svgEl('text');
        labelText.setAttribute('text-anchor', 'middle');
        labelText.setAttribute('dominant-baseline', 'central');
        labelText.setAttribute('fill', typeObj.color);
        labelText.setAttribute('font-size', '12');
        labelText.textContent = typeObj.icon;
        const title = svgEl('title');
        title.textContent = typeObj.name;
        label.appendChild(labelBg);
        label.appendChild(labelText);
        label.appendChild(title);
        AppState.svgLayer.appendChild(label);

        const conn = {
            id: dbId,
            type: typeObj.name,
            rgb,
            color: typeObj.color,
            icon: typeObj.icon,
            pathwayId: pathway ? pathway.id : null,
            path,
            controlPoints: cps,
            trail,
            particle,
            halo,
            label,
            fromPort,
            toPort,
            fromThoughtId: Number(fromPort.parentElement.getAttribute('data-thought-id')),
            toThoughtId: Number(toPort.parentElement.getAttribute('data-thought-id')),
            progress: 0,
            speed: MindfulConfig.connections.particleSpeed,
            pulsePhase: 0,
            haloPhase: 0
        };

        label.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showConnectionMenu(e.clientX, e.clientY, conn);
        });

        this.positionLabel(conn, fromPos, toPos, cps);
        AppState.addConnection(conn);
        return conn;
    },

    /**
     * Load all persisted pathways + connections and draw them (after Thought nodes exist)
     */
    async loadConnections() {
        AppState.getConnections().slice().forEach((c) => this.removeConnectionVisual(c));

        // Pathways first: connections need their branch colors, and Origins get their glow.
        if (window.PathwayManager) await PathwayManager.load();

        const conns = await ConnectionAPI.getAll();
        conns.forEach((c) => {
            const fromNode = document.getElementById('thought-' + c.fromThoughtId);
            const toNode = document.getElementById('thought-' + c.toThoughtId);
            if (!fromNode || !toNode) return;

            const ports = this.pickClosestPorts(fromNode, toNode);
            if (!ports) return;
            const pathway = window.PathwayManager ? PathwayManager.get(c.pathwayId) : null;
            this.drawConnection(ports.fromPort, ports.toPort, ConnectionTypes.byName(c.type), c.id, pathway);
        });

        if (window.PathwayManager) PathwayManager.markOrigins();
        console.log('🔗 Loaded', conns.length, 'connections');
    },

    /**
     * Small menu on a connection's type badge: shows the type, offers pathway color
     * swatches (when the connection belongs to a branch), and delete.
     */
    showConnectionMenu(clientX, clientY, conn) {
        if (this._activePickerCleanup) this._activePickerCleanup();

        const menu = document.createElement('div');
        menu.className = 'connection-type-picker';

        const cleanup = () => {
            menu.remove();
            document.removeEventListener('mousedown', onOutside, true);
            document.removeEventListener('keydown', onEsc, true);
            if (this._activePickerCleanup === cleanup) this._activePickerCleanup = null;
        };
        const onOutside = (ev) => { if (!menu.contains(ev.target)) cleanup(); };
        const onEsc = (ev) => { if (ev.key === 'Escape') cleanup(); };

        const heading = document.createElement('div');
        heading.className = 'connection-type-picker-title';
        heading.innerHTML =
            `<span class="conn-type-icon" style="color:${conn.color}">${conn.icon}</span> ${conn.type}`;
        menu.appendChild(heading);

        const pathway = window.PathwayManager ? PathwayManager.get(conn.pathwayId) : null;
        if (pathway && PathwayManager.palette.length) {
            const swatchTitle = document.createElement('div');
            swatchTitle.className = 'connection-type-picker-title';
            swatchTitle.textContent = 'Pathway color';
            menu.appendChild(swatchTitle);

            const row = document.createElement('div');
            row.className = 'conn-swatch-row';
            PathwayManager.palette.forEach((color) => {
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.className = 'conn-swatch' + (color === pathway.color ? ' current' : '');
                swatch.style.background = color;
                swatch.title = color;
                swatch.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    cleanup();
                    await PathwayManager.setColor(pathway.id, color);
                });
                row.appendChild(swatch);
            });
            menu.appendChild(row);
        }

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'conn-type-option conn-menu-delete';
        del.innerHTML = '<span class="conn-type-icon">🗑</span><span class="conn-type-name">Delete connection</span>';
        del.addEventListener('click', (ev) => {
            ev.stopPropagation();
            cleanup();
            if (confirm(`Remove this "${conn.type}" connection?`)) this.deleteConnection(conn);
        });
        menu.appendChild(del);

        document.body.appendChild(menu);

        // Keep the menu on-screen
        const rect = menu.getBoundingClientRect();
        let left = clientX;
        let top = clientY;
        if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
        if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
        menu.style.left = Math.max(8, left) + 'px';
        menu.style.top = Math.max(8, top) + 'px';

        this._activePickerCleanup = cleanup;
        setTimeout(() => {
            document.addEventListener('mousedown', onOutside, true);
            document.addEventListener('keydown', onEsc, true);
        }, 0);
    },

    /**
     * Restyle a connection's line + pulse to a new branch color (pathway recolor).
     */
    restyleConnection(conn, color) {
        const rgb = PathwayManager.hexToRgbTriplet(color);
        if (!rgb) return;
        conn.rgb = rgb; // the animator reads this every frame for the pulse + trail
        conn.path.style.stroke = `rgba(${rgb}, 0.4)`;
        conn.path.style.filter = `drop-shadow(0 0 5px rgba(${rgb}, 0.55))`;
        conn.halo.setAttribute('fill', `rgba(${rgb}, 0.3)`);
    },

    /**
     * Delete a connection (from the database + the canvas)
     */
    async deleteConnection(conn) {
        if (conn.id) {
            const ok = await ConnectionAPI.delete(conn.id);
            if (!ok) {
                alert('Could not delete the connection.');
                return;
            }
        }
        this.removeConnectionVisual(conn);
        console.log('🗑️ Connection removed:', conn.id);
    },

    /**
     * Remove a connection's SVG elements and drop it from state (no API call).
     * Used when a Thought is deleted and the DB already cascaded its connections.
     */
    removeConnectionVisual(conn) {
        [conn.path, conn.trail, conn.particle, conn.halo, conn.label].forEach((el) => {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        AppState.removeConnection(conn);
    },

    /**
     * Update all connection positions + labels (called when nodes move)
     */
    updateConnections() {
        const alt = window.CanvasViewport ? CanvasViewport.altitude : 0;
        AppState.connections.forEach((conn) => {
            const fromPos = this.endpointFor(conn.fromPort, alt);
            const toPos = this.endpointFor(conn.toPort, alt);
            const cps = this.controlPointsFor(fromPos, toPos);

            conn.controlPoints = cps;
            conn.path.setAttribute('d', this.pathData(fromPos, toPos, cps));
            this.positionLabel(conn, fromPos, toPos, cps);
        });
    },

    /* ---------- geometry helpers ---------- */

    // Convert viewport (client) coordinates into the SVG layer's own coordinate space, so
    // pathways line up with ports regardless of the navbar offset, canvas panning, or zoom.
    // The SVG layer lives inside the scaled #world, so screen distances shrink by the zoom.
    toSvgPoint(clientX, clientY) {
        const r = AppState.svgLayer.getBoundingClientRect();
        const zoom = window.CanvasViewport ? CanvasViewport.zoom : 1;
        return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom };
    },

    getPortPosition(port) {
        const rect = port.getBoundingClientRect();
        return this.toSvgPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },

    // A connection's endpoint: the port in the workspace, blending toward the card's
    // center as the camera ascends - so constellation lines meet their stars exactly.
    endpointFor(port, alt) {
        const portPos = this.getPortPosition(port);
        if (!alt) return portPos;
        const node = port.parentElement;
        const cx = node.offsetLeft + node.offsetWidth / 2;
        const cy = node.offsetTop + node.offsetHeight / 2;
        return {
            x: portPos.x + (cx - portPos.x) * alt,
            y: portPos.y + (cy - portPos.y) * alt
        };
    },

    controlPointsFor(fromPos, toPos) {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Curves straighten into classic star-map segments as the camera ascends.
        const straighten = window.CanvasViewport ? 1 - CanvasViewport.altitude : 1;
        const curveOffset = Math.min(
            distance * MindfulConfig.connections.curveIntensity,
            MindfulConfig.connections.maxCurveOffset
        ) * straighten;
        return {
            cp1x: fromPos.x + curveOffset,
            cp1y: fromPos.y,
            cp2x: toPos.x - curveOffset,
            cp2y: toPos.y
        };
    },

    pathData(fromPos, toPos, cps) {
        return `M ${fromPos.x} ${fromPos.y} C ${cps.cp1x} ${cps.cp1y}, ${cps.cp2x} ${cps.cp2y}, ${toPos.x} ${toPos.y}`;
    },

    positionLabel(conn, fromPos, toPos, cps) {
        // Point on the cubic bezier at t = 0.5
        const mx = 0.125 * fromPos.x + 0.375 * cps.cp1x + 0.375 * cps.cp2x + 0.125 * toPos.x;
        const my = 0.125 * fromPos.y + 0.375 * cps.cp1y + 0.375 * cps.cp2y + 0.125 * toPos.y;
        conn.label.setAttribute('transform', `translate(${mx} ${my})`);
    },

    pickClosestPorts(fromNode, toNode) {
        const fromPorts = [...fromNode.querySelectorAll('.connection-port')];
        const toPorts = [...toNode.querySelectorAll('.connection-port')];
        let best = null;
        let bestDist = Infinity;
        fromPorts.forEach((fp) => {
            const fpos = this.getPortPosition(fp);
            toPorts.forEach((tp) => {
                const tpos = this.getPortPosition(tp);
                const d = Math.hypot(tpos.x - fpos.x, tpos.y - fpos.y);
                if (d < bestDist) {
                    bestDist = d;
                    best = { fromPort: fp, toPort: tp };
                }
            });
        });
        return best;
    },

    /**
     * Whether a connection already exists between the two ports' Thoughts (either direction)
     */
    connectionExists(fromPort, toPort) {
        const fromThought = fromPort.parentElement;
        const toThought = toPort.parentElement;
        return AppState.connections.some((conn) => {
            const cf = conn.fromPort.parentElement;
            const ct = conn.toPort.parentElement;
            return (cf === fromThought && ct === toThought) || (cf === toThought && ct === fromThought);
        });
    }
};

// Expose globally
window.ConnectionManager = ConnectionManager;

console.log('🔗 Connection Manager module loaded');
