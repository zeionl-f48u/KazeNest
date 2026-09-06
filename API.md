# KazeNest 后端 ↔ 前端 API 文档

> 用途：给后端（Rust / Tauri）开发看的前端 API 契约。
> 前端调用方式：WebView 通过 `@tauri-apps/api` 走 Tauri IPC。
> 版本基线：tauri 2.11.5 / tauri-plugin-store 2.4.4 / tauri-plugin-decoration 2.1.4 / @tauri-apps/api 2

---

## 1. 架构总览

```
┌──────────────────────────────┐         ┌──────────────────────────┐
│  前端 (Vue 3 + Vite, :1420)   │  IPC    │  后端 (Rust, src-tauri)   │
│                              │ ◄──────► │                          │
│  src/                       │  invoke  │  lib.rs:                 │
│   ├ App.vue (shell)         │          │   - init_custom_titlebar │
│   ├ pages/ (Home/Editor/…)  │          │   - restore_native_titlebar
│   ├ data/ (静态配置)         │  plugins │  tauri-plugin-*          │
│   ├ utils/persist.ts (store)│          │   - decoration (标题栏)   │
│   └ component/              │  events  │   - store (JSON 持久化)   │
└──────────────────────────────┘         └──────────────────────────┘
```

- 前端**不能直接调系统 API**，一切都要通过后端注册的 command 或已授权的插件。
- 前端权限由 `src-tauri/capabilities/default.json` 控制（漏配权限 = 前端调用被拒）。

---

## 2. 通信方式一览

| 方式 | 触发方 | 方向 | 用途 | 状态 |
|---|---|---|---|---|
| `invoke` 命令 | 前端 | 前端 → 后端 | 一次性请求-响应 | 已用（标题栏初始化） |
| 插件 API | 前端 | 前端 → 后端 | 窗口/存储/打开文件 | 已用（decoration/store/window） |
| 插件 API | 后端 | 后端 → 前端 | 初始化窗口行为 | 已用（overlay titlebar） |
| 全局事件 | 前端 | 前端内部 | 视图/搜索联动 | 已用（kn:navigate、titlebar:search-toggle） |
| 事件监听 | 前端 | 前端 → 后端(可) | 后端主动推送（可选扩展） | 预留 |

---

## 3. Tauri 命令（invoke）

### 3.1 现有命令

#### `init_custom_titlebar`

- 作用：让窗口启用自绘 overlay 标题栏（隐藏原生 caption，由前端画顶栏）。
- 调用处：`src/App.vue` onMounted（应用启动必经）。
- 签名：

```rust
#[tauri::command]
fn init_custom_titlebar(window: WebviewWindow) -> Result<(), String>
```

- 前端调用：

```ts
import { invoke } from '@tauri-apps/api/core'
await invoke('init_custom_titlebar')
```

- 成功后：`<html>` 上会出现 `data-tauri-plugin-decoration-active` 属性（前端 `waitForPluginActive()` 轮询等它），并在 CSS 里注入 `--tauri-plugin-decoration-right-clearance`（右侧 caption 安全区宽度）。
- 错误：返回 `Result<(), String>`，失败时前端打印 `❌ 标题栏初始化失败` 并兜底 `win.show()`。

#### `restore_native_titlebar`

- 作用：回退到系统原生标题栏（插件的逆操作）。
- 签名：`fn restore_native_titlebar(window: WebviewWindow) -> Result<(), String>`
- 当前**未被前端调用**，预留给"切换标题栏"功能（例如设置页开关）。

### 3.2 新增命令的方法（后端开发 checklist）

1. **Rust 侧**（`src-tauri/src/lib.rs`）定义并注册：

```rust
#[tauri::command]
fn my_command(arg: String) -> Result<MyPayload, String> {
    Ok(MyPayload { ok: true })
}

// 在 run() 里：
.invoke_handler(tauri::generate_handler![
    init_custom_titlebar,
    my_command,          // ← 新命令
])
```

2. **权限**：如果命令涉及窗口等敏感操作，在 `capabilities/default.json` 的 `permissions` 里加对应 `core:window:allow-*`（前端是 WebView 侧，**自定义命令本身不需要权限声明**）。

