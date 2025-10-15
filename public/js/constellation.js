// The Constellation - JavaScript for draggable Memory nodes (stars)

// Track dragging state
let isDragging = false;
let currentNode = null;
let offsetX = 0;
let offsetY = 0;

// Connection state
let selectedPort = null;
let connections = []; // Store all connections
let particles = []; // Store all traveling particles

// Drag connection state
let isDraggingConnection = false;
let dragStartPort = null;
let tempConnectionLine = null;

// Get all memory nodes
const memoryNodes = document.querySelectorAll('.memory-node');
const svgLayer = document.getElementById('connectionLayer');

// Add drag functionality to each node
memoryNodes.forEach(node => {
    // Mouse down - start dragging
    node.addEventListener('mousedown', (e) => {
        // Don't drag if clicking on a port
        if (e.target.classList.contains('connection-port')) return;

        isDragging = true;
        currentNode = node;

        // Calculate offset from mouse to node position
        offsetX = e.clientX - node.offsetLeft;
        offsetY = e.clientY - node.offsetTop;

        // Add dragging class for visual feedback
        node.classList.add('dragging');

        // Prevent text selection while dragging
        e.preventDefault();
    });
});

// Mouse move - drag the node and update connections
document.addEventListener('mousemove', (e) => {
    // Dragging a Memory node
    if (isDragging && currentNode) {
        // Calculate new position
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Keep node within viewport bounds
        const maxX = window.innerWidth - currentNode.offsetWidth;
        const maxY = window.innerHeight - currentNode.offsetHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Update node position
        currentNode.style.left = newX + 'px';
        currentNode.style.top = newY + 'px';

        // Update connection lines
        updateConnections();
    }

    // Dragging a connection line
    if (isDraggingConnection && tempConnectionLine && dragStartPort) {
        const startPos = getPortPosition(dragStartPort);
        tempConnectionLine.setAttribute('x1', startPos.x);
        tempConnectionLine.setAttribute('y1', startPos.y);
        tempConnectionLine.setAttribute('x2', e.clientX);
        tempConnectionLine.setAttribute('y2', e.clientY);
    }
});

// Mouse up - stop dragging
document.addEventListener('mouseup', (e) => {
    // Stop dragging Memory node
    if (isDragging && currentNode) {
        currentNode.classList.remove('dragging');
        isDragging = false;
        currentNode = null;
    }

    // Stop dragging connection
    if (isDraggingConnection) {
        // Check if mouse is over a port
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetPort = targetElement?.classList.contains('connection-port') ? targetElement : null;

        // Remove temporary line
        if (tempConnectionLine) {
            svgLayer.removeChild(tempConnectionLine);
            tempConnectionLine = null;
        }

        // Remove active state from start port
        if (dragStartPort) {
            dragStartPort.classList.remove('active');
        }

        // Remove hover state from all ports
        document.querySelectorAll('.connection-port').forEach(port => {
            port.classList.remove('hover-target');
        });

        // If dropped on a valid port, create connection
        if (targetPort && dragStartPort && targetPort !== dragStartPort) {
            // Don't allow connecting to same card
            if (dragStartPort.parentElement === targetPort.parentElement) {
                console.log('⚠️ Cannot connect a Memory to itself!');
            } else {
                const connectionCreated = createConnection(dragStartPort, targetPort);

                // Only play sound if connection was successfully created
                if (connectionCreated && window.MindfulAudio) {
                    window.MindfulAudio.playSound('connect');
                    console.log('✨ Neural Pathway created!');
                }
            }
        } else {
            console.log('❌ Connection cancelled');
        }

        // Reset drag state
        isDraggingConnection = false;
        dragStartPort = null;
    }
});

console.log('✨ Inner Space initialized - Drag your Memories like stars!');

// ===== MISSION CONTROL (TODO TRACKER) =====

// Get elements (safely check if they exist)
const missionBtn = document.getElementById('missionControlBtn');
const missionPanel = document.getElementById('missionControlPanel');
const closeBtn = document.getElementById('closeMissionBtn');

// Toggle panel when button clicked (if elements exist)
if (missionBtn && missionPanel) {
    missionBtn.addEventListener('click', () => {
        missionPanel.classList.toggle('hidden');
    });
}

// Close panel when X clicked
if (closeBtn && missionPanel) {
    closeBtn.addEventListener('click', () => {
        missionPanel.classList.add('hidden');
    });
}

// Close panel when clicking outside
if (missionBtn && missionPanel) {
    document.addEventListener('click', (e) => {
        if (!missionPanel.contains(e.target) && !missionBtn.contains(e.target)) {
            missionPanel.classList.add('hidden');
        }
    });
}

console.log('🚀 Mission Control ready - Click gear icon to see TODOs');

