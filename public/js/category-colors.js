/**
 * Category Colors
 * One color per Thought category, used everywhere color carries meaning:
 * the card's edge stripe and chip, and the star it becomes at the
 * Constellation altitude. Read the sky by color.
 *
 * Categories not in the map (Etymology, Claim, custom ones from AI imports...)
 * get a stable color derived from their name, so the same category is always
 * the same color without any bookkeeping.
 */

const CategoryColors = {
    map: {
        'Scripture': '#e3b341', // amber - light on the page
        'Note':      '#58a6ff', // blue
        'Prayer':    '#bc8cff', // violet
        'Quote':     '#39c5cf', // cyan
        'Idea':      '#a3e635', // lime
        'Goal':      '#f778ba', // pink
        'Recipe':    '#f0883e', // orange
        'Question':  '#56d364'  // green
    },

    colorFor(category) {
        const c = String(category || '').trim();
        if (this.map[c]) return this.map[c];
        // Stable fallback: hash the name into a hue, keep saturation/lightness sky-friendly.
        let h = 0;
        for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0;
        return `hsl(${h % 360}, 62%, 66%)`;
    }
};

window.CategoryColors = CategoryColors;

console.log('🎨 Category Colors loaded');
