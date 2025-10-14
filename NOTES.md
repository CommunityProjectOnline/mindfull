# Mindful - Learning Notes

## What is package.json?

The `package.json` file is like the "ID card" for your project. It tells Node.js and npm everything about your app.

### Line by Line Explanation:

**Line 2: `"name": "mindful"`**
- The name of your project
- Must be lowercase, no spaces
- Used when you publish to npm

**Line 3: `"version": "1.0.0"`**
- Version number of your app
- Format: major.minor.patch
- Start at 1.0.0

**Line 4: `"description"`**
- Short description of what your app does
- Shows up on npm and GitHub

**Line 5: `"main": "src/index.js"`**
- The entry point - where your app starts
- First file that runs when you do `npm start`

**Line 6-9: `"scripts"`**
- Custom commands you can run
- `npm start` runs `node src/index.js` (start the server)
- `npm run dev` runs `nodemon src/index.js` (auto-restart on changes)

**Line 11: `"keywords"`**
- Tags that describe your project
- Helps people find your app

**Line 12: `"author"`**
- Who created this project (you!)

**Line 13: `"license"`**
- How others can use your code
- ISC = open source, anyone can use it

**Line 14-16: `"dependencies"`**
- Code libraries your app NEEDS to run
- Express = web server framework
- These get installed with `npm install`

**Line 18-20: `"devDependencies"`**
- Tools you need while DEVELOPING
- Nodemon = auto-restarts server when you save files
- Not needed in production

---

## Key Concepts:

**npm** = Node Package Manager (installs code libraries)
**dependencies** = Code your app needs to work
**devDependencies** = Tools to help you build the app
**scripts** = Commands you can run with `npm run`

---

## Commands I'll Use:

`npm install` - Install all dependencies
`npm start` - Start the server
`npm run dev` - Start server with auto-reload