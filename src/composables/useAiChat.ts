/**
 * AI 聊天共享状态（useAiChat）
 * - 侧栏（AISidebar：会话列表/模型/提示词库）与主区（AiWorkspace：对话工作台）
 *   共用同一份状态，保证两个视图看到同一份会话/消息。
 * - 会话模型：sessions[]（元信息 + 各自的消息数组）；切换会话即切换当前对话。
 * - 模拟 agent 工作流：发送后按"工具卡片(读取/分析/生成) → 打字效果 → 回复"演示，
 *   接后端后把 simulateWorkflow 替换为真实流式输出即可。
 * - 持久化走 useAppSession 的 ai 切片（防抖落盘 + beforeunload flush）。
 *
 * 用法（组件里）：
 *   const chat = useAiChat()
 *   await chat.restore()              // 启动恢复（内部调 useAppSession.restore）
 *   chat.newChat()                    // 新建会话
 *   chat.selectSession(id)            // 切换会话
 *   chat.send({ text, attachments })  // 发送用户消息（触发模拟工作流）
 *   chat.pickWork(w)                  // 按工作模式发起
 *
 * 设计说明：所有状态都是模块级单例（useAppSession 的共享快照也一样），
 * 因此不再包一层函数壳，直接导出函数引用即可——组件间天然共享同一份数据。
 */
import { computed, ref, watch } from 'vue'
import { useAppSession } from './useAppSession'

/* =================== 工作模式（均衡覆盖常见开发工作） =================== */

export type WorkKind =
  | 'coding' | 'explain' | 'refactor' | 'test'
  | 'review' | 'doc' | 'data' | 'translate'

export interface WorkMode {
  kind: WorkKind
  label: string
  icon: string
  color: string
  /** 点击工作卡片后自动填充的提示词前缀 */
  prompt: string
}

export const workModes: WorkMode[] = [
  { kind: 'coding',    label: '编写代码', icon: 'file-plus',  color: 'var(--kn-sky-500)',     prompt: '请帮我编写：' },
  { kind: 'explain',   label: '解释代码', icon: 'file-text',  color: 'var(--kn-emerald-500)', prompt: '请帮我解释这段代码：' },
  { kind: 'refactor',  label: '代码重构', icon: 'refresh',    color: 'var(--kn-brand-500)',   prompt: '请帮我重构这段代码：' },
  { kind: 'test',      label: '写测试',   icon: 'terminal',   color: 'var(--kn-amber-500)',   prompt: '请为这段代码写单元测试：' },
  { kind: 'review',    label: '代码评审', icon: 'check',      color: 'var(--kn-rose-500)',    prompt: '请评审这段代码：' },
  { kind: 'doc',       label: '写文档',   icon: 'file-text',  color: 'var(--kn-magenta-500)', prompt: '请帮我撰写文档：' },
  { kind: 'data',      label: '数据分析', icon: 'chart-line', color: 'var(--kn-brand-400)',   prompt: '请帮我分析这些数据：' },
  { kind: 'translate', label: '翻译',     icon: 'globe',      color: 'var(--kn-sky-400)',     prompt: '请帮我翻译：' },
]

/** 模型列表（演示用；接后端后从 API 拉取）
 * 计费：priceIn / priceOut 为每百万 token 价格（人民币元），
 * 发送消息时按估算 token 数自动累计费用（见 usage / pushMessage）。
 * 扩展点：新增模型只需加一条（计费栏/模型选择器自动跟随）；
 * 未来可加 maxContext / 单位币种（unit）/ 折扣等字段。 */
export interface ModelDef {
  id: string
  label: string
  desc: string
  /** 每百万 token 输入价格（元） */
  priceIn: number
  /** 每百万 token 输出价格（元） */
  priceOut: number
}

