import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { runJS } from './runner.js'

const COLORS = ['#e06c75', '#61afef', '#98c379', '#e5c07b', '#c678dd', '#56b6c2']
const WS_URL = import.meta.env.VITE_WS_URL || (location.protocol === 'https:' ? 'wss://' : 'ws://') + (import.meta.env.DEV ? 'localhost:1234' : location.host)

async function getRoom() {
  const existing = location.hash.slice(1)
  if (existing) return existing
  const res = await fetch('/api/rooms', { method: 'POST' })
  const { room } = await res.json()
  location.hash = room
  return room
}

export default function App() {
  const [room, setRoom] = useState('')
  const [name] = useState(() => localStorage.getItem('cp-name') || prompt('Your name?') || 'Guest')
  const [peers, setPeers] = useState([])
  const [status, setStatus] = useState('connecting')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const bindingRef = useRef(null)
  const providerRef = useRef(null)
  const editorRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('cp-name', name)
    getRoom().then(setRoom)
  }, [name])

  useEffect(() => () => {
    bindingRef.current?.destroy()
    providerRef.current?.destroy()
  }, [])

  function onMount(editor) {
    editorRef.current = editor
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(WS_URL, room, doc)
    providerRef.current = provider
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    provider.awareness.setLocalStateField('user', { name, color })
    provider.on('status', (e) => setStatus(e.status))

    const style = document.createElement('style')
    document.head.appendChild(style)
    provider.awareness.on('change', () => {
      const states = [...provider.awareness.getStates().entries()]
      setPeers(states.map(([, s]) => s.user).filter(Boolean))
      style.textContent = states
        .map(([id, s]) => s.user && `
          .yRemoteSelection-${id} { background-color: ${s.user.color}33; }
          .yRemoteSelectionHead-${id} { border-left: 2px solid ${s.user.color}; }
          .yRemoteSelectionHead-${id}::after { content: "${s.user.name.replace(/"/g, '')}"; background: ${s.user.color}; color: #111; font-size: 10px; padding: 0 4px; position: absolute; top: -14px; }
        `).join('')
    })

    const ytext = doc.getText('code')
    bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness)
    if (!ytext.length) setTimeout(() => !ytext.length && ytext.insert(0, '// Write code together. Press Run to execute JavaScript.\nconsole.log("hello, CodePair");\n'), 500)
  }

  async function run() {
    setOutput('Running...')
    setOutput(await runJS(editorRef.current.getValue()))
  }

  function copyLink() {
    navigator.clipboard.writeText(location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!room) return <div className="loading">Creating room...</div>

  return (
    <div className="app">
      <header>
        <h1>CodePair</h1>
        <span className={`dot ${status}`} title={status} />
        <div className="peers">{peers.map((p, i) => <span key={i} style={{ background: p.color }}>{p.name}</span>)}</div>
        <button onClick={copyLink}>{copied ? 'Copied' : 'Copy invite link'}</button>
        <button className="run" onClick={run}>Run</button>
      </header>
      <main>
        <Editor key={room} height="100%" defaultLanguage="javascript" theme="vs-dark" onMount={onMount} options={{ fontSize: 14, minimap: { enabled: false }, fontFamily: 'JetBrains Mono, monospace' }} />
        <pre className="output">{output || 'Output appears here'}</pre>
      </main>
    </div>
  )
}
