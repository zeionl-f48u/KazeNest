# KazeNest 后端说明（src-tauri）

> 适用范围：`src-tauri/` 下的全部 Rust 代码、配置、权限与构建脚本
> 读者：本项目开发者（含未来的自己）
> 状态：**架构规划完成，业务实现未开始**（除窗口装饰与插件注册外，均为注释骨架）

---

## AI 维护约定（提示词）

> 本段是**给 AI 助手的工作提示词**：任何模型在本仓库 `src-tauri/` 下阅读、生成或修改内容时，必须先遵守以下约定；人类开发者同样适用。

**角色与目标**

- 你是 KazeNest（Tauri 2 + Vue 3 桌面应用）的后端维护者。
- 当前阶段：后端为**注释骨架**（除窗口装饰与插件注册外无业务实现）。不要擅自启用 `mod`、不要擅自实现业务逻辑，除非任务明确要求。
- 一切设计以本 README 为准；本文件与骨架注释冲突时，先修正文档再改代码，并说明依据。

**硬性规则（不可违背）**

1. **分层**：`commands` 只做参数校验与转发，业务实现写 `core`；`core` 不得依赖 `tauri::`（保证可单测）。
2. **错误**：命令一律返回 `Result<T, AppError>`；禁止 `unwrap`/`expect`（测试与启动期不可恢复场景除外）。
3. **安全红线**：密钥与明文不落盘、不进日志、不回传前端；所有路径必须过 `core::paths::ensure_in_scope`；删除走系统回收站且要求 `confirmed: true`。
4. **契约同步**：DTO 字段一律 camelCase（serde），与前端 TS 类型逐字段对应；改名字段必须同时改两侧与本文档。
5. **平台差异收敛**：只允许出现在 `lib.rs`（标题栏/交通灯）、`commands::dialog` 与 `core::paths` 三处；不得散落其他模块。
6. **权限最小化**：新增 API 时同步更新 `capabilities/default.json`；能用 Rust 转发（reqwest）就不放开前端 CSP 网络白名单。

**修改流程（每次改动）**

1. 先读本文件对应章节与目标文件的骨架注释，再动手；
2. 若任务要求实现某领域：填充骨架 → 启用 `mod` 声明 → 登记 `invoke_handler` → 补 `Cargo.toml` 依赖 → 补 capabilities 权限 → 更新前端调用点；
3. 同步更新本文档（涉及即改）：目录结构、命令总表、事件总表、权限表、依赖规划表；
4. 运行校验并通过：`cargo fmt` / `cargo clippy -- -D warnings` / `cargo test`（环境受限无法运行时，必须在回复中明确说明）；
5. 提交信息用中文，写清动机与影响面；一个领域一个提交，圈定改动范围，不夹带无关改动。

**风格约定**

- 代码注释与文档一律中文；模块头保持"职责 / 计划实现 / 依赖 / 安全注意"四段式。
- 文档章节编号不得打乱；新增章节需同步更新顶部目录链接。
- 不写 emoji；不把大段实现代码复制进文档（用函数签名、流程与数据结构描述）。
- 表格保持 Markdown 对齐风格；状态列用"已实现 / 规划 / 预留"三种表述。

> 违反硬性规则（尤其第 1、3 条）视为无效改动，必须返工。

---

## 目录

