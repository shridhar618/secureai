import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  ShieldCheck, ShieldAlert, Lock, Activity, RefreshCw,
  ChevronLeft, ChevronRight, Search, Filter
} from 'lucide-react'
import { format } from 'date-fns'

const STATUS_COLORS = { allowed: '#06d6a0', filtered: '#ffb703', blocked: '#ff4d6d' }

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-2xl p-5 border border-white/5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 border border-white/10 text-xs font-mono">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterUser, setFilterUser] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get('/logs', { params: { page, per_page: 15, username: filterUser || undefined, status: filterStatus || undefined } }),
        api.get('/logs/stats'),
      ])
      setLogs(logsRes.data.logs)
      setTotalPages(logsRes.data.pages)
      setStats(statsRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, filterUser, filterStatus])

  const pieData = stats ? [
    { name: 'Allowed', value: stats.allowed },
    { name: 'Filtered', value: stats.filtered },
    { name: 'Blocked', value: stats.blocked },
  ].filter(d => d.value > 0) : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full overflow-y-auto px-6 py-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Dashboard</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">REAL-TIME GOVERNANCE MONITORING</p>
        </div>
        <motion.button
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.3 }}
          onClick={fetchData}
          className="p-2 rounded-lg glass-light border border-white/8 text-slate-400 hover:text-accent transition-colors"
        >
          <RefreshCw size={15} />
        </motion.button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Total Queries" value={stats.total} color="#00e5ff" delay={0} />
          <StatCard icon={ShieldCheck} label="Allowed" value={stats.allowed} color="#06d6a0" delay={0.05} />
          <StatCard icon={ShieldAlert} label="Filtered" value={stats.filtered} color="#ffb703" delay={0.1} />
          <StatCard icon={Lock} label="Blocked" value={stats.blocked} color="#ff4d6d" delay={0.15} />
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar chart: queries per user */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5 border border-white/5"
          >
            <h3 className="text-sm font-bold text-white mb-4">Queries per User</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.by_user} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="username" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#00e5ff" radius={[4, 4, 0, 0]} opacity={0.8} name="Queries" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie: status distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-5 border border-white/5"
          >
            <h3 className="text-sm font-bold text-white mb-4">Response Distribution</h3>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name.toLowerCase()]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[d.name.toLowerCase()] }} />
                      <span className="text-xs text-slate-400 font-mono">{d.name}</span>
                      <span className="text-xs font-bold text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-sm text-center py-8">No data yet</p>
            )}
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={filterUser}
            onChange={e => { setFilterUser(e.target.value); setPage(1) }}
            placeholder="Filter by user..."
            className="pl-8 pr-4 py-2 rounded-xl bg-bg-800 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 text-sm font-mono w-48 transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="pl-8 pr-4 py-2 rounded-xl bg-bg-800 border border-white/8 text-white focus:outline-none focus:border-accent/50 text-sm transition-all appearance-none"
          >
            <option value="">All statuses</option>
            <option value="allowed">Allowed</option>
            <option value="filtered">Filtered</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Logs table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl border border-white/5 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Audit Log</h3>
          <span className="text-xs text-slate-500 font-mono">{logs.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 uppercase tracking-wider">
                {['Time', 'User', 'Role', 'Query', 'Status', 'Risk'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-600">
                    <div className="flex justify-center gap-1.5">
                      {[0,1,2].map(i => (
                        <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-600">No logs found</td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{log.username}</td>
                    <td className="px-4 py-3">
                      <span className={`uppercase text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        log.role === 'admin' ? 'text-purple-400 bg-purple-400/10' :
                        log.role === 'hr' ? 'text-warn bg-warn/10' :
                        'text-accent bg-accent/10'
                      }`}>{log.role}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{log.query}</td>
                    <td className="px-4 py-3">
                      <span className={`uppercase text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        log.status === 'allowed' ? 'text-success bg-success/10' :
                        log.status === 'filtered' ? 'text-warn bg-warn/10' :
                        'text-danger bg-danger/10'
                      }`}>{log.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-bg-600 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${log.risk_score * 100}%`,
                              background: log.risk_score > 0.6 ? '#ff4d6d' : log.risk_score > 0.3 ? '#ffb703' : '#06d6a0'
                            }}
                          />
                        </div>
                        <span className="text-slate-500 text-[10px]">{(log.risk_score * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4 border-t border-white/5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-slate-500 font-mono">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}