3. **前端调用**：

```ts
import { invoke } from '@tauri-apps/api/core'
const res = await invoke<MyPayload>('my_command', { arg: 'hello' })
```

4. 约定：命令命名小写下划线；参数对象 key 与 Rust 参数名一致（serde 自动转换 camelCase ↔ snake_case 用 `rename_all = "camelCase"` 时注意）；错误统一 `Result<T, String>`。

---

## 4. 插件 API

### 4.1 tauri-plugin-decoration（标题栏）

Rust 侧已封装成命令，前端不用直接 import 插件 API。相关前端依赖：

- 轮询等待属性：`document.documentElement.hasAttribute('data-tauri-plugin-decoration-active')`
- CSS 变量：`var(--tauri-plugin-decoration-right-clearance, 139px)`（顶栏右侧让位宽度，macOS 下由插件写入）
- macOS 交通灯位置：Rust 侧 `set_traffic_lights_inset(16.0, 20.0)`（在 lib.rs 里改）。

### 4.2 tauri-plugin-store（JSON 持久化）— 已在用

前端封装：`src/utils/persist.ts`（所有读写都经过它，调用方不要直接碰插件 API）。

- 文件：`appDataDir/settings.json`，`autoSave: true`（set 即落盘）。
- 使用方法：

```ts
import { load } from '@tauri-apps/plugin-store'
const store = await load('settings.json', { autoSave: true })
await store.get<number>('sidebarWidth')     // 读取
await store.set('sidebarWidth', 320)         // 写入（自动保存）
```

- **settings.json 的数据模型（后端负责读写时的契约）**：

```ts
interface SettingsFile {
  /** 侧边栏宽度（px）。SideBar.vue 拖拽结束/双击复位时写入，启动时读取 */
  sidebarWidth?: number
  /** 最近打开文件列表，新→旧排列，最多 10 条 */
  recentFiles?: RecentFile[]
}

interface RecentFile {
  name: string        // 文件路径/文件名（去重键）
  icon: string        // Icon.vue 图标名（如 'file-text'）
  color?: string      // 图标着色（var(--kn-*) 或任意 CSS 颜色）
  timestamp: number   // 打开时间戳（ms），前端 formatRelativeTime() 渲染相对时间
}
```

### 4.3 tauri-plugin-opener（打开文件/链接）

- 已安装 + 已授权（`opener:default`），**前端尚未使用**。
- 预留给"打开工作区""打开本地文件"：后端提供目录选择/文件读取命令时可用它让系统处理外链。

### 4.4 窗口 API（tauri window）

- 前端直接使用：`getCurrentWindow().show()`（App.vue 启动时显示窗口）。
- 相关权限：`core:window:allow-show` 等（见第 7 节）。

---

## 5. 前端全局事件（内部联动，后端无需实现）

| 事件名 | 派发处 | 监听处 | payload |
|---|---|---|---|
| `kn:navigate` | Home.vue 等页面（`go(target)`） | App.vue `onNavigate` | `detail: string` = 视图 id（见 activityItems） |
| `titlebar:search-toggle` | SearchTrigger.vue（⌘K/Ctrl+K） | Titlebar.vue `onGlobalToggle` | 无 |

---

## 6. 前端数据契约（后端未来要提供的数据结构）

> 这些 TS 类型现在是**硬编码的静态数据**（`src/data/*.ts`）。后端接入真实能力时，用同名结构返回数据即可无缝替换。

### 6.1 文件树 / 侧边栏（`src/component/sidebar/types.ts`）

```ts
interface TreeItem {
  id: string
  label: string              // 文件名/文件夹名
  icon?: string              // Icon.vue 图标名；缺省按 children 推断文件夹/文件
  color?: string             // 图标着色
  meta?: string              // 右侧小字（如 ts / json）
  children?: TreeItem[]      // 有子节点即视为文件夹
  collapsed?: boolean        // 初始折叠
}

interface SideBarSection {
  id: string
  title: string
  icon?: string
  count?: number             // 分组头右侧计数
  items?: TreeItem[]
  collapsible?: boolean      // 默认 true
  collapsed?: boolean        // 默认 false
}

interface SideBarConfig {
  title: string              // 侧边栏顶栏标题（如「资源管理器」）
  sections: SideBarSection[]
}
```

