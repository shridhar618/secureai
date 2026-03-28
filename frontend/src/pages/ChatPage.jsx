import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import {
  Send, Trash2, Bot, User, Lock, ShieldAlert,
  ShieldCheck, Shield, Cpu, AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'

const STATUS_CONFIG = {
  allowed: { icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10', label: 'Allowed' },
  filtered: { icon: Shield, color: 'text-warn', bg: 'bg-warn/10', label: 'Filtered' },
  blocked: { icon: Lock, color: 'text-danger', bg: 'bg-danger/10', label: 'Blocked' },
}

const ROLE_INFO = {
  intern: { color: 'text-accent', label: 'INTERN', desc: 'Sensitive data is blocked' },
  hr: { color: 'text-warn', label: 'HR', desc: 'PII data is masked' },
  admin: { color: 'text-purple-400', label: 'ADMIN', desc: 'Full access granted' },
}

const SUGGESTIONS = [
  'What is our company leave policy?',
  'Explain the onboarding process',
  'What are our security protocols?',
  'How does the performance review work?',
]

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-end gap-3 mb-4"
    >
      <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-accent" />
      </div>
      <div className="glass-light rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  const statusCfg = msg.status ? STATUS_CONFIG[msg.status] : null
  const StatusIcon = statusCfg?.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex items-end gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-accent/20 border border-accent/30'
          : 'bg-bg-600 border border-white/8'
      }`}>
        {isUser
          ? <User size={13} className="text-accent" />
          : <Bot size={13} className="text-slate-400" />}
      </div>

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-accent text-bg-900 font-medium rounded-br-sm'
            : msg.status === 'blocked'
              ? 'bg-danger/10 border border-danger/20 text-danger rounded-bl-sm'
              : 'glass-light text-slate-200 rounded-bl-sm'
        }`}>
          {msg.content}
        </div>

        {/* Metadata row */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-600 font-mono">
            {format(new Date(msg.timestamp), 'HH:mm')}
          </span>

          {statusCfg && !isUser && (
            <span className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color}`}>
              <StatusIcon size={9} />
              {statusCfg.label}
            </span>
          )}

          {msg.risk_score > 0.3 && !isUser && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-warn/10 text-warn">
              <AlertTriangle size={9} />
              Risk {(msg.risk_score * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${user?.username}! I'm SecureAI, your governed enterprise assistant. I operate under ${user?.role?.toUpperCase()} access policies. Ask me anything about company policies, HR, security, or operations.`,
      timestamp: new Date().toISOString(),
      status: 'allowed',
      risk_score: 0,
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const roleInfo = ROLE_INFO[user?.role] || ROLE_INFO.intern

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text = input) => {
    const msg = text.trim()
    if (!msg || loading) return

    setInput('')
    const userMsg = { id: Date.now(), role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await api.post('/chat', { message: msg })
      const { response, status, risk_score } = res.data
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        status,
        risk_score,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Connection error. Please check the backend server.',
        timestamp: new Date().toISOString(),
        status: 'blocked',
        risk_score: 0,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const clearChat = async () => {
    await api.post('/chat/clear').catch(() => {})
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Chat cleared. How can I help you, ${user?.username}?`,
      timestamp: new Date().toISOString(),
      status: 'allowed',
      risk_score: 0,
    }])
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 glass">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Cpu size={16} className="text-accent" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-bg-900" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">SecureAI Chatbot</h2>
            <p className="text-[11px] text-slate-500 font-mono">Governance Layer Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Role badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light border border-white/8 ${roleInfo.color}`}>
            <ShieldAlert size={12} />
            <span className="text-xs font-mono font-bold">{roleInfo.label}</span>
            <span className="text-[10px] text-slate-500 hidden sm:block">— {roleInfo.desc}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-danger/10 border border-transparent hover:border-danger/20 text-slate-500 hover:text-danger transition-all"
            title="Clear chat"
          >
            <Trash2 size={14} />
          </motion.button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
          {loading && <TypingIndicator key="typing" />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-6 pb-3">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-2">Suggested queries</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <motion.button
                key={s}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-lg glass-light border border-white/8 text-slate-400 hover:text-accent hover:border-accent/30 transition-all"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-bg-800 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 focus:shadow-glow transition-all text-sm resize-none font-mono leading-relaxed"
              placeholder="Ask SecureAI anything... (Enter to send)"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-xl bg-accent text-bg-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-dim transition-all shadow-glow flex-shrink-0"
          >
            <Send size={16} />
          </motion.button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2 font-mono text-center">
          Responses governed by RBAC policy · {user?.role?.toUpperCase()} access level
        </p>
      </div>
    </motion.div>
  )
}