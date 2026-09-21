/**
 * Settings：设置页（界面样式版；除主题外均为演示控件，不落盘）
 * - 分区：外观 / 编辑器 / 快捷键 / 关于
 * - 主题切换为真实能力（useTheme）；其余控件提供视觉反馈并标注"演示"
 */
import { useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { Button } from '@/component/ui/button'
import { Switch, Slider, Segmented } from '@/component/ui/controls'
import { Kbd } from '@/component/ui/primitives'
import { useTheme } from '@/hooks/useTheme'
import type { ThemeMode } from '@/hooks/useTheme'
import { showDemo } from '@/utils'
import './settings.css'

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Ctrl+K', label: '命令中心搜索' },
  { keys: 'Ctrl+Alt+I', label: '开合 AI 面板' },
  { keys: 'Ctrl+S', label: '保存当前文件' },
  { keys: 'Ctrl+F', label: '查找 / 替换' },
  { keys: 'Tab / Shift+Tab', label: '缩进 / 反缩进' },
  { keys: 'Shift+Enter', label: 'AI 输入换行' },
  { keys: 'Ctrl+W', label: '关闭标签页（演示）' },
  { keys: 'Ctrl+Shift+P', label: '命令面板（规划）' },
]

export function Settings() {
  const { mode, setThemeMode } = useTheme()

  /* 演示控件（仅本地视觉反馈） */
  const [density, setDensity] = useState<'compact' | 'standard' | 'loose'>('standard')
  const [language, setLanguage] = useState('zh')
  const [fontSize, setFontSize] = useState(14)
  const [tabSize, setTabSize] = useState('2')
  const [autoSave, setAutoSave] = useState(true)
  const [minimap, setMinimap] = useState(false)
  const [bracket, setBracket] = useState(true)

  return (
    <div className="st">
      <header className="st-head">
        <h1 className="st-title">
          <Icon name="cog" size={20} className="st-title-icon" />
          设置
        </h1>
        <p className="st-subtitle">主题、编辑器与快捷键偏好（除主题外为界面演示）</p>
      </header>

      {/* ==================== 外观 ==================== */}
      <section className="st-section">
        <div className="st-section-head">
          <Icon name="palette" size={14} />
          <span>外观</span>
        </div>
        <div className="st-rows">
          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">主题</span>
              <span className="st-row-desc">界面配色（立即生效并持久化）</span>
            </div>
            <Segmented<ThemeMode>
              aria-label="主题"
              value={mode}
              onChange={setThemeMode}
              options={[
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
                { value: 'system', label: '跟随系统' },
              ]}
            />
          </div>

          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">界面密度</span>
              <span className="st-row-desc">控件与列表的紧凑程度</span>
            </div>
            <Segmented<'compact' | 'standard' | 'loose'>
              aria-label="界面密度"
              value={density}
              onChange={setDensity}
              options={[
                { value: 'compact', label: '紧凑' },
                { value: 'standard', label: '标准' },
                { value: 'loose', label: '宽松' },
              ]}
            />
          </div>

          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">界面语言</span>
              <span className="st-row-desc">菜单与提示文案的语言</span>
            </div>
            <select
              className="st-select"
              aria-label="界面语言"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>
      </section>

      {/* ==================== 编辑器 ==================== */}
      <section className="st-section">
        <div className="st-section-head">
          <Icon name="file-text" size={14} />
          <span>编辑器</span>
        </div>
        <div className="st-rows">
          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">字号</span>
              <span className="st-row-desc">代码区字体大小</span>
            </div>
            <Slider
              aria-label="字号"
              value={fontSize}
              min={12}
              max={20}
              onChange={setFontSize}
              unit=" px"
            />
          </div>

          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">Tab 宽度</span>
              <span className="st-row-desc">缩进使用的空格数</span>
            </div>
            <Segmented
              aria-label="Tab 宽度"
              value={tabSize}
              onChange={setTabSize}
              options={[
                { value: '2', label: '2 空格' },
                { value: '4', label: '4 空格' },
                { value: '8', label: '8 空格' },
              ]}
            />
          </div>

          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">自动保存</span>
              <span className="st-row-desc">编辑后自动写入磁盘（接后端后生效）</span>
            </div>
            <Switch aria-label="自动保存" checked={autoSave} onChange={setAutoSave} />
          </div>

          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">显示小地图</span>
              <span className="st-row-desc">编辑器右侧的代码缩略图</span>
            </div>
            <Switch aria-label="显示小地图" checked={minimap} onChange={setMinimap} />
          </div>

          <div className="st-row">
            <div className="st-row-main">
              <span className="st-row-title">括号匹配高亮</span>
              <span className="st-row-desc">光标停在括号上时高亮配对</span>
            </div>
            <Switch aria-label="括号匹配高亮" checked={bracket} onChange={setBracket} />
          </div>
        </div>
      </section>

      {/* ==================== 快捷键 ==================== */}
      <section className="st-section">
        <div className="st-section-head">
          <Icon name="keyboard" size={14} />
          <span>快捷键</span>
          <span className="st-demo-tag">演示</span>
        </div>
        <div className="st-keys">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="st-key-row">
              <span className="st-key-label">{s.label}</span>
              <span className="st-key-keys">
                {s.keys.split(' / ').map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 关于 ==================== */}
      <section className="st-section">
        <div className="st-section-head">
          <Icon name="cloud" size={14} />
          <span>关于</span>
        </div>
        <div className="st-about">
          <div className="st-about-logo">
            <Icon name="cloud" size={22} />
          </div>
          <div className="st-about-main">
            <span className="st-about-name">KazeNest</span>
            <span className="st-about-meta">v0.1.0 · React 19 + Tauri 2 · Where Clouds Rest</span>
          </div>
          <div className="st-about-actions">
            <Button
              size="sm"
              onClick={() => showDemo({ title: '检查更新', desc: '演示模式：更新器尚未接入', icon: 'refresh' })}
            >
              检查更新
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => showDemo({ title: '文档', desc: '演示模式：文档站尚未接入', icon: 'file-text' })}
            >
              文档
            </Button>
          </div>
        </div>
      </section>

      <p className="st-hint">演示模式：除主题外，设置项暂未持久化（接后端设置服务后生效）</p>
    </div>
  )
}
