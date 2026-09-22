# KazeNest

> Where Clouds Rest · 一个现代化的云原生开发工作台

KazeNest 是一个基于 **Tauri 2 + React 19** 的桌面 IDE 外壳：VS Code 式的界面骨架、自研设计系统、会话级持久化，以及 AI 助手、文件管理、内置浏览器等工作区。

> 当前状态：**前端高保真原型**（数据为演示数据，尚未接入真实文件系统与后端能力）。
> 后端（Rust）规划与接入路线见 [`src-tauri/README.md`](src-tauri/README.md)。

---

## 功能一览

| 模块 | 能力 |
|---|---|
| **编辑器** | 逐行编辑（高亮层 + 透明 textarea 重叠）、语法高亮、括号配对/自动补全、文件级词频补全、Ctrl+F 查找替换、标签页拖拽排序、Ctrl+S 保存标记 |
| **文件管理** | 三空间：**文件夹**（Windows 资源管理器式目录树 + Ctrl/Shift 多选 + 批量添加）、**资料空间**（标签/注释、`#类型 @标签` 叠加搜索、标签多选筛选）、**私有空间**（密码解锁、仅内部搜索、加密标识） |
| **AI 助手** | DeepSeek Harness 风格工作台：思考折叠块、流式打字机、消息复制/重新生成、建议卡片；**右侧常驻面板**（打开后一直存在，进入 AI 视图向左扩展铺满）；会话管理 + 按 token 计费 |
| **浏览器** | 多标签、Edge 式标签组（拖拽合并/折叠/重命名）、地址栏导航、收藏星标与书签栏、模拟网页骨架 |
| **插件市场** | 卡片网格 + 搜索/分类/排序（演示数据）、安装状态与推荐角标；侧栏（已安装 / 推荐 / 分类）与页面共用数据 |
| **设置 / 账户** | 设置页四分区（外观 / 编辑器 / 快捷键 / 关于；**主题切换真实生效**，其余为演示控件）；账户页支持未登录/已登录两种状态预览 |
| **顶栏** | 命令中心搜索（⌘K / Ctrl+K）、视图联动菜单、工作区切换、通知中心、账户菜单；**macOS 使用系统原生菜单栏**，Windows/Linux 内绘菜单并按宽度自动收纳 |
| **设计系统** | 视觉基线 = [Rare UI 官网](https://www.rareui.com/) 的外壳与组件语言（`p-2` 页面框 + `rounded-[45px]` squircle 主面板 + 玻璃胶囊顶栏 + squircle 浮动侧栏）、Inter + Open Runde + JetBrains Mono（本地打包）；配色沿用 KazeNest 原调色板（主橙 `#fc4c01` + `#f4f4f9/#ffffff/#ececf3` 亮、`#171717/#262626/#101010` 暗）；Tailwind 4 + shadcn 语义类桥接 + 自研 UI 基础层 |
| **持久化** | 会话快照：活动视图、侧栏开合与宽度、编辑器标签/内容/未保存标记、AI 会话与用量、文件管理状态、浏览器标签与书签 |
| **平台适配** | Windows / macOS / Linux；macOS 交通灯让位、原生菜单、毛玻璃顶栏 |

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面容器 | Tauri 2（Rust edition 2024） |
| 前端 | React 19 + TypeScript + Vite 6 |
| 样式 | Tailwind CSS 4 + CSS 设计令牌（`--kn-*` / `--tb-*` / `--ed-*` / `--sb-*`） |
| 组件 | Rare UI（shadcn CLI 拉取）+ 自研基础层（shadcn 风格） |
| 状态 | 模块级 store + `useSyncExternalStore`（贴近响应式，代码紧凑） |
| 包管理 | pnpm |
| 后端插件 | `tauri-plugin-decoration`（自绘标题栏）、`tauri-plugin-store`（持久化）、`tauri-plugin-opener` |

## 目录结构

```
KazeNest/
├── src/                        # React 前端
│   ├── main.tsx                # 入口（样式 + 挂载）
│   ├── App.tsx                 # 外壳：标题栏 / 活动栏 / 侧栏 / 内容舞台 / AI 面板
│   ├── pages/                  # 视图页面（Home / Editor / Files / Browser / Marketplace / Settings / Account）
│   ├── component/
│   │   ├── titlebar/           # 顶栏（Titlebar / Chrome / 搜索 / 下拉）
│   │   ├── sidebar/            # 活动栏 / 二级侧栏 / 树 / 各视图侧栏
│   │   ├── editor/             # CodeView / EditorTabs / StatusBar（纯逻辑 assist/highlight）
│   │   ├── files/              # 文件管理（三空间 / 表格 / 详情）
│   │   ├── browser/            # 浏览器（标签栏 / 工具栏 / 视口）
│   │   ├── ai/                 # AI 工作台 / 消息 / 输入条 / 侧栏
│   │   ├── ui/                 # 基础 UI（button/input/dialog/dropdown/fluid-orb）
│   │   └── common/             # Icon / GlassCard / DemoDialog / ComingSoon
│   ├── hooks/                  # useAppSession / useFileManager / useAiChat / useAiPanel ...
│   ├── registry/views.ts       # 视图注册表（页面 + 侧栏 + 菜单，单一来源）
│   ├── data/                   # 演示数据（活动栏 / 首页卡片 / 菜单 / 示例文件）
│   ├── styles/                 # tailwind / tokens / effects
│   └── utils/                  # persist / platform / nativeMenu / demo / fileSearch
├── src-tauri/                  # Rust 后端（目录骨架 + 说明文档）
│   ├── README.md               # 后端说明（架构/协议/权限/路线图/AI 维护约定）
│   └── GETTING-STARTED.md      # 后端入门教程（TS → Rust 迁移、实战课）
├── scripts/
│   └── add-rare-ui.mjs         # Rare UI 组件拉取（走 GitHub API，绕过 raw 域名限制）
└── components.json             # shadcn 配置（Rare UI 组件落点）
```

## 快速开始

**环境要求**

- Node.js 20+ 与 pnpm
- Rust 工具链（stable）
- 平台系统依赖：Windows（VS Build Tools + WebView2）、macOS（Xcode CLT）、Linux（webkit2gtk 等）
  → 完整清单见 [`src-tauri/README.md` 第 12 节](src-tauri/README.md#12-开发环境与工作流)

```bash
# 安装依赖
pnpm install

# 开发（前端 + Tauri 窗口）
pnpm tauri dev

# 生产构建（tsc 类型检查 + vite 构建 + 打包）
pnpm build
pnpm tauri build
```

**仅在浏览器里调前端**（无 Tauri 能力，持久化自动降级为内存）：

```bash
pnpm dev   # http://localhost:1420
```

## 分支说明

| 分支 | 内容 |
|---|---|
| `master` | Vue 3 版历史实现（功能完整，作为参考保留） |
| `react-rewrite` | **当前开发线**：React 19 全量重写（45 个 tsx / 约 6.8k 行），已移除 Vue 与 PrimeVue 依赖 |

## Rare UI 组件

```bash
# 拉取组件（写入 src/component/ui/，自动去掉 use client）
node scripts/add-rare-ui.mjs fluid-orb
node scripts/add-rare-ui.mjs folder-component
```

注册表组件已全部接入（21/21，`utils` 由本项目 `@/lib/utils` 提供）：

| 组件 | 落点 |
|---|---|
| `fluid-orb` | 首页欢迎区 / AI 空态的流体球装饰背景 |
| `gravity-letters` | 首页「点按掉落字母」互动条 |
| `animated-counter` | 首页统计数字滚动 |
| `gooey-nav` | 首页「快速开始 / 最近打开」果冻滑动导航（滚动定位） |
| `scroll-progress` | 内容区滚动进度条（全局，跟随主滚动容器） |
| `notification-bell` | 顶栏通知铃（未读徽标 + 摇铃动画） |
| `task-list` | AI 思考过程的步骤清单（打勾 + 划线动画） |
| `emoji-reaction` | AI 消息操作区表情反馈（已本地化表情字形，离线可用） |
| `folder-component` | 文件管理「打开文件夹」空态的可开合文件夹动画 |
| `delete-button` | 文件详情「危险操作」删除按钮（二次确认 + 删除动画） |
| `hook-sidebar` | 文件管理左侧「快捷视图」导航轨 |
| `bounce-sidebar` | 设置页左侧分区导航（弹性滑动 + 圆点） |
| `otp-input` | 设置页「Rare 组件演示」两步验证码输入 |
| `duration-picker` | 设置页「Rare 组件演示」AI 最长思考时长（时/分滚轮） |
| `code-block` | 设置页「Rare 组件演示」代码块（Prism 高亮 + 复制） |
| `proximity-sidebar` | 插件市场左侧贴近式分区导航（随滚动高亮） |
| `step-player` | 插件市场「安装流程」自动播放步骤条 |
| `github-activity` | 账户页「已登录」贡献热力图（演示数据） |
| `matrix-orb` | 账户页同步状态球 |
| `grid-reveal` | 账户页工作区封面揭示（data URI 封面，滚动触发） |
| `family-drawer` | 账户页家庭钱包恢复抽屉（vaul 抽屉，多视图切换） |

Dialog 与 Dropdown 的进出场也已改由 Motion 弹簧驱动（尊重 `prefers-reduced-motion`）。

整个界面已按官方仓库的官网外壳与组件语言重做，**配色沿用 KazeNest 原调色板**：

- **主题色**：主橙 `#fc4c01`；亮色 底 `#f4f4f9` / 卡片 `#ffffff` / 框 `#ececf3`；
  暗色 底 `#171717` / 卡片 `#262626` / 框 `#101010`；弱文字 `#868593`；
  状态色 iOS 体系；选中 = 橙底 10% + 橙字
- **外壳**：官网 `DesktopShell` 同款 —— `p-2` 页面框（`--kn-frame-pad`）、
  `rounded-[45px]` squircle 主面板（`--kn-shell-radius`，bg = card）、
  独立 squircle 浮动侧栏（radius 23）、透明拖拽顶栏 + 玻璃胶囊控件（`--kn-glass-*`）
- **导航**：官网 `SidebarNav` 语言 —— 选中项橙色虚线导航轨、分组标题 11px 大写 `tracking-[0.14em]`、
  活动栏选中 = 橙字 + 橙底
- **字体**：Inter（UI 正文）/ Open Runde（展示标题）/ JetBrains Mono（代码），
  文件在 `src/assets/fonts/`，声明见 `src/styles/fonts.css`，离线可用
- **组件语言**：编辑器/文件管理标签 = 胶囊（选中白底 + 玻璃内高光），主按钮 = 官网 primary（黑/白），
  Rare 组件 shadcn 语义类（`bg-background` 等）在 `src/styles/tailwind.css` 的
  `@theme inline` 桥接到 `--kn-*`，亮暗主题即时生效

组件清单见 [rareui.com/components](https://www.rareui.com/components)。为适配 Vite/Tauri 已做的最小改动：`gooey-nav` / `bounce-sidebar` / `hook-sidebar` 剥离 Next.js 依赖（Link/usePathname → 受控值），`emoji-reaction` 改用本地表情字形（离线可用、不受 CSP 限制），`code-block` 改用自有 `Icon`（去掉 lucide-react）。依赖新增：`motion`、`vaul`、`react-use-measure`、`figma-squircle`、`flubber`、`prism-react-renderer`（类型声明见 `src/types/flubber.d.ts`）。

## 路线图

| 阶段 | 内容 |
|---|---|
| 已完成 | React 全量迁移、设计系统、会话持久化、macOS 顶栏与原生菜单 |
| v0.3 | 后端真实文件系统（打开文件夹 / 读写 / 回收站 / 私有空间加密 / SQLite 元数据） |
| v0.4 | AI 真实接入（DeepSeek 流式、上下文引用、工具调用、真实计费） |
| v0.5 | 命令面板、设置页落地、更新器、内置浏览器（Tauri WebView） |

后端接入步骤与约定详见 [`src-tauri/README.md`](src-tauri/README.md)。

## 开发约定

- 注释与文档一律中文；组件目录随视图划分，样式与类名统一命名
- 视图的完整定义在 `src/registry/views.ts`（页面 / 侧栏 / 顶栏菜单一处配置）
- 提交粒度：一个功能点一个提交，提交信息说明动机与影响面
- React hooks 只能在组件或自定义 Hook 内调用（模块顶层禁止）；跨模块共享状态用 `lib/store` 或无 hooks API（如 `appSession`）
- 后端目录的 AI 维护约定（识别问题 / 加注释 / 维护文档，不擅自改实现）见 `src-tauri/README.md` 顶部

## 致谢

- [Tauri](https://tauri.app/) · [React](https://react.dev/) · [Vite](https://vite.dev/) · [Tailwind CSS](https://tailwindcss.com/)
- [Rare UI](https://www.rareui.com/)（Fluid Orb 等动画组件）· [shadcn](https://ui.shadcn.com/)（组件注册表规范）

## 许可

尚未添加开源许可证文件；如需开源建议补充 MIT。
