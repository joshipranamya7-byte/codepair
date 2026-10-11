import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { nanoid } from 'nanoid'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import utils from 'y-websocket/bin/utils'

const { setupWSConnection, setPersistence } = utils
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const PORT = process.env.PORT || 1234
fs.mkdirSync(DATA_DIR, { recursive: true })

const roomFile = (name) => path.join(DATA_DIR, name.replace(/[^\w-]/g, '') + '.bin')

setPersistence({
  bindState: async (name, doc) => {
    const file = roomFile(name)
    if (fs.existsSync(file)) Y.applyUpdate(doc, fs.readFileSync(file))
    let timer
    doc.on('update', () => {
      clearTimeout(timer)
      timer = setTimeout(() => fs.writeFile(file, Y.encodeStateAsUpdate(doc), () => {}), 1000)
    })
  },
  writeState: async (name, doc) => {
    fs.writeFileSync(roomFile(name), Y.encodeStateAsUpdate(doc))
  }
})

const app = express()
app.use(express.json())

const buckets = new Map()
app.use('/api', (req, res, next) => {
  const now = Date.now()
  const b = buckets.get(req.ip) || { tokens: 20, last: now }
  b.tokens = Math.min(20, b.tokens + ((now - b.last) / 1000) * 2)
  b.last = now
  if (b.tokens < 1) return res.status(429).json({ error: 'rate limited' })
  b.tokens -= 1
  buckets.set(req.ip, b)
  next()
})

app.post('/api/rooms', (req, res) => res.json({ room: nanoid(8) }))
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }))

const dist = path.join(__dirname, '../client/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })
wss.on('connection', (conn, req) => setupWSConnection(conn, req, { gc: true }))
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})
server.listen(PORT, () => console.log(`CodePair on :${PORT}`))
