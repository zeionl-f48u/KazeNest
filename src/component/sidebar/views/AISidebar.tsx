/**
 * AISidebar：AI 助手侧栏（React 版）
 * - 顶部：新对话 + 模型切换
 * - 会话列表：切换 / 删除
 * - 提示词库：点击按工作模式发送
 * - 计费栏：总花费 + 模型单价 + 用量明细
 */
import { useEffect } from 'react'
import { Icon } from '@/component/common/Icon'
import { SidebarSection, SidebarRow } from './SidebarRow'
import { useAiChat, restoreAi } from '@/hooks/useAiChat'
import './view-sidebar.css'

const PROMPTS = [
  { id: 'p-review', label: '代码评审', icon: 'check' },
  { id: 'p-refactor', label: '重构建议', icon: 'refresh' },
  { id: 'p-explain', label: '解释代码', icon: 'file-text' },
  { id: 'p-test', label: '写单元测试', icon: 'terminal' },
]

function formatTokens(n: number): string {
  return n.toLocaleString('en-US')
}

export function AISidebar() {
  const chat = useAiChat()

  useEffect(() => {
    void restoreAi()
  }, [])

  return (
    <div className="ais">
      <div className="ais-toolbar">
        <button type="button" className="ais-new" aria-label="新对话" onClick={chat.newChat}>
          <Icon name="plus" size={12} />
        </button>
        <div className="ais-model">
          <Icon name="sparkles" size={11} className="ais-model-icon" />
          <select
            className="ais-model-select"
            aria-label="选择模型"
            value={chat.activeModel}
            onChange={(e) => chat.setActiveModel(e.target.value)}
          >
            {chat.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ais-sessions">
        <div className="ais-section-title">会话</div>
        {chat.sessions.map((s) => (
          <SidebarRow
            key={s.id}
            icon={s.icon}
            color={s.color}
            selected={s.id === chat.activeSessionId}
            onClick={() => chat.selectSession(s.id)}
            meta={
              <>
                <span className="ais-session-meta">{s.meta}</span>
                <button
                  type="button"
                  className="ais-session-x"
                  aria-label="删除会话"
                  onClick={(e) => {
                    e.stopPropagation()
                    chat.removeSession(s.id)
                  }}
                >
                  <Icon name="times" size={9} />
                </button>
              </>
            }
          >
            <span className="ais-session-label">{s.label}</span>
          </SidebarRow>
        ))}
      </div>

      <div className="ais-section">
        <SidebarSection title="提示词库" icon="menu" initialCollapsed>
          {PROMPTS.map((p) => (
            <SidebarRow
              key={p.id}
              icon={p.icon}
              onClick={() => {
                const w = chat.workModes.find(
                  (m) => m.prompt.includes(p.label.replace('代码', '')) || m.label === p.label
                )
                chat.send({ text: p.label, work: w?.kind })
              }}
            >
              {p.label}
            </SidebarRow>
          ))}
        </SidebarSection>
      </div>

      {/* 计费栏 */}
      <div className="ais-billing">
        <div className="ais-billing-total">
          <span className="ais-billing-label">总花费</span>
          <span className="ais-billing-amount">¥{chat.usage.cost.toFixed(4)}</span>
        </div>

        <div className="ais-billing-models">
          {chat.models.map((m) => (
            <div key={m.id} className="ais-billing-model">
              <span className="ais-billing-name">{m.label}</span>
              <span className="ais-billing-price">￥{m.priceIn} / 百万 in</span>
              <span className="ais-billing-price">￥{m.priceOut} / 百万 out</span>
            </div>
          ))}
        </div>

        <div className="ais-billing-usage">
          <span>输入 {formatTokens(chat.usage.inputTokens)} tokens</span>
          <span>输出 {formatTokens(chat.usage.outputTokens)} tokens</span>
        </div>
      </div>
    </div>
  )
}
