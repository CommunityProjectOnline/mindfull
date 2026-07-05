// Rediscovery - MindFull introduces your Thoughts to each other.
//
// Finds pairs of UNCONNECTED Thoughts that probably belong together and proposes them:
//   - shared meta-words (tags) - the vision's original driver
//   - similar wording          - TF-IDF cosine over title + content (local, no AI service)
//   - months apart             - a small bonus for bridging old thinking to new
//
// Everything is computed on demand from SQLite; the corpus is personal-sized, so this
// stays fast without any index maintenance. When real embeddings arrive (sqlite-vec +
// an embedding model), they slot in as a better "similar wording" signal behind the
// same API shape - the frontend never has to know.

const db = require('../db/connection');
const Thought = require('./thought');

const now = () => new Date().toISOString();

const STOPWORDS = new Set((
    'the a an and or of to in for with on at by is are was were be been being it its this that these ' +
    'those from as not no but if then than so such very can will would should could do does did done ' +
    'have has had he she they them his her their we you your our out up down over under again more ' +
    'most all any each into also there here when where which who whom what how why unto thee thou thy shall'
).split(' '));

const stmts = {
    connectionPairs: db.prepare('SELECT from_thought_id AS a, to_thought_id AS b FROM connections'),
    dismissedPairs: db.prepare('SELECT a_id AS a, b_id AS b FROM dismissed_suggestions'),
    dismiss: db.prepare(
        'INSERT OR IGNORE INTO dismissed_suggestions (a_id, b_id, dismissed) VALUES (@a, @b, @dismissed)'
    )
};

const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .split(/[^a-z0-9']+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// TF-IDF vectors, L2-normalized, so cosine similarity is a plain dot product.
function buildVectors(docs) {
    const df = new Map();
    docs.forEach((doc) => new Set(doc.tokens).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
    const N = docs.length;

    docs.forEach((doc) => {
        const tf = new Map();
        doc.tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
        const vec = new Map();
        let norm = 0;
        tf.forEach((count, term) => {
            const idf = Math.log(1 + N / df.get(term));
            const w = (count / doc.tokens.length) * idf;
            vec.set(term, w);
            norm += w * w;
        });
        norm = Math.sqrt(norm) || 1;
        vec.forEach((w, term) => vec.set(term, w / norm));
        doc.vector = vec;
    });
    return df;
}

function cosine(a, b) {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let dot = 0;
    small.forEach((w, term) => {
        const w2 = large.get(term);
        if (w2) dot += w * w2;
    });
    return dot;
}

const Rediscovery = {
    /**
     * The current suggestions: unconnected, undismissed pairs, scored and explained.
     */
    suggestions(limit = 15) {
        const thoughts = Thought.all();
        if (thoughts.length < 2) return [];

        const excluded = new Set();
        stmts.connectionPairs.all().forEach((p) => excluded.add(pairKey(p.a, p.b)));
        stmts.dismissedPairs.all().forEach((p) => excluded.add(pairKey(p.a, p.b)));

        const docs = new Map(thoughts.map((t) => [t.id, {
            thought: t,
            tokens: tokenize(t.title + ' ' + t.content),
            tags: new Set((t.tags || []).map((tag) => tag.toLowerCase()))
        }]));
        const df = buildVectors([...docs.values()]);

        // Candidate pairs come from shared postings (tags always; terms unless ubiquitous),
        // so we never brute-force every possible pair.
        const postings = new Map(); // token/tag -> [ids]
        const addPosting = (key, id) => {
            let arr = postings.get(key);
            if (!arr) { arr = []; postings.set(key, arr); }
            arr.push(id);
        };
        const maxDf = Math.max(2, Math.floor(thoughts.length * 0.5));
        docs.forEach((doc, id) => {
            new Set(doc.tokens).forEach((t) => {
                if (df.get(t) <= maxDf) addPosting('w:' + t, id);
            });
            doc.tags.forEach((t) => addPosting('t:' + t, id));
        });

        const candidates = new Set();
        postings.forEach((ids) => {
            if (ids.length > 50) return; // a term this common says nothing about a pair
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    const k = pairKey(ids[i], ids[j]);
                    if (!excluded.has(k)) candidates.add(k);
                }
            }
        });

        const results = [];
        candidates.forEach((k) => {
            const [aId, bId] = k.split(':').map(Number);
            const A = docs.get(aId);
            const B = docs.get(bId);
            if (!A || !B) return;

            const sharedTags = [...A.tags].filter((t) => B.tags.has(t));
            const sim = cosine(A.vector, B.vector);
            const daysApart = Math.abs(new Date(A.thought.created) - new Date(B.thought.created)) / 86400000;

            const tagScore = 0.4 * Math.min(1, sharedTags.length / 2);
            const simScore = 0.4 * Math.min(1, sim * 1.6);
            const gapScore = (tagScore || simScore > 0.15 ? 0.2 * Math.min(1, daysApart / 180) : 0);
            const score = tagScore + simScore + gapScore;
            if (score < 0.3) return;

            const reasons = [];
            if (sharedTags.length) reasons.push(`${sharedTags.length} shared meta-word${sharedTags.length > 1 ? 's' : ''}`);
            if (sim > 0.18) reasons.push('similar wording');
            if (daysApart > 60) reasons.push(`${Math.round(daysApart / 30)} months apart`);

            const brief = (t) => ({ id: t.id, title: t.title, category: t.category, created: t.created });
            results.push({ a: brief(A.thought), b: brief(B.thought), sharedTags, score: Number(score.toFixed(3)), reasons });
        });

        results.sort((x, y) => y.score - x.score);
        return results.slice(0, limit);
    },

    count() {
        return this.suggestions().length;
    },

    // "Not related" - never show this pair again.
    dismiss(aId, bId) {
        const a = Math.min(Number(aId), Number(bId));
        const b = Math.max(Number(aId), Number(bId));
        if (!a || !b || a === b) throw new Error('Two different thought ids are required');
        stmts.dismiss.run({ a, b, dismissed: now() });
        return true;
    }
};

module.exports = Rediscovery;
