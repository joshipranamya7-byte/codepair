export function runJS(code, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const src = `
      const out = [];
      const fmt = (a) => a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' ');
      console.log = (...a) => out.push(fmt(a));
      console.error = (...a) => out.push('Error: ' + fmt(a));
      try { new Function(${JSON.stringify(code)})(); } catch (e) { out.push('Error: ' + e.message); }
      postMessage(out.join('\\n'));
    `
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
    const worker = new Worker(url)
    const done = (text) => { worker.terminate(); URL.revokeObjectURL(url); resolve(text) }
    const timer = setTimeout(() => done('Error: execution timed out'), timeoutMs)
    worker.onmessage = (e) => { clearTimeout(timer); done(e.data || '(no output)') }
    worker.onerror = (e) => { clearTimeout(timer); done('Error: ' + e.message) }
  })
}