// ===== NEURAL PATHWAYS (CONNECTION SYSTEM WITH PARTICLES) =====

// Helper function to get absolute position of a port
function getPortPosition(port) {
    const rect = port.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

// Helper function to check if connection already exists between two memories
function connectionExists(fromPort, toPort) {
    const fromMemory = fromPort.parentElement;
    const toMemory = toPort.parentElement;

    return connections.some(conn => {
        const connFromMemory = conn.fromPort.parentElement;
        const connToMemory = conn.toPort.parentElement;

        // Check both directions (A->B or B->A)
        return (connFromMemory === fromMemory && connToMemory === toMemory) ||
               (connFromMemory === toMemory && connToMemory === fromMemory);
    });
}

// Helper function to create a connection line
function createConnection(fromPort, toPort) {
    // Check if connection already exists
    if (connectionExists(fromPort, toPort)) {
        console.log('⚠️ Connection already exists between these Memories!');
        return false;
    }

    const fromPos = getPortPosition(fromPort);
    const toPos = getPortPosition(toPort);

    // Create SVG line element (static glow)
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromPos.x);
    line.setAttribute('y1', fromPos.y);
    line.setAttribute('x2', toPos.x);
    line.setAttribute('y2', toPos.y);
    line.setAttribute('class', 'neural-pathway');
    line.setAttribute('stroke', 'rgba(102, 126, 234, 0.3)');
    line.setAttribute('stroke-width', '8');

    svgLayer.appendChild(line);

    // Create trailing light effect (gradient line behind the particle - comet tail)
    const trail = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    trail.setAttribute('stroke-width', '10');
    trail.setAttribute('stroke-linecap', 'round');
    trail.style.pointerEvents = 'none';
    trail.style.filter = 'blur(6px)'; // Strong blur for comet tail effect

    svgLayer.appendChild(trail);

    // Create particle element (traveling pulse - oval/ellipse core)
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    particle.setAttribute('rx', '8'); // Horizontal radius (direction of travel)
    particle.setAttribute('ry', '4'); // Vertical radius (perpendicular)
    particle.setAttribute('fill', 'rgba(255, 255, 255, 1)');
    particle.style.filter = 'drop-shadow(0 0 6px rgba(102, 126, 234, 1))';

    svgLayer.appendChild(particle);

    // Create outer glow halo (separate element - also oval)
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    halo.setAttribute('rx', '16'); // Horizontal radius
    halo.setAttribute('ry', '10'); // Vertical radius
    halo.setAttribute('fill', 'rgba(102, 126, 234, 0.3)');
    halo.style.filter = 'blur(8px)';

    svgLayer.appendChild(halo);

    // Store connection data
    const connectionData = {
        line: line,
        trail: trail,
        particle: particle,
        halo: halo,
        fromPort: fromPort,
        toPort: toPort,
        progress: 0, // 0 to 1, particle position along line
        speed: 0.0015, // How fast particle moves (sped up a bit)
        pulsePhase: 0, // For pulsing glow effect
        haloPhase: 0 // Separate phase for halo pulse
    };

    connections.push(connectionData);

    console.log(`⚡ Neural Pathway created: ${fromPort.parentElement.id} → ${toPort.parentElement.id}`);
    return true;
}

// Helper function to update all connection positions
function updateConnections() {
    connections.forEach(conn => {
        const fromPos = getPortPosition(conn.fromPort);
        const toPos = getPortPosition(conn.toPort);

        // Update line position
        conn.line.setAttribute('x1', fromPos.x);
        conn.line.setAttribute('y1', fromPos.y);
        conn.line.setAttribute('x2', toPos.x);
        conn.line.setAttribute('y2', toPos.y);

        // Update particle position along the line
        const particleX = fromPos.x + (toPos.x - fromPos.x) * conn.progress;
        const particleY = fromPos.y + (toPos.y - fromPos.y) * conn.progress;

        conn.particle.setAttribute('cx', particleX);
        conn.particle.setAttribute('cy', particleY);
    });
}

