// Idempotent seed - the "Big Bang". If there are no Thoughts yet, drop in the two starter
// Thoughts the prototype shipped with so a fresh install isn't an empty void. Safe to run on
// every boot: it no-ops once the user has any Thoughts of their own.

const db = require('../db/connection');
const Thought = require('../models/thought');

function seed() {
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM thoughts').get();
    if (count > 0) return;

    console.log('🌱 Seeding the Big Bang (first Thoughts)...');

    Thought.create({
        title: 'John 3:16',
        category: 'Scripture',
        shortcut: '{{jn3:16}}',
        content: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        x: 300,
        y: 200
    });

    Thought.create({
        title: 'Love Definition',
        category: 'Note',
        shortcut: '{{love-def}}',
        content: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.',
        x: 700,
        y: 350
    });
}

module.exports = seed;