export const models: ModelDef[] = [
  { id: 'model-r1',    label: 'DeepSeek-R1',    desc: '推理模型', priceIn: 4,  priceOut: 16 },
  { id: 'model-chat',  label: 'DeepSeek-Chat',  desc: '通用对话', priceIn: 2,  priceOut: 8 },
  { id: 'model-coder', label: 'DeepSeek-Coder', desc: '代码生成', priceIn: 1,  priceOut: 2 },
]

/* =================== 消息 / 会话类型 =================== */

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

/* =================== 状态（模块级单例） =================== */

const sessions = ref<AiSession[]>([])
const activeSessionId = ref('')
const activeModel = ref('model-chat')
const thinking = ref<{ open: boolean; text: string } | null>(null)
/** 流式输出状态（打字机逐字打印中的消息 id + 已打印长度） */
const streaming = ref<{ messageId: number; length: number } | null>(null)

/* =================== 计费用量 =================== */

/** 累计用量（全局；token 为估算值，接后端后替换为真实 usage）
 * 扩展点：未来可加 按会话账单 / 按日期统计 / 图表 等维度 */
export interface Usage {
  inputTokens: number
  outputTokens: number
  /** 总花费（元，按各模型单价累计） */
  cost: number
}

const usage = ref<Usage>({ inputTokens: 0, outputTokens: 0, cost: 0 })

/** 估算文本 token 数：中文约 1 token/1.6 字符，英文约 1 token/4 字符 */
function estimateTokens(text: string): number {
  const s = text.trim()
  if (!s) return 0
  const cjk = (s.match(/[\u4e00-\u9fff]/g) ?? []).length
  const other = s.length - cjk
  return Math.ceil(cjk / 1.6 + other / 4)
}

let seq = 0
let sessionSeq = 0

/** 当前活动会话对象 */
const activeSession = computed(() => sessions.value.find((s) => s.id === activeSessionId.value) ?? sessions.value[0] ?? null)

/** 当前会话的消息（渲染用） */
const messages = computed(() => activeSession.value?.messages ?? [])

/** 当前模型信息 */
const activeModelInfo = computed(() => models.find((m) => m.id === activeModel.value))

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* =================== 会话操作 =================== */

/** 新建会话（默认名字按序号；输入清空由调用方做） */
function newChat() {
  const now = Date.now()
  const id = `s${++sessionSeq}`
  const colors = ['var(--kn-brand-500)', 'var(--kn-magenta-500)', 'var(--kn-sky-500)', 'var(--kn-emerald-500)', 'var(--kn-amber-500)']
  const session: AiSession = {
    id,
    label: `新会话 ${sessionSeq}`,
    icon: 'sparkles',
    color: colors[(sessionSeq - 1) % colors.length],
    meta: '刚刚',
    createdAt: now,
    messages: [],
  }
  sessions.value.unshift(session)
  activeSessionId.value = id
  thinking.value = null
  streaming.value = null
}

function selectSession(id: string) {
  if (activeSessionId.value === id) return
  activeSessionId.value = id
  thinking.value = null
  streaming.value = null
}

function removeSession(id: string) {
  const idx = sessions.value.findIndex((s) => s.id === id)
  if (idx === -1) return
  sessions.value.splice(idx, 1)
  if (activeSessionId.value === id) {
    activeSessionId.value = sessions.value[0]?.id ?? ''
  }
}

/* =================== 消息 / 模拟工作流 =================== */

/** 自动计费：按消息 token 估算 × 当前模型单价（输入/输出分开） */
function billUsage(role: 'user' | 'assistant', text: string) {
  const m = activeModelInfo.value
  const tokens = estimateTokens(text)
  if (role === 'user') {
    usage.value.inputTokens += tokens
    usage.value.cost += (tokens * (m?.priceIn ?? 0)) / 1_000_000
  } else {
    usage.value.outputTokens += tokens
    usage.value.cost += (tokens * (m?.priceOut ?? 0)) / 1_000_000
  }
}

