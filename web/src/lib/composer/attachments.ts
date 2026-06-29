export interface MessageAttachment {
  id: string
  filename: string
  mime: string
  url: string
}

export const MAX_ATTACHMENTS = 8
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  js: 'text/javascript',
  ts: 'text/typescript',
  css: 'text/css',
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function inferMime(filename: string, fallback = 'application/octet-stream') {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return fallback
  return EXT_MIME[ext] ?? fallback
}

export function attachmentKind(mime: string) {
  if (mime.startsWith('image/')) return 'image' as const
  if (mime === 'application/pdf') return 'pdf' as const
  if (mime.startsWith('text/') || mime === 'application/json') return 'text' as const
  return 'file' as const
}

export function mimeBadge(mime: string) {
  if (mime.startsWith('image/')) return 'img'
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'text/plain') return 'txt'
  if (mime === 'text/markdown') return 'md'
  if (mime === 'application/json') return 'json'
  const short = mime.split('/').pop()
  return short && short.length <= 8 ? short : 'file'
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function defaultPromptForAttachments(attachments: MessageAttachment[]) {
  if (attachments.length === 1) {
    const kind = attachmentKind(attachments[0].mime)
    if (kind === 'image') return '请分析这张图片'
    if (kind === 'pdf') return '请分析这个 PDF'
    return `请分析附件「${attachments[0].filename}」`
  }
  return '请分析这些附件'
}

export function resolveMessageAttachments(msg: {
  attachments?: MessageAttachment[]
  images?: string[]
}): MessageAttachment[] {
  if (msg.attachments?.length) return msg.attachments
  return (msg.images ?? []).map((url, i) => ({
    id: `legacy-${i}`,
    filename: `image-${i + 1}.png`,
    mime: url.match(/^data:([^;]+);/)?.[1] ?? 'image/png',
    url,
  }))
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result
      if (typeof url === 'string') resolve(url)
      else reject(new Error('读取文件失败'))
    }
    reader.onerror = () => reject(new Error(`无法读取「${file.name}」`))
    reader.readAsDataURL(file)
  })
}

export async function fileToAttachment(file: File): Promise<MessageAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`「${file.name}」过大（${formatBytes(file.size)}），单文件上限 ${formatBytes(MAX_ATTACHMENT_BYTES)}`)
  }
  const url = await readFileAsDataUrl(file)
  return {
    id: genId(),
    filename: file.name,
    mime: file.type || inferMime(file.name),
    url,
  }
}

export async function filesToAttachments(files: File[], currentCount: number) {
  const room = MAX_ATTACHMENTS - currentCount
  if (room <= 0) throw new Error(`最多添加 ${MAX_ATTACHMENTS} 个附件`)
  const picked = files.slice(0, room)
  if (files.length > room) {
    throw new Error(`最多 ${MAX_ATTACHMENTS} 个附件，已忽略多余 ${files.length - room} 个`)
  }
  return Promise.all(picked.map(fileToAttachment))
}
