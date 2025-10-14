// The Constellation - JavaScript for draggable Memory nodes (stars)

// Track dragging state
let isDragging = false;
let currentNode = null;
let offsetX = 0;
let offsetY = 0;

// Get all memory nodes
const memoryNodes = document.querySelectorAll('.memory-node');

// Add drag functionality to each node
memoryNodes.forEach(node => {
    // Mouse down - start dragging
    node.addEventListener('mousedown', (e) => {
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

// Mouse move - drag the node
document.addEventListener('mousemove', (e) => {
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
    }
});

// Mouse up - stop dragging
document.addEventListener('mouseup', () => {
    if (isDragging && currentNode) {
        currentNode.classList.remove('dragging');
        isDragging = false;
        currentNode = null;
    }
});

console.log('✨ Inner Space initialized - Drag your Memories like stars!');

// ===== MISSION CONTROL (TODO TRACKER) =====

// Get elements
const missionBtn = document.getElementById('missionControlBtn');
const missionPanel = document.getElementById('missionControlPanel');
const closeBtn = document.getElementById('closeMissionBtn');

// Toggle panel when button clicked
missionBtn.addEventListener('click', () => {
    missionPanel.classList.toggle('hidden');
});

// Close panel when X clicked
closeBtn.addEventListener('click', () => {
    missionPanel.classList.add('hidden');
});

// Close panel when clicking outside
document.addEventListener('click', (e) => {
    if (!missionPanel.contains(e.target) && !missionBtn.contains(e.target)) {
        missionPanel.classList.add('hidden');
    }
});

console.log('🚀 Mission Control ready - Click gear icon to see TODOs');
