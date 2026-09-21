/**
 * AI 聊天共享状态（React 版 useAiChat）
 * - 主界面（AiWorkspace）与右侧面板（AiPanel）/ 侧栏（AISidebar）共享同一份状态
 * - 模块级可变状态 + 版本号驱动 useSyncExternalStore（贴近 Vue 响应式实现）
 * - 模拟 agent 工作流：思考块 → 流式打字机；接后端后替换 simulateWorkflow/streamAssistant
 * - 持久化：AppSessionSnapshot.ai 切片（会话 / 消息 / 模型 / 计费）
 */
import { useSyncExternalStore } from 'react'
import { useAppSession } from '@/hooks/useAppSession'

/* =================== 工作模式 / 模型 =================== */

export type WorkKind =
  | 'coding' | 'explain' | 'refactor' | 'test'
  | 'review' | 'doc' | 'data' | 'translate'

export interface WorkMode {
  kind: WorkKind
  label: string
  icon: string
  color: string
  prompt: string
}

export const workModes: WorkMode[] = [
  { kind: 'coding', label: '编写代码', icon: 'file-plus', color: 'var(--kn-sky-500)', prompt: '请帮我编写：' },
  { kind: 'explain', label: '解释代码', icon: 'file-text', color: 'var(--kn-emerald-500)', prompt: '请帮我解释这段代码：' },
  { kind: 'refactor', label: '代码重构', icon: 'refresh', color: 'var(--kn-brand-500)', prompt: '请帮我重构这段代码：' },
  { kind: 'test', label: '写测试', icon: 'terminal', color: 'var(--kn-amber-500)', prompt: '请为这段代码写单元测试：' },
  { kind: 'review', label: '代码评审', icon: 'check', color: 'var(--kn-rose-500)', prompt: '请评审这段代码：' },
  { kind: 'doc', label: '写文档', icon: 'file-text', color: 'var(--kn-magenta-500)', prompt: '请帮我撰写文档：' },
  { kind: 'data', label: '数据分析', icon: 'chart-line', color: 'var(--kn-brand-400)', prompt: '请帮我分析这些数据：' },
  { kind: 'translate', label: '翻译', icon: 'globe', color: 'var(--kn-sky-400)', prompt: '请帮我翻译：' },
]

export interface ModelDef {
  id: string
  label: string
  desc: string
  priceIn: number
  priceOut: number
}

export const models: ModelDef[] = [
  { id: 'model-r1', label: 'DeepSeek-R1', desc: '推理模型', priceIn: 4, priceOut: 16 },
  { id: 'model-chat', label: 'DeepSeek-Chat', desc: '通用对话', priceIn: 2, priceOut: 8 },
  { id: 'model-coder', label: 'DeepSeek-Coder', desc: '代码生成', priceIn: 1, priceOut: 2 },
]

/* =================== 类型 =================== */

export interface AiMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  work?: WorkKind
  time: string
  sessionId: string
}

export interface AiSession {
  id: string
  label: string
  icon: string
  color: string
  meta: string
  createdAt: number
  messages: AiMessage[]
}

export interface Usage {
  inputTokens: number
  outputTokens: number
  cost: number
}

/* =================== 模块级状态 =================== */

let sessions: AiSession[] = []
let activeSessionId = ''
let activeModel = 'model-chat'
let thinking: { open: boolean; text: string } | null = null
let streaming: { messageId: number; length: number } | null = null
let usage: Usage = { inputTokens: 0, outputTokens: 0, cost: 0 }
let seq = 0
let sessionSeq = 0

let version = 0
const listeners = new Set<() => void>()

function bump() {
  version++
  for (const fn of listeners) fn()
  syncSession()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 组件内订阅 */
export function useAiChat() {
  useSyncExternalStore(subscribe, () => version, () => version)
  return api
}

/* =================== 持久化 =================== */

const sessionApi = useAppSession()

function syncSession() {
  sessionApi.update((s) => {
    s.ai = {
      activeModel,
      sessions: sessions.map((sess) => ({
        id: sess.id,
        label: sess.label,
        icon: sess.icon,
        color: sess.color,
        meta: sess.meta,
        createdAt: sess.createdAt,
      })),
      activeSessionId,
      messages: sessions.flatMap((sess) =>
        sess.messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          work: m.work,
          time: m.time,
          sessionId: sess.id,
        }))
      ),
      usage,
    }
  })
}

