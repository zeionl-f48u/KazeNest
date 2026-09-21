/**
 * 编辑器打开的文件（标签页 + 代码内容）
 * 实际项目：标签 = 侧边栏点击打开的文件；content 从 Tauri 文件系统读取
 * 这里内置几个示例文件，方便编辑器页演示（React 版）
 *
 * 调节指南：
 *  - 增删示例文件：数组里加减一条（id 即文件名，也是标签的 key）
 *  - language 显示在状态栏；icon 名来自 Icon.tsx 的 ICONS 表
 *  - color 是标签图标的着色（支持 var(--kn-*) 语义色）
 */
export interface EditorFile {
  id: string
  name: string
  language: string
  icon: string
  color?: string
  content: string
  /** 是否有未保存的修改（编辑后 true，Ctrl+S 后 false） */
  modified?: boolean
}

const mainTsx = `// KazeNest — Where Clouds Rest
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/tailwind.css'
import './styles/tokens.css'
import './styles/effects.css'

import App from './App'

/** 格式化源码：去掉每行首尾空白 */
export function format(source: string): string {
  const lines = source.split('\\n')
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\\n')
}

const container = document.getElementById('root')
if (!container) throw new Error('找不到 #root 挂载点')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)`

const appTsx = `/**
 * App：外壳（React 版）
 * 布局：Titlebar | ActivityBar + SideBar + 内容舞台（主内容 + AI 右侧面板）
 */
export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('editor')
  const [sideBarOpen, setSideBarOpen] = useState(true)

  const active = views[activeView]
  const Page = active.page

  return (
    <div className="app-shell">
      <Titlebar title="KazeNest" searchItems={searchItems}>
        <TitlebarChrome slot="leading" part="leading" menus={menus} />
      </Titlebar>

      <div className="app-body">
        <ActivityBar
          items={activityItems}
          activeId={activeView}
          onSelect={setActiveView}
        />
        {sideBarOpen && <SideBar title={active.sidebarTitle} />}
        <main className="app-content">
          <Page />
        </main>
      </div>
    </div>
  )
}`

const themeCss = `/* KazeNest — 设计令牌（节选） */
:root {
  --kn-brand-500: #6366f1;
  --kn-magenta-500: #ec4899;
  --kn-radius-pill: 999px;
  --kn-glass-blur: 20px;
  --tb-height: 38px;
}

.app-shell {
  height: 100vh;
  overflow: hidden;
}

.tb {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--tb-height);
  background: rgba(248, 249, 252, 0.72);
  backdrop-filter: saturate(180%) blur(var(--kn-glass-blur));
}

.glass-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
}`

export const editorFiles: EditorFile[] = [
  {
    id: 'main.tsx',
    name: 'main.tsx',
    language: 'TypeScript',
    icon: 'file-text',
    color: 'var(--kn-sky-500)',
    content: mainTsx,
  },
  {
    id: 'App.tsx',
    name: 'App.tsx',
    language: 'React',
    icon: 'file-text',
    color: 'var(--kn-emerald-500)',
    content: appTsx,
  },
  {
    id: 'theme.css',
    name: 'theme.css',
    language: 'CSS',
    icon: 'file-text',
    color: 'var(--kn-magenta-500)',
    content: themeCss,
  },
]
