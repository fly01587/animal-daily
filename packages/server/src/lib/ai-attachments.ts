import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { randomUUID } from 'node:crypto'
import { AppError } from '../middleware/error.js'

type AttachmentKind = 'image' | 'text' | 'pdf'

interface StoredAttachmentMeta {
  id: string
  userId: string
  name: string
  mimeType: string
  kind: AttachmentKind
  size: number
  createdAt: string
  blobPath: string
}

export interface UploadedAttachment {
  id: string
  name: string
  mimeType: string
  kind: AttachmentKind
  size: number
  createdAt: string
}

export interface AttachmentPayload extends StoredAttachmentMeta {
  bytes: Uint8Array
}

const ROOT_DIR =
  process.env.AI_ATTACHMENT_DIR?.trim() || path.join(process.cwd(), '.data', 'ai-attachments')
const META_SUFFIX = '.meta.json'
const BLOB_SUFFIX = '.bin'
const ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_TEXT_SIZE = 2 * 1024 * 1024
const MAX_PDF_SIZE = 15 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_MESSAGE = 4

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'application/xml',
  'text/xml',
])

const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
}

function sanitizeName(name: string): string {
  const base = path.basename(name || 'attachment')
  return base.replace(/[^\w.\-()\u4e00-\u9fa5 ]+/g, '_').slice(0, 120) || 'attachment'
}

function normalizeMimeType(name: string, mimeType: string): string {
  const normalized = (mimeType || '').trim().toLowerCase()
  if (normalized) return normalized
  const ext = path.extname(name).toLowerCase()
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream'
}

function classifyAttachment(mimeType: string): AttachmentKind | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) return 'image'
  if (TEXT_MIME_TYPES.has(mimeType)) return 'text'
  if (mimeType === 'application/pdf') return 'pdf'
  return null
}

function assertAttachmentLimit(size: number, kind: AttachmentKind) {
  if (kind === 'image' && size > MAX_IMAGE_SIZE) {
    throw new AppError(40101, '图片大小不能超过 8MB', 400)
  }
  if (kind === 'text' && size > MAX_TEXT_SIZE) {
    throw new AppError(40101, '文本文件大小不能超过 2MB', 400)
  }
  if (kind === 'pdf' && size > MAX_PDF_SIZE) {
    throw new AppError(40101, 'PDF 大小不能超过 15MB', 400)
  }
}

async function ensureRootDir() {
  await mkdir(ROOT_DIR, { recursive: true })
}

async function writeAttachmentMeta(meta: StoredAttachmentMeta) {
  const metaPath = path.join(ROOT_DIR, `${meta.id}${META_SUFFIX}`)
  await writeFile(metaPath, JSON.stringify(meta), 'utf8')
}

async function readAttachmentMeta(attachmentId: string): Promise<StoredAttachmentMeta> {
  const metaPath = path.join(ROOT_DIR, `${attachmentId}${META_SUFFIX}`)
  try {
    const content = await readFile(metaPath, 'utf8')
    return JSON.parse(content) as StoredAttachmentMeta
  } catch {
    throw new AppError(40401, '附件不存在或已过期，请重新上传', 404)
  }
}

function isExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return true
  return Date.now() - created > ATTACHMENT_TTL_MS
}

export async function storeAttachment(input: {
  userId: string
  fileName: string
  mimeType: string
  bytes: Uint8Array
}): Promise<UploadedAttachment> {
  const name = sanitizeName(input.fileName)
  const mimeType = normalizeMimeType(name, input.mimeType)
  const kind = classifyAttachment(mimeType)
  if (!kind) {
    throw new AppError(40101, '仅支持图片 / TXT / Markdown / JSON / CSV / XML / PDF 附件', 400)
  }

  assertAttachmentLimit(input.bytes.byteLength, kind)

  await ensureRootDir()

  const id = randomUUID()
  const blobPath = path.join(ROOT_DIR, `${id}${BLOB_SUFFIX}`)
  await writeFile(blobPath, Buffer.from(input.bytes))

  const createdAt = new Date().toISOString()
  const meta: StoredAttachmentMeta = {
    id,
    userId: input.userId,
    name,
    mimeType,
    kind,
    size: input.bytes.byteLength,
    createdAt,
    blobPath,
  }
  await writeAttachmentMeta(meta)

  return {
    id,
    name,
    mimeType,
    kind,
    size: meta.size,
    createdAt,
  }
}

export async function loadAttachmentsForUser(
  userId: string,
  attachmentIds: string[]
): Promise<AttachmentPayload[]> {
  const uniqIds = Array.from(new Set(attachmentIds))
  if (uniqIds.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new AppError(40101, `单次最多上传 ${MAX_ATTACHMENTS_PER_MESSAGE} 个附件`, 400)
  }

  const result: AttachmentPayload[] = []
  for (const attachmentId of uniqIds) {
    const meta = await readAttachmentMeta(attachmentId)

    if (meta.userId !== userId) {
      throw new AppError(40003, '无权访问该附件', 403)
    }
    if (isExpired(meta.createdAt)) {
      throw new AppError(40401, '附件已过期，请重新上传', 404)
    }

    const bytes = await readFile(meta.blobPath)
    result.push({ ...meta, bytes: new Uint8Array(bytes) })
  }

  return result
}

function decodePdfEscapedText(raw: string): string {
  return raw
    .replace(/\\([nrtbf\\()])/g, (_full, ch: string) => {
      if (ch === 'n') return '\n'
      if (ch === 'r') return '\r'
      if (ch === 't') return '\t'
      if (ch === 'b') return '\b'
      if (ch === 'f') return '\f'
      return ch
    })
    .replace(/\\([0-7]{1,3})/g, (_full, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8))
    )
    .replace(/\\\r?\n/g, '')
}

function extractParenthesizedText(source: string): string[] {
  const values: string[] = []
  const regex = /\((?:\\.|[^\\()]){2,}\)/g
  let matched = regex.exec(source)
  while (matched) {
    const value = matched[0].slice(1, -1)
    const decoded = decodePdfEscapedText(value)
      .replace(/[^\S\r\n]+/g, ' ')
      .trim()
    if (decoded.length >= 2) values.push(decoded)
    matched = regex.exec(source)
  }
  return values
}

function extractPdfText(buffer: Uint8Array): string {
  const raw = Buffer.from(buffer).toString('latin1')
  const collected: string[] = []

  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g
  let streamMatch = streamRegex.exec(raw)
  while (streamMatch) {
    const rawStream = streamMatch[1]
    if (rawStream) {
      const binary = Buffer.from(rawStream, 'latin1')
      const variants: string[] = [binary.toString('latin1')]
      try {
        variants.push(zlib.inflateSync(binary).toString('latin1'))
      } catch {
        // ignore non-deflate streams
      }
      for (const item of variants) {
        collected.push(...extractParenthesizedText(item))
      }
    }
    streamMatch = streamRegex.exec(raw)
  }

  if (collected.length === 0) {
    collected.push(...extractParenthesizedText(raw))
  }

  const unique = Array.from(new Set(collected))
  const combined = unique.join('\n')
  return combined.replace(/\n{3,}/g, '\n\n').trim()
}

export function extractAttachmentText(attachment: AttachmentPayload): string {
  if (attachment.kind === 'text') {
    return Buffer.from(attachment.bytes).toString('utf8').trim()
  }
  if (attachment.kind === 'pdf') {
    return extractPdfText(attachment.bytes).trim()
  }
  return ''
}