let aiRestored = false

/** 启动恢复（幂等） */
export async function restoreAi() {
  if (aiRestored) return
  aiRestored = true
  const ai = (await sessionApi.restore())?.ai
  if (!ai) return
  activeModel = ai.activeModel || 'model-chat'
  if (ai.usage) usage = { inputTokens: ai.usage.inputTokens, outputTokens: ai.usage.outputTokens, cost: ai.usage.cost }
  if (Array.isArray(ai.sessions) && ai.sessions.length) {
    sessions = ai.sessions
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => ({ ...s, messages: [] as AiMessage[] }))
    for (const m of ai.messages) {
      const sid = m.sessionId ?? ai.sessions[0]?.id
      const sess = sessions.find((s) => s.id === sid)
      if (sess) {
        sess.messages.push({
          id: m.id,
          role: m.role,
          text: m.text,
          work: m.work as WorkKind | undefined,
          time: m.time,
          sessionId: sid ?? '',
        })
      }
    }
    sessionSeq = Math.max(0, ...sessions.map((s) => parseInt(s.id.replace(/\D/g, '') || '0', 10)))
    seq = Math.max(0, ...ai.messages.map((m) => m.id))
    activeSessionId = sessions.some((s) => s.id === ai.activeSessionId) ? ai.activeSessionId : (sessions[0]?.id ?? '')
  } else {
    newChat()
  }
  bump()
}

/* =================== 工具函数 =================== */

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 估算文本 token 数：中文约 1 token/1.6 字符，英文约 1 token/4 字符 */
function estimateTokens(text: string): number {
  const s = text.trim()
  if (!s) return 0
  const cjk = (s.match(/[\u4e00-\u9fff]/g) ?? []).length
  const other = s.length - cjk
  return Math.ceil(cjk / 1.6 + other / 4)
}

function billUsage(role: 'user' | 'assistant', text: string) {
  const m = activeModelInfo()
  const tokens = estimateTokens(text)
  if (role === 'user') {
    usage.inputTokens += tokens
    usage.cost += (tokens * (m?.priceIn ?? 0)) / 1_000_000
  } else {
    usage.outputTokens += tokens
    usage.cost += (tokens * (m?.priceOut ?? 0)) / 1_000_000
  }
}

function activeSession(): AiSession | null {
  return sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null
}

function activeModelInfo(): ModelDef | undefined {
  return models.find((m) => m.id === activeModel)
}

function pushMessage(role: 'user' | 'assistant', text: string, work?: WorkKind) {
  const sess = activeSession()
  if (!sess) return
  sess.messages.push({ id: ++seq, role, text, work, time: nowTime(), sessionId: sess.id })
  const d = new Date()
  sess.meta = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  billUsage(role, text)
}

/* =================== 会话 / 发送 =================== */

/** 新建会话 */
function newChat() {
  const id = `s${++sessionSeq}`
  const colors = ['var(--kn-brand-500)', 'var(--kn-magenta-500)', 'var(--kn-sky-500)', 'var(--kn-emerald-500)', 'var(--kn-amber-500)']
  sessions.unshift({
    id,
    label: `新会话 ${sessionSeq}`,
    icon: 'sparkles',
    color: colors[(sessionSeq - 1) % colors.length],
    meta: '刚刚',
    createdAt: Date.now(),
    messages: [],
  })
  activeSessionId = id
  thinking = null
  streaming = null
  bump()
}

function selectSession(id: string) {
  if (activeSessionId === id) return
  activeSessionId = id
  thinking = null
  streaming = null
  bump()
}

function removeSession(id: string) {
  const idx = sessions.findIndex((s) => s.id === id)
  if (idx === -1) return
  sessions.splice(idx, 1)
  if (activeSessionId === id) activeSessionId = sessions[0]?.id ?? ''
  bump()
}

interface SendInput {
  text: string
  attachments?: string[]
  work?: WorkKind
}

/** 发送用户消息并触发模拟工作流（流式期间不接受新消息） */
function send(input: SendInput) {
  if (streaming) return
  const text = input.text.trim()
  if (!text && !(input.attachments?.length)) return
  const attachNote = input.attachments?.length ? `\n[附件: ${input.attachments.join(', ')}]` : ''
  pushMessage('user', text + attachNote, input.work)
  simulateWorkflow(input.work)
  bump()
}