// Animation loop for particles
function animateParticles() {
    connections.forEach(conn => {
        // Move particle forward
        conn.progress += conn.speed;

        // Reset to start when reaching end
        if (conn.progress >= 1) {
            conn.progress = 0;
        }

        // Increment pulse phases (different speeds for particle and halo)
        conn.pulsePhase += 0.03; // Slower pulse for particle (was 0.05)
        conn.haloPhase += 0.05; // Faster pulse for halo

        // Update particle position
        const fromPos = getPortPosition(conn.fromPort);
        const toPos = getPortPosition(conn.toPort);

        const particleX = fromPos.x + (toPos.x - fromPos.x) * conn.progress;
        const particleY = fromPos.y + (toPos.y - fromPos.y) * conn.progress;

        // Calculate angle of travel for rotation
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees

        // Calculate trail start position (behind the particle)
        // Trail extends a fixed distance behind the orb
        const pathLength = Math.sqrt(dx * dx + dy * dy);
        const trailPixelLength = 20; // 20 pixel long comet tail
        const trailLengthRatio = trailPixelLength / pathLength; // Convert to progress ratio

        const trailProgress = Math.max(0, conn.progress - trailLengthRatio);
        const trailStartX = fromPos.x + (toPos.x - fromPos.x) * trailProgress;
        const trailStartY = fromPos.y + (toPos.y - fromPos.y) * trailProgress;

        // Draw trailing light from behind particle to particle position
        conn.trail.setAttribute('x1', trailStartX);
        conn.trail.setAttribute('y1', trailStartY);
        conn.trail.setAttribute('x2', particleX);
        conn.trail.setAttribute('y2', particleY);

        // Gradient effect on trail (bright at particle, fading behind)
        const trailBrightness = Math.sin(conn.pulsePhase) * 0.3 + 0.8; // 0.8 to 1.1 (brighter)
        conn.trail.setAttribute('stroke', `rgba(102, 126, 234, ${trailBrightness})`);

        // Position and rotate particle
        conn.particle.setAttribute('cx', particleX);
        conn.particle.setAttribute('cy', particleY);
        conn.particle.setAttribute('transform', `rotate(${angle} ${particleX} ${particleY})`);

        // Position and rotate halo
        conn.halo.setAttribute('cx', particleX);
        conn.halo.setAttribute('cy', particleY);
        conn.halo.setAttribute('transform', `rotate(${angle} ${particleX} ${particleY})`);

        // Particle pulsing effect (size and brightness) - SLOWER
        const pulseIntensity = Math.sin(conn.pulsePhase) * 0.5 + 0.5; // 0 to 1
        const baseRx = 8;
        const maxRx = 12;
        const baseRy = 4;
        const maxRy = 6;
        const currentRx = baseRx + (maxRx - baseRx) * pulseIntensity;
        const currentRy = baseRy + (maxRy - baseRy) * pulseIntensity;

        conn.particle.setAttribute('rx', currentRx);
        conn.particle.setAttribute('ry', currentRy);

        // Pulsing color brightness for particle
        const minBrightness = 0.6;
        const brightness = minBrightness + (1 - minBrightness) * pulseIntensity;
        const coreColor = `rgba(255, 255, 255, ${brightness})`;
        const glowColor = `rgba(102, 126, 234, ${brightness})`;

        conn.particle.setAttribute('fill', coreColor);
        conn.particle.style.filter = `drop-shadow(0 0 ${8 + pulseIntensity * 8}px ${glowColor})`;

        // Halo pulsing effect (different interval) - FASTER
        const haloIntensity = Math.sin(conn.haloPhase) * 0.5 + 0.5; // 0 to 1
        const haloBaseRx = 16;
        const haloMaxRx = 24;
        const haloBaseRy = 10;
        const haloMaxRy = 14;
        const currentHaloRx = haloBaseRx + (haloMaxRx - haloBaseRx) * haloIntensity;
        const currentHaloRy = haloBaseRy + (haloMaxRy - haloBaseRy) * haloIntensity;

        conn.halo.setAttribute('rx', currentHaloRx);
        conn.halo.setAttribute('ry', currentHaloRy);

        // Halo opacity fades in and out independently
        const haloMinOpacity = 0.1;
        const haloMaxOpacity = 0.4;
        const haloOpacity = haloMinOpacity + (haloMaxOpacity - haloMinOpacity) * haloIntensity;

        // Fade particle at start and end of journey
        const fadeDistance = 0.15; // Fade in first 15% and last 15%
        let travelOpacity = 1;

        if (conn.progress < fadeDistance) {
            travelOpacity = conn.progress / fadeDistance;
        } else if (conn.progress > 1 - fadeDistance) {
            travelOpacity = (1 - conn.progress) / fadeDistance;
        }

        // Apply fade to both particle and halo
        conn.particle.setAttribute('opacity', travelOpacity * brightness);
        conn.halo.setAttribute('opacity', travelOpacity * haloOpacity);
    });

    requestAnimationFrame(animateParticles);
}

// Start animation loop
animateParticles();