function pushMessage(role: 'user' | 'assistant', text: string, work?: WorkKind) {
  const sess = activeSession.value
  if (!sess) return
  sess.messages.push({ id: ++seq, role, text, work, time: nowTime(), sessionId: sess.id })
  const d = new Date()
  sess.meta = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  billUsage(role, text)
}

interface SendInput {
  text: string
  /** 附件名列表（演示：拼进消息文本） */
  attachments?: string[]
  work?: WorkKind
}

/** 发送用户消息并触发模拟 agent 工作流（流式输出期间不接受新消息） */
function send(input: SendInput) {
  if (streaming.value) return
  const text = input.text.trim()
  if (!text && !(input.attachments?.length)) return
  const attachNote = input.attachments?.length ? `\n[附件: ${input.attachments.join(', ')}]` : ''
  pushMessage('user', text + attachNote, input.work)
  simulateWorkflow(input.work)
}

/** 点击工作卡片：按该工作模式发送并模拟回复 */
function pickWork(w: WorkMode) {
  send({ text: w.prompt, work: w.kind })
}

/** 模拟思考文本（演示推理要点；接后端后替换为真实 reasoning 内容） */
function thinkingFor(work?: WorkKind): string {
  const w = work ? workModes.find((x) => x.kind === work)?.label : ''
  return [
    '读取工作区上下文（当前文件 / 打开的编辑器 / 项目结构）',
    w ? `识别任务类型：${w}` : '识别任务类型：通用对话',
    '梳理约束条件与期望输出',
    '规划内容结构，准备生成',
  ].join('\n')
}

/**
 * 模拟 agent 工作流（DeepSeek Harness 风格）：
 * 思考阶段（产出默认收起的思考块）→ 流式打字机输出回复
 * 接后端后：思考块接真实 reasoning 内容，流式接真实 SSE 增量
 */
function simulateWorkflow(work?: WorkKind) {
  const sess = activeSession.value
  if (!sess) return
  const sessionId = sess.id
  thinking.value = { open: false, text: '' }
  window.setTimeout(() => {
    if (activeSessionId.value !== sessionId) return
    thinking.value = { open: false, text: thinkingFor(work) }
    streamAssistant(work, sessionId)
  }, 700)
}

/** 流式输出定时器（stopStreaming 需要提前取消） */
let streamTimer: number | undefined

/** 流式输出助手回复（逐字打字机；完成后计费并停止） */
function streamAssistant(work: WorkKind | undefined, sessionId: string) {
  const sess = sessions.value.find((s) => s.id === sessionId)
  if (!sess) return
  const full = replyFor(work)
  const id = ++seq
  sess.messages.push({ id, role: 'assistant', text: '', work, time: nowTime(), sessionId })
  streaming.value = { messageId: id, length: 0 }
  streamTimer = window.setInterval(() => {
    const st = streaming.value
    const target = sess.messages.find((m) => m.id === id)
    if (!st || st.messageId !== id || !target || activeSessionId.value !== sessionId) {
      window.clearInterval(streamTimer)
      streamTimer = undefined
      return
    }
    st.length = Math.min(st.length + 2, full.length)
    target.text = full.slice(0, st.length)
    if (st.length >= full.length) {
      window.clearInterval(streamTimer)
      streamTimer = undefined
      target.text = full
      streaming.value = null
      billUsage('assistant', full)
    }
  }, 16)
}

/** 停止生成（保留已输出内容并按已输出部分计费；空占位消息则移除） */
function stopStreaming() {
  if (!streaming.value) return
  window.clearInterval(streamTimer)
  streamTimer = undefined
  const st = streaming.value
  const sess = activeSession.value
  const target = sess?.messages.find((m) => m.id === st.messageId)
  if (sess && target) {
    if (target.text) {
      billUsage('assistant', target.text)
    } else {
      const idx = sess.messages.findIndex((m) => m.id === st.messageId)
      if (idx >= 0) sess.messages.splice(idx, 1)
    }
  }
  streaming.value = null
}