/** 点击工作卡片：按该工作模式发送 */
function pickWork(w: WorkMode) {
  send({ text: w.prompt, work: w.kind })
}

/* =================== 模拟工作流 =================== */

function thinkingFor(work?: WorkKind): string {
  const w = work ? workModes.find((x) => x.kind === work)?.label : ''
  return [
    '读取工作区上下文（当前文件 / 打开的编辑器 / 项目结构）',
    w ? `识别任务类型：${w}` : '识别任务类型：通用对话',
    '梳理约束条件与期望输出',
    '规划内容结构，准备生成',
  ].join('\n')
}

function simulateWorkflow(work?: WorkKind) {
  const sess = activeSession()
  if (!sess) return
  const sessionId = sess.id
  thinking = { open: false, text: '' }
  bump()
  window.setTimeout(() => {
    if (activeSessionId !== sessionId) return
    thinking = { open: false, text: thinkingFor(work) }
    bump()
    streamAssistant(work, sessionId)
  }, 700)
}

let streamTimer: number | undefined

function streamAssistant(work: WorkKind | undefined, sessionId: string) {
  const sess = sessions.find((s) => s.id === sessionId)
  if (!sess) return
  const full = replyFor(work)
  const id = ++seq
  sess.messages.push({ id, role: 'assistant', text: '', work, time: nowTime(), sessionId })
  streaming = { messageId: id, length: 0 }
  bump()
  streamTimer = window.setInterval(() => {
    const target = sess.messages.find((m) => m.id === id)
    if (!streaming || streaming.messageId !== id || !target || activeSessionId !== sessionId) {
      window.clearInterval(streamTimer)
      streamTimer = undefined
      return
    }
    streaming.length = Math.min(streaming.length + 2, full.length)
    target.text = full.slice(0, streaming.length)
    if (streaming.length >= full.length) {
      window.clearInterval(streamTimer)
      streamTimer = undefined
      target.text = full
      streaming = null
      billUsage('assistant', full)
    }
    bump()
  }, 16)
}

/** 停止生成（保留已输出内容并按已输出部分计费；空占位则移除） */
function stopStreaming() {
  if (!streaming) return
  window.clearInterval(streamTimer)
  streamTimer = undefined
  const st = streaming
  const sess = activeSession()
  const target = sess?.messages.find((m) => m.id === st.messageId)
  if (sess && target) {
    if (target.text) billUsage('assistant', target.text)
    else {
      const idx = sess.messages.findIndex((m) => m.id === st.messageId)
      if (idx >= 0) sess.messages.splice(idx, 1)
    }
  }
  streaming = null
  bump()
}

/** 重新生成最后一条助手回复 */
function regenerate() {
  const sess = activeSession()
  if (!sess || streaming) return
  for (let i = sess.messages.length - 1; i >= 0; i--) {
    if (sess.messages[i].role === 'assistant') {
      sess.messages.splice(i, 1)
      break
    }
  }
  const lastUser = [...sess.messages].reverse().find((m) => m.role === 'user')
  simulateWorkflow(lastUser?.work)
  bump()
}

function toggleThinking() {
  if (thinking) {
    thinking.open = !thinking.open
    bump()
  }
}

function setActiveModel(id: string) {
  activeModel = id
  bump()
}

/* =================== 演示回复 =================== */

