// API Helper - All backend communication goes through here

const API_BASE = 'http://localhost:3000/api';

const ThoughtAPI = {
    // Get all Thoughts
    async getAll() {
        try {
            const response = await fetch(`${API_BASE}/thoughts`);
            if (!response.ok) throw new Error('Failed to fetch thoughts');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching thoughts:', error);
            return [];
        }
    },

    // Get single Thought by ID (includes Go Deeper entries)
    async getById(id) {
        try {
            const response = await fetch(`${API_BASE}/thoughts/${id}`);
            if (!response.ok) throw new Error('Thought not found');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching thought:', error);
            return null;
        }
    },

    // Create new Thought
    async create(thoughtData) {
        try {
            const response = await fetch(`${API_BASE}/thoughts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(thoughtData)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to create thought');
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error creating thought:', error);
            return null;
        }
    },

    // Update existing Thought (also used for position saves while dragging)
    async update(id, updates) {
        try {
            const response = await fetch(`${API_BASE}/thoughts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to update thought');
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error updating thought:', error);
            return null;
        }
    },

    // "Go Deeper" - append an in-depth entry to a Thought
    async addDepth(id, body) {
        try {
            const response = await fetch(`${API_BASE}/thoughts/${id}/depth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body })
            });
            if (!response.ok) throw new Error('Failed to add depth');
            return await response.json();
        } catch (error) {
            console.error('❌ Error adding depth:', error);
            return null;
        }
    },

    // Delete Thought
    async delete(id) {
        try {
            const response = await fetch(`${API_BASE}/thoughts/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete thought');
            return true;
        } catch (error) {
            console.error('❌ Error deleting thought:', error);
            return false;
        }
    }
};

const ConnectionAPI = {
    // Get all connections (to redraw pathways on load)
    async getAll() {
        try {
            const response = await fetch(`${API_BASE}/connections`);
            if (!response.ok) throw new Error('Failed to fetch connections');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching connections:', error);
            return [];
        }
    },

    // Create a typed connection. Returns the saved connection, or null on failure.
    async create({ fromThoughtId, toThoughtId, type }) {
        try {
            const response = await fetch(`${API_BASE}/connections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromThoughtId, toThoughtId, type })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to create connection');
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error creating connection:', error);
            return null;
        }
    },

    // Change a connection's type
    async updateType(id, type) {
        try {
            const response = await fetch(`${API_BASE}/connections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            if (!response.ok) throw new Error('Failed to update connection');
            return await response.json();
        } catch (error) {
            console.error('❌ Error updating connection:', error);
            return null;
        }
    },

    // Delete a connection
    async delete(id) {
        try {
            const response = await fetch(`${API_BASE}/connections/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete connection');
            return true;
        } catch (error) {
            console.error('❌ Error deleting connection:', error);
            return false;
        }
    }
};

console.log('🔌 API Helper loaded - Ready to communicate with backend');
