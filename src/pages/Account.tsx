/**
 * Account：账户页面（界面样式版，不接真实账号体系）
 * - 顶部切换两种状态预览：未登录 / 已登录
 * - 未登录：登录卡片（邮箱 + 密码 + 登录按钮，均为演示）
 * - 已登录：资料卡（头像 / 套餐 / 同步额度 / 设备与工作区）
 */
import { useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { Button } from '@/component/ui/button'
import { Input } from '@/component/ui/input'
import { Badge, Separator } from '@/component/ui/primitives'
import { Segmented } from '@/component/ui/controls'
import { showDemo } from '@/utils'
import GitHubActivity from '@/component/ui/github-activity'
import type { Contribution } from '@/component/ui/github-activity'
import MatrixOrb from '@/component/ui/matrix-orb'
import FamilyDrawer from '@/component/ui/family-drawer'
import GridReveal from '@/component/ui/grid-reveal'
import './account.css'

type View = 'guest' | 'signed'

/* ==================== Rare 组件演示数据 ==================== */

/** 贡献热力图（确定性伪随机，避免每次渲染变化） */
function buildContributions(): Contribution[] {
  const days: Contribution[] = []
  const start = Date.now() - 364 * 24 * 60 * 60 * 1000
  for (let i = 0; i < 365; i++) {
    const d = new Date(start + i * 24 * 60 * 60 * 1000)
    const seed = (i * 2654435761) % 97
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.4 : 1
    const count = Math.round((seed % 5) * weekend * 3)
    const level = Math.min(4, Math.ceil(count / 3)) as Contribution['level']
    days.push({ date: d.toISOString().slice(0, 10), count, level })
  }
  return days
}
const CONTRIBUTIONS = buildContributions()

/** 工作区封面（data URI SVG，避免额外图片资源） */
const COVER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fc4c01"/>
      <stop offset="1" stop-color="#bf5af2"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="46" font-weight="700"
    text-anchor="middle" dominant-baseline="central">KazeNest</text>
</svg>`
)}`

export function Account() {
  const [view, setView] = useState<View>('guest')

  return (
    <div className="ac">
      <header className="ac-head">
        <h1 className="ac-title">
          <Icon name="user" size={20} className="ac-title-icon" />
          账户
        </h1>
        <p className="ac-subtitle">登录、同步与设备管理（当前为界面演示）</p>
      </header>

      <div className="ac-switch">
        <Segmented<View>
          aria-label="状态预览"
          value={view}
          onChange={setView}
          options={[
            { value: 'guest', label: '未登录预览' },
            { value: 'signed', label: '已登录预览' },
          ]}
        />
      </div>

      {view === 'guest' ? <GuestCard /> : <SignedCard />}

      <p className="ac-hint">演示模式：账户体系尚未接入，界面仅作样式示意</p>
    </div>
  )
}

/* ==================== 未登录：登录卡片 ==================== */

function GuestCard() {
  return (
    <div className="ac-card ac-card-guest">
      <div className="ac-avatar">
        <Icon name="user" size={26} />
      </div>
      <h2 className="ac-card-title">登录 KazeNest</h2>
      <p className="ac-card-desc">登录后可同步设置、会话与插件，并在多设备间保持一致</p>

      <form
        className="ac-form"
        onSubmit={(e) => {
          e.preventDefault()
          showDemo({ title: '登录', desc: '演示模式：账号登录尚未接入', icon: 'user' })
        }}
      >
        <label className="ac-field">
          <span className="ac-field-label">邮箱</span>
          <Input type="email" placeholder="you@example.com" autoComplete="off" />
        </label>
        <label className="ac-field">
          <span className="ac-field-label">密码</span>
          <Input type="password" placeholder="••••••••" autoComplete="off" />
        </label>

        <Button variant="primary" type="submit" className="ac-submit">
          登录
        </Button>
      </form>

      <div className="ac-links">
        <button
          type="button"
          className="ac-link"
          onClick={() => showDemo({ title: '找回密码', desc: '演示模式：尚未接入', icon: 'keyboard' })}
        >
          忘记密码？
        </button>
        <button
          type="button"
          className="ac-link"
          onClick={() => showDemo({ title: '创建账户', desc: '演示模式：尚未接入', icon: 'user' })}
        >
          创建账户
        </button>
      </div>

      <ul className="ac-features">
        <li>
          <Icon name="cloud" size={12} />
          设置与主题云同步
        </li>
        <li>
          <Icon name="sparkles" size={12} />
          AI 会话跨设备续接
        </li>
        <li>
          <Icon name="shield" size={12} />
          私有空间密钥本地保管
        </li>
      </ul>
    </div>
  )
}

/* ==================== 已登录：资料卡片 ==================== */

function SignedCard() {
  return (
    <div className="ac-card ac-card-signed">
      <div className="ac-profile">
        <div className="ac-avatar ac-avatar-signed">Z</div>
        <div className="ac-profile-main">
          <div className="ac-profile-name">
            Zeionl
            <Badge tint="var(--kn-amber-500)" className="ac-plan">
              Pro 试用
            </Badge>
          </div>
          <div className="ac-profile-mail">zeionl@example.com</div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => showDemo({ title: '退出登录', desc: '演示模式：账号体系尚未接入', icon: 'forward' })}
        >
          退出登录
        </Button>
      </div>

      <Separator />

      {/* 同步额度 */}
      <div className="ac-quota">
        <div className="ac-quota-head">
          <span className="ac-quota-label">云同步额度</span>
          <span className="ac-quota-value">2.3 GB / 5 GB</span>
        </div>
        <div className="ac-quota-bar" role="progressbar" aria-valuenow={46} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: '46%' }} />
        </div>
      </div>

      {/* Rare UI：贡献热力图（演示数据） */}
      <div className="ac-demo">
        <div className="ac-demo-head">
          <Icon name="chart-bar" size={12} />
          <span>贡献热力图</span>
          <span className="ac-demo-tag">Rare UI · GitHub Activity</span>
        </div>
        <GitHubActivity contributions={CONTRIBUTIONS} username="zeionl" accent={['#fc4c01', '#ff9500']} />
      </div>

      {/* Rare UI：同步状态球 + 工作区封面揭示（演示） */}
      <div className="ac-demo-grid">
        <div className="ac-demo">
          <div className="ac-demo-head">
            <Icon name="cloud" size={12} />
            <span>同步状态</span>
            <span className="ac-demo-tag">Matrix Orb</span>
          </div>
          <div className="ac-demo-center">
            <MatrixOrb size={104} state="idle" />
          </div>
        </div>
        <div className="ac-demo">
          <div className="ac-demo-head">
            <Icon name="workspace" size={12} />
            <span>工作区封面</span>
            <span className="ac-demo-tag">Grid Reveal</span>
          </div>
          <GridReveal src={COVER_SVG} caption="滚动到此处自动揭示" aspect={16 / 9} estimatedDuration={1.4} />
        </div>
      </div>

      {/* Rare UI：家庭钱包恢复抽屉（演示） */}
      <div className="ac-demo">
        <div className="ac-demo-head">
          <Icon name="user" size={12} />
          <span>家庭钱包恢复</span>
          <span className="ac-demo-tag">Family Drawer</span>
        </div>
        <div className="ac-drawer-stage">
          <FamilyDrawer />
        </div>
      </div>

      {/* 设备与工作区 */}
      <div className="ac-grid">
        <div className="ac-info">
          <span className="ac-info-title">
            <Icon name="display" size={12} />
            已登录设备
          </span>
          <span className="ac-info-value">2 台（当前 · Windows）</span>
          <span className="ac-info-sub">上次同步：2 分钟前</span>
        </div>
        <div className="ac-info">
          <span className="ac-info-title">
            <Icon name="workspace" size={12} />
            关联工作区
          </span>
          <span className="ac-info-value">3 个</span>
          <span className="ac-info-sub">我的工作区 · KazeNest 项目 · 设计资源</span>
        </div>
      </div>

      <div className="ac-actions">
        <Button
          size="sm"
          onClick={() => showDemo({ title: '管理订阅', desc: '演示模式：订阅管理尚未接入', icon: 'chart-bar' })}
        >
          管理订阅
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => showDemo({ title: '同步设置', desc: '演示模式：同步服务尚未接入', icon: 'cloud' })}
        >
          立即同步
        </Button>
      </div>
    </div>
  )
}
