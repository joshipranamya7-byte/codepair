# CodePair

Real-time collaborative code editor for mock interviews and pair programming. Share a link, code together with live cursors, and run JavaScript in the browser.

## Features
- Conflict-free concurrent editing using Yjs CRDTs over WebSockets
- Live cursors, selections and presence for every participant
- Room persistence: the document survives server restarts
- Token-bucket rate limiting on the REST API
- Sandboxed JS execution in a Web Worker with a 3s timeout

## Stack
React, Vite, Monaco Editor, Node.js, Express, ws, Yjs

## Run locally
```
npm install
npm run dev
```
Open http://localhost:5173, then share the URL with the room hash.

## Production
```
npm install
npm run build
npm start
```
Serves the client and WebSocket server on one port.

## Design decisions
- CRDT over Operational Transform: no central transform server needed, edits merge deterministically in any order
- Debounced snapshot writes per room to disk: cheap persistence, swap for Redis or MongoDB to scale horizontally
- Web Worker for code execution: isolates user code from the page and can be terminated on timeout

## Known limits and next steps
- Single server instance; scale with Redis pub/sub between nodes
- JavaScript only; add a container-based runner for other languages
- No auth; add JWT and per-room access control
