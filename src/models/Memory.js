// Memory Model - Defines the structure of a Memory

class Memory {
    constructor(title, category, content, shortcut) {
        this.id = Date.now();   // Simple ID timestamp
        this.title = title;
        this.category = category;
        this.content = content;
        this.shortcut = shortcut;
        this.created = new Date().toISOString();
        this.updated = new Date().toISOString();
    }
}

module.exports = Memory;