function replyFor(work?: WorkKind): string {
  if (!work) {
    const model = activeModelInfo()?.label ?? ''
    return `已收到。\n\n> 当前模型：**${model}**（接后端后这里会返回真实流式回复）。\n\n**我可以帮你：**\n- 编写 / 解释 / 重构代码\n- 写单元测试 / 评审\n- 文档 / 分析 / 翻译\n\n把代码或需求贴给我即可。`
  }
  const replies: Record<WorkKind, string> = {
    coding: `好的，我来帮你编写代码。\n\n**请提供：**\n1. 编程语言（TypeScript / Python / ...）\n2. 功能需求\n3. 输入输出与边界条件\n\n例如：\n\n\`\`\`typescript\n// 需求：把数组按字段去重\nfunction uniqueBy<T>(arr: T[], key: keyof T): T[] {\n  const seen = new Set()\n  return arr.filter((item) => {\n    const k = String(item[key])\n    if (seen.has(k)) return false\n    seen.add(k)\n    return true\n  })\n}\n\`\`\`\n\n提供需求后我会生成完整代码。`,
    explain: `把代码贴给我，我会按**思路 → 关键点 → 风险**的结构解释：\n\n\`\`\`typescript\n// 例：这段代码为什么这样写\nfunction debounce<T extends (...args: any[]) => any>(fn: T, wait: number) {\n  let timer: number | undefined\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer)\n    timer = setTimeout(() => fn(...args), wait)\n  }\n}\n\`\`\`\n\n**要点：**\n1. 闭包保存 timer\n2. 每次调用重置计时\n3. 最后一次调用后 wait 毫秒执行`,
    refactor: `把代码贴给我，我会给出重构建议（**拆分 → 命名 → 复用 → 性能**）并说明理由：\n\n\`\`\`typescript\n// 重构前\nfunction save(u: User) { db.insert(u); log('save', u); notify(u) }\n\n// 重构后：单一职责\nfunction saveUser(user: User) { db.insert(user) }\nfunction logSave(user: User) { log('save', user) }\nfunction notifyUser(user: User) { notify(user) }\n\`\`\`\n\n告诉我具体代码即可开始。`,
    test: `把代码贴给我，我会按**正常路径 → 边界 → 异常**列出测试用例并生成测试代码：\n\n\`\`\`typescript\n// 例：对 debounce 的测试\nit('只在最后一次调用后执行', () => {\n  vi.useFakeTimers()\n  const fn = vi.fn()\n  const debounced = debounce(fn, 300)\n  debounced()\n  debounced()\n  vi.advanceTimersByTime(299)\n  expect(fn).not.toHaveBeenCalled()\n  vi.advanceTimersByTime(1)\n  expect(fn).toHaveBeenCalledTimes(1)\n})\n\`\`\`\n\n贴代码即可生成。`,
    review: `把代码贴给我，我会从**正确性、健壮性、可读性**三个维度评审：\n\n\`\`\`typescript\n// 评审示例\n// 问题：未处理空数组边界\nconst total = items.reduce((sum, i) => sum + i.price, 0) // items 可能为空\n\`\`\`\n\n**建议：**\n1. 空数组时 total 应为 0\n2. 增加类型约束避免非法输入\n3. 补充边界测试\n\n贴代码即可开始评审。`,
    doc: `告诉我文档主题和目标读者，我按**概述 → 用法 → 示例 → FAQ**组织内容：\n\n\`\`\`markdown\n# 功能名\n\n## 概述\n一两句话说明用途\n\n## 用法\n示例代码\n\n## 常见问题\nFAQ\n\`\`\`\n\n提供主题即可开始。`,
    data: `把数据贴给我（或说明来源），我会先做探索性分析再给结论：\n\n\`\`\`text\n# 例：数据概览\n行数：1,204\n列：date, user, amount\n缺失值：amount 3 条\n\`\`\`\n\n**建议分析方向：**\n1. 时间趋势\n2. 用户分布\n3. 异常检测\n\n提供数据即可开始。`,
    translate: `把原文贴给我，我会保留**语境与语气**翻译，并标注不确定处：\n\n\`\`\`text\n原文：It is what it is.\n翻译：事实如此，坦然接受。\n\`\`\`\n\n提供原文即可开始。`,
  }
  return replies[work]
}

/** 工作模式查询（渲染消息标签用） */
export function workByKind(kind: WorkKind | undefined): WorkMode | undefined {
  return workModes.find((w) => w.kind === kind)
}

/* =================== 对外 API =================== */

const api = {
  get sessions() {
    return sessions
  },
  get activeSession() {
    return activeSession()
  },
  get activeSessionId() {
    return activeSessionId
  },
  get messages() {
    return activeSession()?.messages ?? []
  },
  get activeModel() {
    return activeModel
  },
  get activeModelInfo() {
    return activeModelInfo()
  },
  get thinking() {
    return thinking
  },
  get streaming() {
    return streaming
  },
  get usage() {
    return usage
  },
  models,
  workModes,
  newChat,
  selectSession,
  removeSession,
  send,
  pickWork,
  toggleThinking,
  stopStreaming,
  regenerate,
  setActiveModel,
  restore: restoreAi,
}

export type AiChatApi = typeof api