1. [概览](#1-概览)
2. [技术栈与版本](#2-技术栈与版本)
3. [当前状态](#3-当前状态)
4. [目录结构](#4-目录结构)
5. [分层架构](#5-分层架构)
6. [领域设计](#6-领域设计)
   - [6.1 文件系统（fs）](#61-文件系统fs)
   - [6.2 系统对话框（dialog）](#62-系统对话框dialog)
   - [6.3 私有空间加密（vault）](#63-私有空间加密vault)
   - [6.4 AI 接入（ai）](#64-ai-接入ai)
   - [6.5 设置（settings）](#65-设置settings)
7. [错误处理](#7-错误处理)
8. [全局状态](#8-全局状态)
9. [前后端协议](#9-前后端协议)
10. [权限与安全](#10-权限与安全)
11. [依赖规划](#11-依赖规划)
12. [开发环境与工作流](#12-开发环境与工作流)
13. [测试策略](#13-测试策略)
14. [接入路线图](#14-接入路线图)
15. [编码规范](#15-编码规范)
16. [常见问题与坑](#16-常见问题与坑)

---

## 1. 概览

KazeNest 是 Tauri 2 桌面应用：前端（Vue 3）负责全部界面与交互，Rust 后端负责**前端做不到或不该做的事**。

后端职责边界：

| 职责 | 说明 | 对应前端接入点 |
|---|---|---|
| 窗口与标题栏 | 自绘标题栏 overlay、窗口控制 | `useAppBoot`、`component/titlebar` |
| 本地文件系统 | 打开文件夹、读写文件、回收站删除、文件监听 | `component/files`、`useFileManager`、`pages/Editor.vue` |
| 系统对话框 | 选择文件夹/文件、确认框 | 文件管理"打开文件夹"按钮 |
| 私有空间加密 | Argon2id 派生 + AES-256-GCM 加密存储 | `pages/Files.vue` 私有空间 |
| AI 请求 | DeepSeek（OpenAI 兼容）流式转发、密钥保管 | `composables/useAiChat.ts` |
| 持久化 | 设置/会话快照（store）、未来 SQLite 元数据 | `utils/persist.ts`、`useAppSession` |
| 菜单与系统集成 | macOS 原生菜单、系统文件管理器定位 | `utils/nativeMenu.ts` |

设计原则：

1. **薄命令层**：`commands::xxx` 只做参数校验与转发，业务逻辑全部在 `core::xxx`（可脱离 Tauri 单测）。
2. **错误结构化**：所有命令返回 `Result<T, AppError>`；前端拿到 `{ code, message }`，不放裸字符串堆栈。
3. **安全默认**：路径必须过作用域校验；删除进回收站；密钥不落盘、不进日志。
4. **平台分支显式**：macOS/Windows/Linux 差异集中在少数几个文件（标题栏、对话框、路径），不散落各处。
5. **前端契约稳定**：DTO 字段与前端 TS 类型一一对应（camelCase），改名必须同步两侧。

---

## 2. 技术栈与版本

| 项 | 值 | 说明 |
|---|---|---|
| Rust edition | **2024** | `Cargo.toml` 已配置；需要 Rust 1.85+ |
| Tauri | **2.x** | 核心框架 |
| tauri-plugin-decoration | **2.1.4** | 自绘标题栏 overlay（原生拖拽与 caption 按钮） |
| tauri-plugin-opener | 2 | 打开外部链接/文件管理器定位 |
| tauri-plugin-store | 2 | settings.json 键值持久化 |
| serde / serde_json | 1 | DTO 序列化 |
| 构建产物 | `lib`（staticlib/cdylib/rlib）+ `main` bin | lib 名为 `kazenest_lib`（Windows 兼容） |

> 前端配套版本：Vue 3.5 / Vite 6 / vue-tsc 3 / pnpm。前后端通过 Tauri IPC 通信。

---

## 3. 当前状态

**已实现（真实代码）**

- `lib.rs`：
  - `init_custom_titlebar` 命令：初始化 overlay 标题栏；macOS 设置交通灯 inset `(16, 13)`
  - `restore_native_titlebar` 命令：回退系统标题栏（预留）
  - 插件注册：`decoration`、`store`
- `main.rs`：释放模式隐藏 Windows 控制台窗口
- `capabilities/default.json`：主窗口权限（含 `core:menu:default`，供 macOS 原生菜单）

**已规划（仅注释骨架，未启用 `mod`）**

- `commands/`、`core/`、`models/`、`error.rs`、`state.rs`（详见目录结构）

**明确未做**

- 文件系统真实读写、系统对话框、私有空间加密、AI 网络请求、SQLite 元数据、文件监听

---

## 4. 目录结构

```
src-tauri/
├── Cargo.toml               依赖与产物配置（lib + bin）
├── build.rs                 tauri_build::build()
├── tauri.conf.json          窗口/构建/CSP/bundle 配置（纯 JSON，不能写注释）
├── capabilities/
│   └── default.json         主窗口权限清单（改这里控制可调用的 API）
└── src/
    ├── main.rs              进程入口（release 下无控制台）
    ├── lib.rs               Builder：插件、invoke_handler、两条已有命令
    ├── error.rs             [骨架] AppError：统一错误枚举 + 序列化 + 错误码
    ├── state.rs             [骨架] AppState：作用域 / 密钥 / AI 取消令牌 / 监听 / SQLite
    ├── commands/            [骨架] 命令层（前端 invoke 入口，薄封装）
    │   ├── mod.rs           分层约定与接入步骤
    │   ├── fs.rs            文件系统命令集
    │   ├── dialog.rs        系统对话框命令集
    │   ├── vault.rs         私有空间命令集
    │   ├── ai.rs            AI 流式对话命令集
    │   └── settings.rs      设置读写命令集
    ├── core/                [骨架] 核心层（无 Tauri 依赖，可单测）
    │   ├── mod.rs           分层意义与子模块索引
    │   ├── crypto.rs        Argon2id + AES-256-GCM + 密钥清零
    │   ├── paths.rs         路径规范化/作用域校验/类型判定
    │   ├── fs_watch.rs      notify 封装（外部修改感知 + 防抖）
    │   └── ai_client.rs     OpenAI 兼容客户端 + SSE 解析 + 超时取消
    └── models/              [骨架] 数据模型（serde DTO）
        ├── mod.rs           命名约定与前端类型对齐说明
        ├── fs.rs            FileEntryDto / DirListingDto / SearchQueryDto
        ├── ai.rs            ChatRequestDto / 事件负载 / UsageDto / ModelDto
        └── vault.rs         VaultStatusDto / VaultEntryDto / VaultMeta 布局
```

> 标注 `[骨架]` 的文件目前只有文档注释，**未通过 `mod` 引入**，不影响编译。
> 接入某个领域时：在 `lib.rs` 启用对应 `mod`，在层内 `mod.rs` 启用 `pub mod xxx;`。

---

## 5. 分层架构

```
┌────────────────────────── 前端（Vue） ──────────────────────────┐
│  invoke('fs_list_dir', args)                listen('ai:delta')  │
└───────────────┬──────────────────────────────────▲──────────────┘
                │ IPC（JSON，camelCase 参数）        │ 事件（JSON）
┌───────────────▼──────────────────────────────────┴──────────────┐
│ commands/*     薄封装：参数校验 → 调 core → 返回 DTO / 发事件     │
├─────────────────────────────────────────────────────────────────┤
│ core/*         业务实现：文件/加密/网络/监听（不依赖 tauri::）      │
├─────────────────────────────────────────────────────────────────┤
│ models/*       serde DTO（与前端 TS 类型逐字段对齐）               │
├─────────────────────────────────────────────────────────────────┤
│ error / state  统一错误 + 会话级共享状态                          │
└─────────────────────────────────────────────────────────────────┘
```

各层约束：

| 层 | 允许 | 禁止 |
|---|---|---|
| commands | `tauri::State`、事件发送、调用 core、构造 DTO | 直接 `std::fs`、网络、密码学细节、业务分支 |
| core | 纯 Rust、第三方库（reqwest/argon2/notify…） | `tauri::` 类型（除少量数据）、`AppHandle`（用回调/通道解耦） |
| models | 结构定义、serde 标注 | 业务方法 |
| error | `thiserror`、`From` 转换 | 泄露绝对路径/密钥/URL 中的敏感参数 |

调用链示例（打开文件夹）：

```
前端点击"打开文件夹"
 → invoke('dialog_pick_folder')            commands::dialog
 → core::paths::ensure_in_scope(选择结果)  core::paths
 → AppState.scopes 写入                    state
 → 返回路径；前端再 invoke('fs_list_dir')   commands::fs
 → core::paths 校验 + std::fs 读取          core::paths / std::fs
 → Vec<FileEntryDto> 返回前端渲染
```

---

## 6. 领域设计

### 6.1 文件系统（fs）

**命令清单（计划）**

| 命令 | 参数 | 返回 | 备注 |
|---|---|---|---|
| `fs_list_dir` | `path: string` | `DirListingDto` | 目录在前，按名称排序；>5000 条截断并标 `truncated` |
| `fs_read_text` | `path: string` | `string` | 上限 5 MB；二进制探测拒绝 |
| `fs_write_text` | `path, content` | `()` | 临时文件 + 原子 rename |
| `fs_create_dir` | `parent, name` | `FileEntryDto` | 名称合法性校验 |
| `fs_create_file` | `parent, name` | `FileEntryDto` | |
| `fs_rename` | `path, newName` | `FileEntryDto` | 同目录改名 |
| `fs_delete` | `paths: string[], confirmed` | `()` | 进回收站；`confirmed` 必须为 true |
| `fs_reveal` | `path` | `()` | 系统文件管理器定位 |
| `fs_search` | `SearchQueryDto` | `FileEntryDto[]` | v1 仅名称匹配 |

**DTO 契约**：见 `models/fs.rs` 注释（`FileKind` 与前端 `KIND_META` 对齐）。

**安全策略清单**

- [ ] 所有路径过 `core::paths::ensure_in_scope`（规范化 → canonicalize → 校验父链）
- [ ] 符号链接不跟随（`fs::symlink_metadata` 判定，拒绝链接指向作用域外）
- [ ] 拒绝系统保留路径（Windows `C:\Windows`；macOS `/System`；Linux `/proc`、`/sys`）
- [ ] 写操作原子化：`file.tmp` → `fs::rename`
- [ ] 删除必须 `confirmed: true`（前端二次确认调用 `dialog_message`）
- [ ] 文本读取大小上限与编码处理（UTF-8 优先；BOM 处理；失败给结构化错误）
- [ ] 错误信息脱敏（不把完整磁盘路径透给前端日志）

**文件监听（core::fs_watch）**

- 编辑器标签：监听已打开文件，`Modified` 事件 → 前端提示重载
- 文件夹视图：监听当前目录（可选开启），`Created/Removed/Renamed` → 刷新列表
- 事件防抖 300 ms（编辑器保存会产生多次事件）；macOS FSEvents 目录级粒度需注意
- 监听句柄存 `AppState.watchers`，关闭标签/离开目录时移除

### 6.2 系统对话框（dialog）

| 命令 | 用途 |
|---|---|
| `dialog_pick_folder` | "文件夹"视图的"打开文件夹" |
| `dialog_pick_files` | 导入到资料空间/私有空间（多格式过滤器） |
| `dialog_save_file` | 另存为/导出 |
| `dialog_message` | 危险操作确认（删除/覆盖/改密码） |

实现建议：优先 `tauri-plugin-dialog`；对话框必须由 Rust 侧发起（macOS 焦点问题）；确认框按钮顺序遵循平台惯例。

### 6.3 私有空间加密（vault）

**威胁模型（v1）**

| 防 | 不防 |
|---|---|
| 磁盘被复制后文件被读取 | 已解锁会话期间的内存读取 |
| 暴力破解（Argon2id + 退避） | 键盘记录器/屏幕截图 |
| 单文件损坏影响其他文件（分块 + 独立 nonce） | 物理内存取证 |

**密钥体系**

```
密码 password
   │  Argon2id(memory=64MiB, iterations=3, parallelism=1, salt=32B 随机)
   ▼
KEK（32B，仅内存）
   │  AES-256-GCM 封装
   ▼
DEK（32B 随机主数据密钥） ──> 加密所有文件内容
```

- 改密码 = 重新封装 DEK（大文件不重加密）
- KEK/DEK 全部用 `Zeroizing<[u8; 32]>`，锁定时清零
- 校验：`verify = AES-GCM(KEK, 固定字符串)`，解锁时比对（不区分"密码错/数据坏"）

**加密文件格式（blobs/<id>.enc）**

```
┌─────────────── 文件头（明文，定长）───────────────┐
│ magic "KZEN1" (5B) │ version u16 │ chunkSize u32 │
├─────────────── 分块循环 ──────────────────────────┤
│ nonce (12B = 4B 随机前缀 + 8B 块序号)             │
│ ciphertext (chunkSize)                            │
│ tag (16B)                                         │
└──────────────────────────────────────────────────┘
```

- 64 KB 分块流式处理（大文件不整读进内存）
- nonce 严禁复用：随机前缀 + 单调块序号；加密前断言
- 头部版本号用于未来算法升级（v2 可换 XChaCha20 等）

**存储布局**

```
appDataDir/vault/
├── vault.meta        版本/KDF 参数/salt/wrappedDek/verify（JSON）
├── index.db          条目索引 SQLite：id、name、kind、size、tags、note、时间
└── blobs/<uuid>.enc  加密内容
```

**API 流程（解锁）**

```
vault_unlock(password)
 → 读 vault.meta（不存在 → VAULT_NOT_INITIALIZED）
 → 检查退避计数（AppState 内存；5 次失败后 1s→2s→4s… 上限 30s）
 → Argon2id 派生 KEK（约 0.5~1s，故意慢）
 → 解 verify 比对
    ├─ 失败：计数 +1，返回 VAULT_AUTH（无详细信息）
    └─ 成功：DEK 解出 → AppState.vault_key = Some(DEK)，计数清零
```

**安全红线**

1. 明文密钥绝不落盘、绝不进日志、绝不序列化回前端
2. `vault_lock` 与进程退出必须清零（`Zeroizing` + 显式 drop）
3. 私有空间文件不进入全局搜索索引、不被文件监听覆盖
4. 备份策略（v0.3 定）：`vault.meta` 与 `index.db` 可安全备份；`blobs/` 依赖 DEK

### 6.4 AI 接入（ai）

**目标服务**：DeepSeek `https://api.deepseek.com`（OpenAI 兼容）；`baseUrl` 可配置以支持中转/自建/Ollama。

**请求流程**

```
ai_chat(ChatRequestDto)
 → 校验 Key / 组装 messages（含 work 系统提示词模板 + context 引用内容）
 → 生成 requestId → AppState.ai_requests 登记 CancellationToken
 → tokio::spawn：
     reqwest POST /v1/chat/completions (stream=true)
     逐行解析 SSE：
       data: {"choices":[{"delta":{"content":"…"}}]}         → emit "ai:delta"
       data: {"choices":[{"delta":{"reasoning_content":"…"}}]}→ emit "ai:reasoning"
       data: {"usage":{…}}                                    → 暂存
       data: [DONE]                                           → emit "ai:done"
     出错 → emit "ai:error"（脱敏）
     finish：从 ai_requests 移除
ai_cancel(requestId) → cancel token → 请求被 drop → emit "ai:done"(cancelled)
```

**事件协议**

| 事件 | 负载 | 前端处理 |
|---|---|---|
| `ai:delta` | `{ requestId, text }` | 追加正文（打字机） |
| `ai:reasoning` | `{ requestId, text }` | 追加思考块 |
| `ai:tool` | `{ requestId, name, argsJson }` | 工具调用卡片（预留） |
| `ai:done` | `{ requestId, usage }` | 结束流式、更新计费 |
| `ai:error` | `{ requestId, message }` | 错误提示 + 停止态 |

**超时与重试**

| 阶段 | 超时 |
|---|---|
| 连接 | 10 s |
| 首字节 | 30 s |
| 整体 | 120 s |

- 429 / 5xx：指数退避重试 1 次；4xx：直接失败（附脱敏信息）
- 日志只记录：requestId、模型、耗时、token 用量；**不记录** Authorization 与消息正文

**Key 管理**

- v1：`tauri-plugin-store` 存储（明文）；文档明示风险
- v2：系统 Keyring（`keyring` crate）或 `core::crypto` 加密后落盘
- 设置页提供"测试连接"（`ai_test_key` → GET /v1/models）

**上下文引用（落地 @当前文件/@选中代码）**

- 前端把引用内容经 `ChatRequestDto.context` 传入（不通过后端读文件，避免额外权限面）
- 后端只做长度裁剪与 token 预估（上限约 32k tokens，超出截断并标注）

### 6.5 设置（settings）

- 现网已用 `utils/persist.ts` 直连 store（侧栏宽度、会话快照）——保持
- `commands::settings` 面向"需 Rust 参与"的场景：加密 Key、参数校验、未来 SQLite 兼容层
- key 命名空间：`ai.apiKey` / `ui.theme` / `editor.fontSize` …
- 写失败必须回错（前端提示"未保存"），不静默吞

---

## 7. 错误处理

**枚举（error.rs）**：`PathOutOfScope` / `NotFound` / `PermissionDenied` / `TooLarge` / `NotText` / `Conflict` / `VaultLocked` / `VaultAuth` / `Ai` / `Network` / `Cancelled` / `Internal`。

**序列化格式**

```json
{ "code": "VAULT_LOCKED", "message": "私有空间未解锁" }
```

- `code`：前端分支依据（如 `VAULT_LOCKED` → 弹解锁画面）
- `message`：直接展示的脱敏文案

**映射规则**

| 底层错误 | 映射 |
|---|---|
| `io::ErrorKind::NotFound` | `NotFound` |
| `io::ErrorKind::PermissionDenied` | `PermissionDenied` |
| `reqwest::Error::is_timeout` | `Network("请求超时")` |
| 其他 io/未知 | `Internal`（详情进 `log::error!`，不回传） |

---

## 8. 全局状态

`AppState`（`tauri::Builder::manage` 注入）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `scopes` | `RwLock<Vec<PathBuf>>` | 已打开文件夹的允许作用域 |
| `vault_key` | `RwLock<Option<Zeroizing<[u8; 32]>>>` | 解锁后的 DEK（仅内存） |
| `ai_requests` | `Mutex<HashMap<String, CancellationToken>>` | 进行中的 AI 请求 |
| `watchers` | `Mutex<HashMap<PathBuf, RecommendedWatcher>>` | 文件监听句柄 |
| `db` | `Mutex<Option<Connection>>` | SQLite 元数据连接 |

并发注意：

- 全部字段需 `Send + Sync`；持锁期间不做 IO（取值→放锁→操作）
- 锁用标准库 `RwLock/Mutex`（命令在 Tauri 线程池执行，无需 async 锁）
- `scopes` 的恢复：应用启动后由前端会话快照回传（`app_scopes_restore` 命令，规划中）

---

## 9. 前后端协议

**命令命名**：Rust `fn fs_list_dir` → 前端 `invoke('fs_list_dir')`；参数 camelCase（`newName` → Rust `new_name`）。

**事件命名**：`域:动作`（`ai:delta`、`fs:changed`）；负载首字段为关联 id。

**命令总表（规划）**

| 命令 | 领域 | 前端调用点 | 状态 |
|---|---|---|---|
| `init_custom_titlebar` | 窗口 | `useAppBoot` | 已实现 |
| `restore_native_titlebar` | 窗口 | 未接线 | 已实现（预留） |
| `fs_list_dir` / `fs_read_text` / `fs_write_text` / `fs_create_dir` / `fs_create_file` / `fs_rename` / `fs_delete` / `fs_reveal` / `fs_search` | 文件 | `component/files`、`Editor.vue` | 规划 |
| `dialog_pick_folder` / `dialog_pick_files` / `dialog_save_file` / `dialog_message` | 对话框 | `Files.vue`、危险操作 | 规划 |
| `vault_status` / `vault_init` / `vault_unlock` / `vault_lock` / `vault_import` / `vault_list` / `vault_export` / `vault_delete` / `vault_change_password` | 私有空间 | `Files.vue` | 规划 |
| `ai_chat` / `ai_cancel` / `ai_test_key` / `ai_list_models` | AI | `useAiChat` | 规划 |
| `settings_get` / `settings_set` / `settings_all` / `settings_reset` | 设置 | 设置页 | 规划 |

**事件总表（规划）**

| 事件 | 触发 | 负载 |
|---|---|---|
| `ai:delta` / `ai:reasoning` / `ai:tool` / `ai:done` / `ai:error` | AI 流式 | 见 6.4 |
| `fs:changed` | 文件监听 | `{ path, kind: created/modified/removed/renamed }` |
| `fs:progress` | 大文件复制/加密进度 | `{ taskId, done, total }` |

---

## 10. 权限与安全

**capabilities/default.json（现状）**

```json
[
  "core:default", "core:menu:default",
  "opener:default", "decoration:default", "store:default",
  "core:window:allow-close", "core:window:allow-is-fullscreen",
  "core:window:allow-is-maximized", "core:window:allow-minimize",
  "core:window:allow-show", "core:window:allow-start-dragging",
  "core:window:allow-internal-toggle-maximize", "core:window:allow-toggle-maximize"
]
```

**计划新增**

| 权限 | 用途 |
|---|---|
| `core:event:default` | 已含于 core:default；事件 listen/emit |
| `dialog:default`（或 `dialog:allow-open/save/message`） | 系统对话框 |
| `fs:*`（若用 `tauri-plugin-fs`） | 文件读写；建议用自定义命令 + std::fs 替代，减少权限面 |
| `http:*` 或不用 | **推荐 Rust reqwest 转发**：前端 CSP 无需放开网络白名单 |

**CSP（tauri.conf.json）**

- 现状 `connect-src` 仅 `ipc:` —— AI/HTTP 若走前端 fetch 必须加白名单；**走 Rust reqwest 则保持最小 CSP**
- `style-src` 已为 decoration 插件放行；新增样式来源需同步
- `withGlobalTauri: true`（前端可直接用 `window.__TAURI__`）——保持

**密钥与敏感数据**

- 不进日志、不进错误 message、不进前端持久化（v1 例外：AI Key 暂存 store，文档标注）

---

## 11. 依赖规划

**现有（Cargo.toml）**

| crate | 用途 |
|---|---|
| `tauri` 2 | 核心 |
| `tauri-plugin-opener` 2 | 外部打开/定位 |
| `tauri-plugin-decoration` 2.1.4 | 自绘标题栏 |
| `tauri-plugin-store` 2 | 键值持久化 |
| `serde` / `serde_json` | 序列化 |

**计划新增**

| crate | 版本建议 | 用途 | 备注 |
|---|---|---|---|
| `thiserror` | 2 | AppError | |
| `tokio-util` | 0.7 | CancellationToken | tauri 已带 tokio |
| `reqwest` | 0.12 | AI HTTP | **features = ["json","stream","rustls-tls"]**，避免系统 OpenSSL |
| `futures` | 0.3 | SSE 流处理 | |
| `argon2` | 0.5 | 密钥派生 | `password-hash` feature |
| `aes-gcm` | 0.10 | 内容加密 | |
| `rand` / `getrandom` | 0.8 | 随机盐/nonce | |
| `zeroize` | 1 | 密钥清零 | `Zeroizing` |
| `notify` | 6 | 文件监听 | |
| `rusqlite` | 0.31 | 元数据 SQLite | `bundled` feature（免系统库） |
| `trash` | 3 | 回收站删除 | |
| `walkdir` | 2 | 递归遍历 | |
| `base64` | 0.22 | 元数据编码 | |
| `log` + `tauri-plugin-log` | 2（插件） | 日志 | 发布版落文件 |

体积/编译时间注意：`reqwest + rustls` 与 `rusqlite bundled` 会明显增加首次编译时间，按领域分步引入。

---

## 12. 开发环境与工作流

**系统依赖**

| 平台 | 需要 |
|---|---|
| Windows | VS Build Tools（C++ 工作负载）、WebView2 Runtime（Win11 自带）、Rust MSVC toolchain |
| macOS | Xcode Command Line Tools（`xcode-select --install`） |
| Linux (Debian/Ubuntu) | `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev` |
| Linux (Arch) | `webkit2gtk-4.1 base-devel curl wget file openssl libayatana-appindicator librsvg` |

> 常见坑：WSL 里直接编译会因缺 `pkg-config`/`libdbus-1-dev` 失败（本项目历史上遇到过）；请在 Windows 侧或完整桌面 Linux 环境构建。

**常用命令**

```bash
pnpm tauri dev          # 前端 + 后端（devUrl: http://localhost:1420）
pnpm tauri build        # 打包（bundle.targets = all）
cargo check             # 仅类型检查（在 src-tauri/ 下，最快反馈）
cargo clippy -- -D warnings
cargo fmt
cargo test              # core 层单测
```

**配置入口**

- 窗口尺寸/标题/可见性/CSP：`tauri.conf.json`（纯 JSON，**不能写注释**）
- 可调用 API：`capabilities/default.json`
- 前端 dev 端口：`vite.config.ts` 与 `tauri.conf.json` 的 `devUrl` 必须一致（1420）

**调试**

- 前端：`Ctrl+Shift+I`（dev 模式）或右键检查
- Rust：`log`/`eprintln!`；发布版可接 `tauri-plugin-log` 落盘
- 标题栏问题：`main.ts` 里的 `[TB-DEBUG]` 日志（临时开关）
- 历史编译错误日志：`src-tauri/build_error.txt`

---

## 13. 测试策略

| 层 | 内容 | 工具 |
|---|---|---|
| core::crypto | 加解密往返、篡改检测、错误密码、大文件分块边界 | `cargo test` + tempfile |
| core::paths | `..` 穿越、符号链接、大小写不敏感文件系统、保留路径 | `cargo test` |
| core::ai_client | SSE 行解析、错误分支、取消响应 | `cargo test`（mock 流） |
| commands | 参数校验与错误映射（少量集成） | `tauri::test`（可选） |
| 前端 | 纯逻辑已有 Vitest 计划（v0.2） | Vitest |

约定：

- core 层禁止依赖 Tauri，保证测试无需启动应用
- 测试数据放 `src-tauri/tests/fixtures/`；临时文件用 `tempfile`，不污染仓库
- CI：`cargo fmt --check` + `clippy` + `test`（Linux runner，附系统依赖安装步骤）

---

## 14. 接入路线图

### v0.3 真实文件系统（建议顺序）

1. `error.rs` + `state.rs` 落地（先有骨架，后填充逻辑）
2. `core::paths` + 单测（安全底座）
3. `commands::dialog` + `commands::fs` 只读部分（list/read）→ 前端"打开文件夹"接真
4. `commands::fs` 写部分（write/create/rename/delete）→ 编辑器保存、文件操作接真
5. `core::fs_watch` → 外部修改提示
6. `core::crypto` + `commands::vault` → 私有空间接真
7. SQLite 元数据（标签/注释/私有空间索引）迁移
8. 验收：打开任意目录浏览/编辑/保存；外部修改提示；私有空间加密导入导出；异常路径全部有结构化错误

### v0.4 AI 接入（建议顺序）

1. `models::ai` + `core::ai_client`（先非流式打通，再 SSE）
2. `commands::ai` + 事件回传 → `useAiChat` 替换 mock
3. 取消/重试/计费（真实 usage）
4. 上下文引用（@当前文件/@选中代码）与长度裁剪
5. Key 管理升级（Keyring/加密存储）
6. 验收：真实流式打字机、停止生成、token 计费准确、断网/超时/401 有清晰提示

---

## 15. 编码规范

- **命名**：命令 `snake_case`、DTO 字段 `camelCase`（serde）、事件 `域:动作`
- **错误**：不使用 `unwrap/expect`（除测试与启动期不可恢复场景）；`?` + `From` 转换
- **日志**：`log::info!` 记录状态迁移与耗时；`log::error!` 记录内部错误详情；不打印用户内容与密钥
- **unsafe**：默认禁止；确需时局部化并写明 SAFETY 注释
- **注释**：模块头写"职责/计划/依赖/安全"四段式（与现有骨架一致）；公开函数写文档注释
- **提交**：一个领域一个提交；提交信息中文、说明动机与影响面；不提交 `target/`、`build_error.txt`

---

## 16. 常见问题与坑

| 问题 | 原因 / 处理 |
|---|---|
| `pnpm tauri dev` 报缺 `pkg-config`/`libdbus-1-dev` | WSL/精简 Linux 缺系统依赖；装 12 节的包或改用 Windows/macOS 构建 |
| 命令调用报 "not allowed" | 命令未登记 `invoke_handler` 或能力文件缺权限（capabilities） |
| macOS 菜单没有"编辑"或 ⌘C 失效 | 自定义应用菜单必须包含预定义 Edit 项（见 `utils/nativeMenu.ts`） |
| macOS 交通灯位置偏移 | `lib.rs::init_custom_titlebar` 的 inset；顶栏高度 38px，垂直居中取 13 |
| 前端 CSP 拦截 AI 请求 | 走了前端 fetch；应改为 Rust reqwest 转发（保持 CSP 最小） |
| 路径参数报 "invalid args" | Tauri 参数名区分大小写：前端 camelCase ↔ Rust snake_case 自动映射失败时检查字段名 |
| 删除文件"没反应" | `fs_delete` 要求 `confirmed: true` 且走回收站；回收站不可用会拒绝执行 |
| 大文件打开卡死 | `fs_read_text` 有 5 MB 上限；更大的文件应走"预览/外部打开"路径 |
| Windows 发布带控制台窗口 | `main.rs` 已用 `windows_subsystem` 属性处理，勿删 |
| `build_error.txt` 里的旧错误 | WSL 环境历史日志，仅供排查参考，可清理（已加入忽略计划） |

---

> 维护约定：本文件与 `src/**` 骨架注释同步更新；新增命令/事件/权限时，必须更新第 9、10 节表格。
