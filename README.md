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
| **设计系统** | 设计令牌（tokens）+ Tailwind 4 + [Rare UI](https://www.rareui.com/)（shadcn 注册表，按需拉取）+ 自研 UI 基础层（button/input/dialog/dropdown 等） |
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

已接入并使用：

| 组件 | 落点 |
|---|---|
| `fluid-orb` | 首页欢迎区 / AI 空态的流体球装饰背景 |
| `gravity-letters` | 首页「点按掉落字母」互动条 |
| `animated-counter` | 首页统计数字滚动 |
| `folder-component` | 文件管理「打开文件夹」空态的可开合文件夹动画 |
| `scroll-progress` | 内容区顶部滚动进度条（全局） |
| `notification-bell` | 顶栏通知铃（未读徽标 + 摇铃动画） |
| `gooey-nav` | 首页「快速开始 / 最近打开」果冻滑动导航（点击滚动定位） |
| `task-list` | AI 思考过程里的步骤清单（完成打勾 + 划线动画） |
| `emoji-reaction` | AI 消息操作区的表情反馈（弹出 + 粒子爆发；已本地化表情字形） |

Dialog 与 Dropdown 的进出场也已改由 Motion 弹簧驱动（尊重 `prefers-reduced-motion`）。

全局调色板已对齐 Rare UI 原生：主橙 `#FC4C01`、中性面 `#F4F4F9`（亮）/ `#262626`（暗）、
弱文字 `#868593`、状态色用 iOS 体系（`#FF3B30` / `#FF9500` / `#34C759` / `#50B1FD` / `#BF5AF2`）。
Rare 组件的 shadcn 语义类（`bg-background` / `text-foreground` / `border-border` / `ring-ring`）
在 `src/styles/tailwind.css` 的 `@theme inline` 里桥接到 `--kn-*` token，亮暗主题即时生效。

组件清单见 [rareui.com/components](https://www.rareui.com/components)。`gooey-nav` 已剥离 Next.js 依赖，`emoji-reaction` 已改本地表情字形（离线可用、不受 CSP 限制）。

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
