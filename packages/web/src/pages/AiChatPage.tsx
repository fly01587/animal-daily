import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ApiError, api } from '../api'
import s from './AiChatPage.module.css'

type Role = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: Role
  content: string
  attachments?: string[]
}

interface AiChatPageProps {
  onBack: () => void
}

const STARTER_QUESTIONS = [
  '帮我复盘今天的效率，给 3 条可执行建议',
  '根据我最近记录，帮我安排明天的节奏',
  '我有点拖延，给我一个 20 分钟启动计划',
]
const MAX_ATTACHMENTS = 4
const ACCEPTED_FILE_TYPES = 'image/*,.txt,.md,.json,.csv,.xml,.pdf'

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function AiChatPage({ onBack }: AiChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      content: '我是你的 AI 助手。你可以问我复盘、计划和执行建议。',
    },
  ])
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canSend = useMemo(
    () => (input.trim().length > 0 || selectedFiles.length > 0) && !loading,
    [input, loading, selectedFiles.length]
  )

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, loading, error])

  async function sendMessage(rawMessage: string, files: File[]) {
    const message = rawMessage.trim()
    if ((!message && files.length === 0) || loading) return

    const uploadFiles = files.slice(0, MAX_ATTACHMENTS)
    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: message || '请分析我上传的附件',
      attachments: uploadFiles.map((item) => item.name),
    }
    const assistantId = createId()

    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', content: '' }])
    setInput('')
    setSelectedFiles([])
    setError('')
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const attachmentIds: string[] = []
      for (const file of uploadFiles) {
        const uploaded = await api.uploadAiAttachment(file)
        attachmentIds.push(uploaded.id)
      }

      await api.chatStream(
        message || '请分析我上传的附件，并给出简洁、可执行的建议。',
        attachmentIds,
        {
        signal: controller.signal,
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === assistantId ? { ...item, content: item.content + token } : item
            )
          )
        },
      })

      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId && item.content.trim().length === 0
            ? { ...item, content: '（已完成，但未返回文本）' }
            : item
        )
      )
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('已停止生成')
        return
      }

      const messageText = e instanceof ApiError ? e.message : 'AI 请求失败，请稍后再试'
      setError(messageText)
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId && item.content.trim().length === 0
            ? { ...item, content: `生成失败：${messageText}` }
            : item
        )
      )
    } finally {
      abortRef.current = null
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input, selectedFiles)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        void sendMessage(input, selectedFiles)
      }
    }
  }

  function handlePickFiles() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    setSelectedFiles((prev) => {
      const merged = [...prev]
      for (const file of files) {
        if (merged.length >= MAX_ATTACHMENTS) break
        const duplicated = merged.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        )
        if (!duplicated) merged.push(file)
      }
      return merged
    })

    event.target.value = ''
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack} type="button">←</button>
        <h3>AI 助手</h3>
        <span className={s.status}>{loading ? '生成中...' : '在线'}</span>
      </header>

      <div className={s.chatList} ref={listRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${s.bubbleRow} ${msg.role === 'user' ? s.bubbleRowUser : ''}`}>
            <div className={`${s.bubble} ${msg.role === 'user' ? s.bubbleUser : s.bubbleAssistant}`}>
              {msg.role === 'assistant' ? (
                <div className={s.mdContent}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className={s.tableWrap}>
                          <table className={s.mdTable}>{children}</table>
                        </div>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className={s.msgText}>
                  <div>{msg.content}</div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={s.msgAttachments}>
                      {msg.attachments.map((name) => (
                        <span key={`${msg.id}-${name}`} className={s.msgAttachmentChip}>
                          📎 {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {messages.length <= 1 && (
          <div className={s.starters}>
            {STARTER_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className={s.starterBtn}
                onClick={() => setInput(question)}
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className={s.error}>{error}</p>}

      <form className={s.composer} onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          className={s.fileInput}
          onChange={handleFileChange}
          accept={ACCEPTED_FILE_TYPES}
          multiple
        />
        {selectedFiles.length > 0 && (
          <div className={s.fileList}>
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${file.size}-${file.lastModified}`} className={s.fileItem}>
                <span className={s.fileName}>📎 {file.name}</span>
                <button
                  type="button"
                  className={s.removeFileBtn}
                  onClick={() => handleRemoveFile(index)}
                  disabled={loading}
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          className={s.input}
          placeholder="输入你的问题，回车发送，Shift+Enter 换行"
          rows={2}
        />
        <div className={s.actions}>
          <button
            type="button"
            className={s.attachBtn}
            onClick={handlePickFiles}
            disabled={loading || selectedFiles.length >= MAX_ATTACHMENTS}
          >
            附件
          </button>
          <button
            type="button"
            className={s.stopBtn}
            onClick={handleStop}
            disabled={!loading}
          >
            停止
          </button>
          <button type="submit" className={s.sendBtn} disabled={!canSend}>
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
