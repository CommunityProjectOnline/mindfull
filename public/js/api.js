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

const PathwayAPI = {
    // Get all pathways (colored branches) - used to color connections + mark Origins on load
    async getAll() {
        try {
            const response = await fetch(`${API_BASE}/pathways`);
            if (!response.ok) throw new Error('Failed to fetch pathways');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching pathways:', error);
            return [];
        }
    },

    // Get the branch color palette (for the color-override swatches)
    async getPalette() {
        try {
            const response = await fetch(`${API_BASE}/pathways/palette`);
            if (!response.ok) throw new Error('Failed to fetch palette');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching palette:', error);
            return [];
        }
    },

    // Override a pathway's color (and/or name)
    async update(id, fields) {
        try {
            const response = await fetch(`${API_BASE}/pathways/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields)
            });
            if (!response.ok) throw new Error('Failed to update pathway');
            return await response.json();
        } catch (error) {
            console.error('❌ Error updating pathway:', error);
            return null;
        }
    }
};

const MemoryAPI = {
    // All Memories (canvas bubbles + panel)
    async getAll() {
        try {
            const response = await fetch(`${API_BASE}/memories`);
            if (!response.ok) throw new Error('Failed to fetch memories');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching memories:', error);
            return [];
        }
    },

    // Full Memory for the document view (thoughts in order + connections among them)
    async getById(id) {
        try {
            const response = await fetch(`${API_BASE}/memories/${id}`);
            if (!response.ok) throw new Error('Memory not found');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching memory:', error);
            return null;
        }
    },

    // Create a named Memory from a set of Thought ids
    async create({ name, thoughtIds }) {
        try {
            const response = await fetch(`${API_BASE}/memories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, thoughtIds })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to create memory');
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error creating memory:', error);
            return null;
        }
    },

    // Rename a Memory
    async rename(id, name) {
        try {
            const response = await fetch(`${API_BASE}/memories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (!response.ok) throw new Error('Failed to rename memory');
            return await response.json();
        } catch (error) {
            console.error('❌ Error renaming memory:', error);
            return null;
        }
    },

    // Re-lay a Memory out as an organic formation (Origin left, branches fanning right)
    async arrange(id) {
        try {
            const response = await fetch(`${API_BASE}/memories/${id}/arrange`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to arrange memory');
            return await response.json();
        } catch (error) {
            console.error('❌ Error arranging memory:', error);
            return null;
        }
    },

    // Add Thoughts to a Memory (it grows)
    async addThoughts(id, thoughtIds) {
        try {
            const response = await fetch(`${API_BASE}/memories/${id}/thoughts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thoughtIds })
            });
            if (!response.ok) throw new Error('Failed to add thoughts');
            return await response.json();
        } catch (error) {
            console.error('❌ Error adding thoughts to memory:', error);
            return null;
        }
    },

    // Remove one Thought from a Memory
    async removeThought(id, thoughtId) {
        try {
            const response = await fetch(`${API_BASE}/memories/${id}/thoughts/${thoughtId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to remove thought');
            return await response.json();
        } catch (error) {
            console.error('❌ Error removing thought from memory:', error);
            return null;
        }
    },

    // Delete a Memory (its Thoughts stay)
    async delete(id) {
        try {
            const response = await fetch(`${API_BASE}/memories/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete memory');
            return true;
        } catch (error) {
            console.error('❌ Error deleting memory:', error);
            return false;
        }
    }
};

const StardustAPI = {
    // The inbox: waiting items + their import batches
    async getInbox() {
        try {
            const response = await fetch(`${API_BASE}/stardust`);
            if (!response.ok) throw new Error('Failed to fetch stardust');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching stardust:', error);
            return { items: [], batches: [] };
        }
    },

    // Quick capture into the inbox
    async capture(fields) {
        try {
            const response = await fetch(`${API_BASE}/stardust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to capture');
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error capturing stardust:', error);
            return null;
        }
    },

    // Import the JSON produced by the extraction prompt
    async import(payload) {
        const response = await fetch(`${API_BASE}/stardust/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Import failed');
        }
        return await response.json();
    },

    // Place one item onto the canvas
    async place(id, x, y) {
        try {
            const response = await fetch(`${API_BASE}/stardust/${id}/place`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y })
            });
            if (!response.ok) throw new Error('Failed to place');
            return await response.json();
        } catch (error) {
            console.error('❌ Error placing stardust:', error);
            return null;
        }
    },

    // Place a whole batch at once
    async placeAll(batchId, x, y) {
        try {
            const response = await fetch(`${API_BASE}/stardust/batches/${batchId}/place-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y })
            });
            if (!response.ok) throw new Error('Failed to place batch');
            return await response.json();
        } catch (error) {
            console.error('❌ Error placing batch:', error);
            return null;
        }
    },

    // Discard an item
    async discard(id) {
        try {
            const response = await fetch(`${API_BASE}/stardust/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to discard');
            return true;
        } catch (error) {
            console.error('❌ Error discarding stardust:', error);
            return false;
        }
    },

    // The extraction prompt text (for the copy button)
    async getPrompt() {
        try {
            const response = await fetch(`${API_BASE}/stardust/prompt`);
            if (!response.ok) throw new Error('Prompt not found');
            return await response.text();
        } catch (error) {
            console.error('❌ Error fetching prompt:', error);
            return null;
        }
    }
};

const RediscoveryAPI = {
    // Current "connect these?" suggestions
    async getSuggestions() {
        try {
            const response = await fetch(`${API_BASE}/rediscovery`);
            if (!response.ok) throw new Error('Failed to fetch suggestions');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching suggestions:', error);
            return [];
        }
    },

    // "Not related" - the pair never resurfaces
    async dismiss(aId, bId) {
        try {
            const response = await fetch(`${API_BASE}/rediscovery/dismiss`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aId, bId })
            });
            return response.ok || response.status === 204;
        } catch (error) {
            console.error('❌ Error dismissing suggestion:', error);
            return false;
        }
    }
};

const TimelineAPI = {
    // The full event journal, oldest first - the Big Bang replay's source
    async getEvents() {
        try {
            const response = await fetch(`${API_BASE}/timeline`);
            if (!response.ok) throw new Error('Failed to fetch timeline');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching timeline:', error);
            return [];
        }
    }
};

console.log('🔌 API Helper loaded - Ready to communicate with backend');