/** 重新生成最后一条助手回复（DeepSeek Harness 的"重试"） */
function regenerate() {
  const sess = activeSession.value
  if (!sess || streaming.value) return
  for (let i = sess.messages.length - 1; i >= 0; i--) {
    if (sess.messages[i].role === 'assistant') {
      sess.messages.splice(i, 1)
      break
    }
  }
  const lastUser = [...sess.messages].reverse().find((m) => m.role === 'user')
  simulateWorkflow(lastUser?.work)
}

/** 展开/收起思考过程 */
function toggleThinking() {
  if (thinking.value) thinking.value.open = !thinking.value.open
}

/** 按工作模式返回演示回复（含 markdown 代码块，渲染器会展示语言/复制） */
function replyFor(work?: WorkKind): string {
  if (!work) {
    const model = activeModelInfo.value?.label ?? ''
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

/* =================== 持久化 =================== */

const { session, restore, save, flush } = useAppSession()

/** 把当前 AI 状态写回共享快照 */
function syncSession() {
  const s = session.value
  if (!s) return
  s.ai = {
    activeModel: activeModel.value,
    sessions: sessions.value.map((sess) => ({
      id: sess.id,
      label: sess.label,
      icon: sess.icon,
      color: sess.color,
      meta: sess.meta,
      createdAt: sess.createdAt,
    })),
    activeSessionId: activeSessionId.value,
    messages: sessions.value.flatMap((sess) =>
      sess.messages.map((m) => ({ id: m.id, role: m.role, text: m.text, work: m.work, time: m.time, sessionId: sess.id }))
    ),
    usage: usage.value,
  }
}

/** 状态任一变化 → 写回快照并防抖落盘 */
watch([sessions, activeSessionId, activeModel], () => {
  syncSession()
  save()
}, { deep: true })

/** 启动恢复：恢复模型 + 会话列表 + 各会话消息 */
let aiRestored = false

async function restoreAI() {
  /* 幂等：AI 主界面与右侧面板可能同时挂载（展开动画期间），只允许恢复一次 */
  if (aiRestored) return
  aiRestored = true
  const ai = (await restore())?.ai
  if (!ai) return
  activeModel.value = ai.activeModel || 'model-chat'
  if (ai.usage) usage.value = { inputTokens: ai.usage.inputTokens, outputTokens: ai.usage.outputTokens, cost: ai.usage.cost }
  if (Array.isArray(ai.sessions) && ai.sessions.length) {
    sessions.value = ai.sessions
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => ({ ...s, messages: [] }))
    // 分组：每条消息归入其会话
    for (const m of ai.messages) {
      const sid = m.sessionId ?? ai.sessions[0]?.id
      const sess = sessions.value.find((s) => s.id === sid)
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
    sessionSeq = Math.max(0, ...sessions.value.map((s) => parseInt(s.id.replace(/\D/g, '') || '0', 10)))
    seq = Math.max(0, ...ai.messages.map((m) => m.id))
    activeSessionId.value = sessions.value.some((s) => s.id === ai.activeSessionId)
      ? ai.activeSessionId
      : (sessions.value[0]?.id ?? '')
  } else {
    // 首次运行：建一个默认会话
    newChat()
  }
}

/** 工作模式查询（渲染消息标签用） */
export function workByKind(kind: WorkKind | undefined): WorkMode | undefined {
  return workModes.find((w) => w.kind === kind)
}

export function useAiChat() {
  return {
    sessions,
    activeSession,
    activeSessionId,
    messages,
    activeModel,
    activeModelInfo,
    thinking,
    streaming,
    usage,
    workModes,
    models,
    newChat,
    selectSession,
    removeSession,
    send,
    pickWork,
    toggleThinking,
    stopStreaming,
    regenerate,
    restore: restoreAI,
    flush,
  }
}