// Add drag-and-drop handlers to connection ports
document.querySelectorAll('.connection-port').forEach(port => {
    // Start dragging connection from port
    port.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // Don't trigger card drag
        e.preventDefault();

        isDraggingConnection = true;
        dragStartPort = port;
        port.classList.add('active');

        // Create temporary connection line
        const startPos = getPortPosition(port);
        tempConnectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempConnectionLine.setAttribute('x1', startPos.x);
        tempConnectionLine.setAttribute('y1', startPos.y);
        tempConnectionLine.setAttribute('x2', e.clientX);
        tempConnectionLine.setAttribute('y2', e.clientY);
        tempConnectionLine.setAttribute('stroke', 'rgba(102, 126, 234, 0.5)');
        tempConnectionLine.setAttribute('stroke-width', '4');
        tempConnectionLine.setAttribute('stroke-dasharray', '6,6');
        tempConnectionLine.style.pointerEvents = 'none';
        svgLayer.appendChild(tempConnectionLine);

        console.log(`⭐ Dragging connection from ${port.parentElement.id}`);
    });

    // Visual feedback on hover
    port.addEventListener('mouseenter', () => {
        port.style.opacity = '1';

        // Highlight port if we're dragging a connection
        if (isDraggingConnection && dragStartPort !== port) {
            port.classList.add('hover-target');
        }
    });

    port.addEventListener('mouseleave', () => {
        port.classList.remove('hover-target');
    });
});

console.log('🧠 Neural Pathways activated - Hover over Memory cards to see connection ports!');

// ===== SIDEBAR NAVIGATION =====

// Handle navigation item clicks
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

        if (itemId === 'navMissionControl') {
            // Show mission control panel (we'll implement this later)
            console.log('🚀 Mission Control clicked');
        } else if (itemId === 'navNewMemory') {
            console.log('➕ New Memory clicked');
        } else if (itemId === 'navTimeline') {
            console.log('🕐 Timeline clicked');
        } else if (itemId === 'navConstellations') {
            console.log('⭐ Constellations clicked');
        } else if (itemId === 'navForgotten') {
            console.log('💭 Forgotten Memories clicked');
        } else if (itemId === 'navInnerSpace') {
            console.log('🌌 Inner Space clicked');
        }
    });
});

console.log('📋 Sidebar navigation ready - Click hamburger icon to toggle!');

// ===== ASTRONAUT MASCOT INTERACTIONS =====

const astronaut = document.getElementById('astronaut');

// Astronaut floats to a Memory card (smooth space travel)
function jumpToMemory(memoryNode) {
    const rect = memoryNode.getBoundingClientRect();

    // Position astronaut near the Memory card (bottom-right of card)
    const targetX = rect.right - 60;
    const targetY = rect.bottom - 70;

    astronaut.classList.add('moving');
    astronaut.classList.remove('at-memory');

    // Use requestAnimationFrame to ensure the transition is applied
    requestAnimationFrame(() => {
        astronaut.style.bottom = 'auto';
        astronaut.style.right = 'auto';
        astronaut.style.left = targetX + 'px';
        astronaut.style.top = targetY + 'px';
    });

    // Floating animation completes after movement
    setTimeout(() => {
        astronaut.classList.remove('moving');
        astronaut.classList.add('at-memory');
    }, 3000); // Match the 3s CSS transition

    console.log('🚀 Astronaut floating to Memory:', memoryNode.id);
}

// Astronaut returns home (bottom-right corner)
function returnHome() {
    astronaut.classList.add('moving');
    astronaut.classList.remove('at-memory');

    astronaut.style.bottom = '30px';
    astronaut.style.right = '30px';
    astronaut.style.left = 'auto';
    astronaut.style.top = 'auto';

    setTimeout(() => {
        astronaut.classList.remove('moving');
    }, 3000); // Match the 3s CSS transition

    console.log('🚀 Astronaut returned home');
}

// Astronaut thinking pose
function startThinking() {
    astronaut.classList.add('thinking');
    console.log('🤔 Astronaut is thinking...');
}

function stopThinking() {
    astronaut.classList.remove('thinking');
}

// Astronaut celebrates
function celebrate() {
    astronaut.classList.add('celebrating');
    setTimeout(() => {
        astronaut.classList.remove('celebrating');
    }, 600);
    console.log('🎉 Astronaut is celebrating!');
}

// Astronaut waves
function wave() {
    astronaut.classList.add('waving');
    setTimeout(() => {
        astronaut.classList.remove('waving');
    }, 1000);
    console.log('👋 Astronaut is waving!');
}

// Hook up Memory card clicks to make astronaut jump
memoryNodes.forEach(node => {
    node.addEventListener('click', (e) => {
        // Don't jump if we're connecting ports
        if (e.target.classList.contains('connection-port')) return;
        if (isDragging) return;

        jumpToMemory(node);
    });
});

// Wave when page loads
setTimeout(() => {
    wave();
}, 1000);

console.log('🧑‍🚀 Astronaut mascot ready - Click on Memory cards to see him jump!');
