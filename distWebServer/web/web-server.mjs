import { createServer, request } from 'node:http'
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

// 绿色版 Web 静态服务 + /mimo 反向代理（与 index.html 同目录）
const webDir = fileURLToPath(new URL('.', import.meta.url))
const distRoot = join(webDir, '..')
const defaultWorkDir = join(distRoot, 'work').replace(/\\/g, '/')
const workDirRoot = distRoot.replace(/\\/g, '/')
const port = Number(process.env.WEB_PORT ?? 8000)
const mimo = process.env.MIMO_UPSTREAM ?? 'http://127.0.0.1:4096'
const mimoPort = new URL(mimo).port || '4096'

writeFileSync(
  join(webDir, 'mimo-config.js'),
  `window.MIMO_TRACE_CONFIG={baseUrl:'/mimo',username:'mimocode',password:'mimocode-standalone',apiPort:'${mimoPort}',workDir:'${defaultWorkDir.replace(/'/g, "\\'")}',workDirRoot:'${workDirRoot.replace(/'/g, "\\'")}'};\n`,
)

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

function proxy(req, res) {
  const path = req.url.replace(/^\/mimo(?=\/|$)/, '') || '/'
  const headers = { ...req.headers, host: `127.0.0.1:${mimoPort}` }
  const upstream = request(`${mimo}${path}`, { method: req.method, headers }, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers)
    upstreamRes.pipe(res)
  })
  upstream.on('error', () => {
    res.writeHead(502)
    res.end('MiMo API unavailable')
  })
  req.pipe(upstream)
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  const filePath = join(webDir, urlPath === '/' ? 'index.html' : urlPath)
  if (!filePath.startsWith(webDir)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const fallback = join(webDir, 'index.html')
    if (!existsSync(fallback)) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(readFileSync(fallback))
    return
  }
  const type = mime[extname(filePath)] ?? 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  res.end(readFileSync(filePath))
}

createServer((req, res) => {
  if (req.url.startsWith('/mimo/') || req.url === '/mimo') {
    proxy(req, res)
    return
  }
  serveStatic(req, res)
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Web: http://127.0.0.1:${port}/\n`)
})