对应数据源：`src/data/sideBarConfig.ts` 的 `sideBarConfig`（按视图 id 分组：home/editor/files/ai/browser/settings/account）。当前 `workspaceTree` 是示例数据——**接 Tauri 文件系统后，这里改成读取真实目录树**。

### 6.2 编辑器文件（`src/data/editorFiles.ts`）

```ts
interface EditorFile {
  id: string          // 文件路径（也是标签 key）
  name: string        // 标签显示名
  language: string    // 状态栏语言名（如 'TypeScript'）
  icon: string        // Icon.vue 图标名
  color?: string      // 标签图标着色
  content: string     // 文件内容（高亮/状态栏/光标定位都吃它）
}
```

- 当前 Editor.vue 打开的是示例文件数组。**接后端后：文件内容从文件系统读取，写入则回写**。
- 建议后端命令：
  - `open_file(path) -> EditorFile`
  - `read_file(path) -> string`
  - `write_file(path, content) -> Result<(), String>`
  - `list_dir(path) -> TreeItem[]`（组织成 6.1 的树）

### 6.3 首页卡片（`src/data/homeCards.ts`）

```ts
interface HomeCard {
  id: string
  title: string
  desc: string
  icon: string
  color: string   // var(--kn-*) 或任意 CSS 颜色
  target: string  // 跳转视图 id
}
```

### 6.4 全局搜索（`src/data/searchItems.ts`）

```ts
interface SearchItem {
  id: string
  title: string
  desc: string
  group: string   // 结果分组：导航/命令/设置
  icon: string
  color: string
}
```

- 建议后端：把"文件/命令/设置"索引聚合到一个搜索命令，返回 `SearchItem[]` 让前端面板直接渲染。

### 6.5 活动栏（`src/data/activityItems.ts`）

```ts
interface ActivityItem {
  id: string      // 视图 id（与 App.vue viewComponents 对应）
  label: string
  icon: string
  badge?: number  // 右上角角标（如 AI 助手的 2）
  position?: 'top' | 'bottom'
}
```

### 6.6 占位页（`src/data/comingSoon.ts`）

```ts
interface ComingSoonConfig {
  title: string; subtitle: string; icon: string
  tint: string    // 图标底色/着色（--tint）
  desc: string
  tags: string[]
}
```

### 6.7 最近打开（`src/utils/persist.ts`）

见 4.2 的 `RecentFile`。当前来源是 editor 标签点击；后端接入真实文件系统后，应改为"打开文件命令"里记录（后端写 store 或前端调 `addRecentFile` 皆可）。

---

## 7. 权限与安全

`src-tauri/capabilities/default.json` 当前授权：

```json
[
  "core:default",
  "opener:default",          // 打开文件/链接
  "decoration:default",      // 自绘标题栏
  "store:default",           // settings.json 读写
  "core:window:allow-close", "core:window:allow-is-fullscreen",
  "core:window:allow-is-maximized", "core:window:allow-minimize",
  "core:window:allow-show",  // 启动显示窗口
  "core:window:allow-start-dragging", "core:window:allow-internal-toggle-maximize",
  "core:window:allow-toggle-maximize"
]
```

CSP（`tauri.conf.json` → `app.security.csp`）：当前 `connect-src` 仅 `ipc: http://ipc.localhost`。**后端若要接远程 API（AI 服务等），必须在这里给对应域名放行，否则请求会被拦。**

---

## 8. 后端开发时的通用约定

1. **命名**：命令小写下划线（如 `list_dir`）；前端 `invoke('list_dir', { path })`。
2. **返回值**：成功返回数据（serde 序列化 JSON）；失败统一 `Err(String)` 给前端 catch。
3. **大文件/流式数据**：编辑器 content 用 string 传；超大文件后续可考虑 tauri 的 channel 或二进制响应。
4. **改 Rust 后**：前端 `invoke` 无需重新构建，改完 `pnpm tauri dev` 自动重编译。
5. **调试**：前端控制台执行 `__TB_DEBUG__.enable()` 可诊断顶栏事件被谁拦截（仅 dev 构建存在）。