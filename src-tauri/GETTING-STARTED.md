# 后端入门指南（写给只会前端、不会 Rust 的你）

> 目标读者：熟悉 Vue / TypeScript，但没写过 Rust、没用过 Tauri 的开发者（即本项目的作者本人）。
> 阅读方式：**边读边动手**。本文所有示例都以 KazeNest 的实际骨架为背景，跟着做就能写出第一个真实命令。
> 关联文档：架构与协议见 [`README.md`](./README.md)；本文只讲"怎么学会写"。

---

## 目录

1. [先建立正确预期](#1-先建立正确预期)
2. [心智迁移：TypeScript 到 Rust 对照表](#2-心智迁移typescript-到-rust-对照表)
3. [Rust 最小语法集（只学用得到的）](#3-rust-最小语法集只学用得到的)
4. [Tauri 是怎么运作的](#4-tauri-是怎么运作的)
5. [实战第一课：写一个 app_info 命令](#5-实战第一课写一个-app_info-命令)
6. [实战第二课：带错误处理的读文件](#6-实战第二课带错误处理的读文件)
7. [实战第三课：事件与长任务](#7-实战第三课事件与长任务)
8. [编译报错翻译表](#8-编译报错翻译表)
9. [四周学习计划](#9-四周学习计划)
10. [资料与练习](#10-资料与练习)

---

## 1. 先建立正确预期

- Rust 的**难点不在语法**，在"所有权"这一个概念上。语法本身比 TS 少。
- Tauri 后端的**写法非常固定**：一个命令 = 一个函数 + 一行注册。你会写一个，就会写一百个。
- 你已有的优势：
  - 接口思维（DTO / 类型对齐）——直接迁移
  - 异步概念（Promise / async-await）——Rust 几乎一样
  - 你写的骨架注释就是"任务清单"，实现 = 把注释里的签名变成代码
- 唯一要接受的事：**编译慢**（首次几分钟），以及**编译器很啰嗦**（但它的报错是全网最好的老师，跟着改就行）。

---

## 2. 心智迁移：TypeScript 到 Rust 对照表

| 概念 | TypeScript | Rust | 备注 |
|---|---|---|---|
| 变量 | `const a = 1` | `let a = 1;` | 默认不可变；改要用 `let mut a` |
| 函数 | `function f(x: string): number {}` | `fn f(x: &str) -> i32 {}` | 返回类型用 `->`，无隐式 return，末行表达式即返回值 |
| 接口/类型 | `interface A { name: string }` | `struct A { name: String }` | 字段都有类型 |
| 联合类型 | `type S = 'a' \| 'b'` | `enum S { A, B }` | 枚举还能带数据（更强） |
| 可选值 | `string \| undefined` | `Option<String>` | `Some(x)` / `None`，用 `match` 或 `?` 处理 |
| 异常 | `try/catch` + `throw` | `Result<T, E>` | 不用抛，返回值显式携带错误 |
| 空值访问 | `a?.b` | `a.map(|x| x.b)` / `if let Some(x) = a` | 没有 null |
| 模块 | `import { f } from './x'` | `use crate::x::f;` | 模块树由 `mod` 声明拼出来 |
| 导出 | `export function f` | `pub fn f` | 默认私有 |
| JSON 序列化 | `JSON.stringify` | `serde` + `#[derive(Serialize)]` | 编译期生成，零手写 |
| 异步 | `async / await` | `async / await` | 运行时要 tokio（Tauri 自带） |
| 数组 | `arr.map(x => x.id)` | `arr.iter().map(|x| x.id).collect::<Vec<_>>()` | 迭代器风格一开始别扭，熟悉后很爽 |
| 字符串 | `string` | `String`（拥有）/ `&str`（借用） | 初学先记：函数参数多用 `&str`，结构体字段用 `String` |

---

## 3. Rust 最小语法集（只学用得到的）

> 只学这 7 个概念就能写出本项目 80% 的后端。

### 3.1 变量与可变性

```rust
let name = "KazeNest";        // 不可变
let mut count = 0;            // 可变
count += 1;
```

### 3.2 函数

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b                      // 没有分号 = 返回这一行
}
```

### 3.3 struct 与 enum（对应你的 DTO）

```rust
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]   // 关键：字段变成前端熟悉的 camelCase
pub struct FileEntryDto {
    pub id: String,
    pub name: String,
    pub is_dir: bool,                // 前端收到 isDir（rename_all 自动转）
}

pub enum FileKind { Image, Video, Doc }   // 前端看是 "image" 等小写（配 serde 配置）
```

对应你的 `src/component/files/types.ts`——字段名一一对齐就是靠这两个属性。

### 3.4 Option 与 Result（取代 null 与 try/catch）

```rust
fn find(id: &str) -> Option<String> {   // 可能找不到
    if id == "1" { Some("命中".into()) } else { None }
}

fn read(path: &str) -> Result<String, String> {  // 可能失败
    if path.is_empty() {
        return Err("路径为空".into());           // 相当于 throw
    }
    Ok("内容".into())                             // 相当于 return
}
```

`?` 运算符 = "失败就提前返回"（类似把异常往上抛，但类型可见）：

```rust
fn read_twice(path: &str) -> Result<String, String> {
    let a = read(path)?;      // read 失败就直接返回 Err
    Ok(a + &a)
}
```

### 3.5 match 与 if let

```rust
match find("1") {
    Some(v) => println!("找到: {v}"),
    None => println!("没有"),
}

if let Some(v) = find("1") {            // 只关心成功分支
    println!("{v}");
}
```

### 3.6 所有权（三句话记住）

1. **每个值只有一个主人**（变量）；主人离开作用域，值被释放。
2. **借给别人用**：`&x`（读）/ `&mut x`（写）——同一时间要么多个读，要么一个写。
3. **要复制一份**：`.clone()`（有成本）。初学时，编译器报 "borrow" 相关错误就 `.clone()` 兜底，先跑通再优化。

> 这段在你写前端调用逻辑时几乎碰不到，写文件操作时才会遇到。遇到再看第 8 节翻译表。

### 3.7 模块与目录（对应你已有的骨架）

```
src/
├── lib.rs            // crate 根：mod 声明 + 注册
├── commands/
│   └── fs.rs         // crate::commands::fs
└── core/
    └── paths.rs      // crate::core::paths
```

```rust
// lib.rs
mod commands;                     // 声明模块（引用 commands/mod.rs）
use commands::fs::fs_read_text;   // 用里面的东西

// commands/mod.rs
pub mod fs;                       // 让子文件成为公开模块（少了这行，fs.rs 不参与编译）
```

**骨架注释里的"接入步骤"说的就是：把 `mod` 的注释放开。**

---

## 4. Tauri 是怎么运作的

```
前端 Vue                       IPC 桥                  Rust 后端
─────────                    ────────                ──────────
invoke('fs_read_text',       JSON 序列化              #[tauri::command]
  { path })          ───────────────────────────▶     fn fs_read_text(path: String)
                                                        -> Result<String, AppError>
await result         ◀───────────────────────────     Ok(String) / Err(AppError)
                                                      （编译期自动生成胶水代码）

listen('ai:delta', cb)       ◀────── emit("ai:delta", payload) ──────
```

四个你必须知道的概念：

| 概念 | 作用 | 在 KazeNest 的位置 |
|---|---|---|
| `#[tauri::command]` | 把一个函数暴露给前端 invoke | 所有 `commands/*` 文件 |
| `invoke_handler![]` | 注册所有命令（漏注册 = 前端调用报 not allowed） | `lib.rs` |
| `.manage(State)` | Rust 侧全局状态（跨命令共享） | `state.rs`（规划） |
| `emit` / `listen` | 后端主动推消息（流式、进度、文件变化） | AI 流式（规划） |

**重要**：自定义命令**不需要**在 capabilities 里配权限（那是核心 API 和插件才需要的）。你会在 capabilities 里加东西，只在用插件（dialog/fs/http）时。

调用约定：
- 前端 `invoke('命令名', { camelCase参数 })`
- Rust 函数名 `snake_case`、参数也用 `snake_case`；Tauri 自动做 camelCase ↔ snake_case 映射
- 返回 `Result<T, E>` 时，`Ok` 走 `then`，`Err` 走 `catch`（E 需可序列化）

---

## 5. 实战第一课：写一个 app_info 命令

> 目标：前端能拿到 `{ name: "KazeNest", version: "0.1.0" }` 并显示在控制台。
> 全程约 10 分钟（不含首次编译）。

### 步骤 1：在 `src-tauri/src/lib.rs` 加函数

（教学示例，理解后再决定是否真正加入项目）

```rust
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    name: String,
    version: String,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: "KazeNest".into(),        // .into() = 把 &str 转成 String
        version: "0.1.0".into(),
    }
}
```

### 步骤 2：注册

```rust
.invoke_handler(tauri::generate_handler![
    init_custom_titlebar,
    restore_native_titlebar,
    app_info                       // ← 加这一行
])
```

### 步骤 3：前端调用（任意 Vue 文件里临时验证）

```ts
import { invoke } from '@tauri-apps/api/core'

const info = await invoke<{ name: string; version: string }>('app_info')
console.log(info)   // { name: 'KazeNest', version: '0.1.0' }
```

### 步骤 4：运行

```bash
pnpm tauri dev        # 在项目根目录
```

- 第一次编译 3~10 分钟（正常）
- 修改 Rust 代码保存后会自动重编译并重启应用

**检查点**：前端控制台打印出对象 = 你已掌握 Tauri 命令的完整闭环。

---

## 6. 实战第二课：带错误处理的读文件

> 目标：`read_text` 能读文件；路径不存在时前端 catch 到友好错误。
> 这一课学会 `Result`、`std::fs`、字符串处理。

```rust
use std::fs;

#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    // 1) 体积上限（防大文件卡死，上限 5 MB）
    let meta = fs::metadata(&path).map_err(|e| format!("读取失败: {e}"))?;
    if meta.len() > 5 * 1024 * 1024 {
        return Err("文件过大（上限 5 MB）".into());
    }

    // 2) 读取内容
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("不是文本文件或编码不支持: {e}"))?;

    Ok(content)
}
```

前端：

```ts
try {
  const text = await invoke<string>('read_text', { path: '/tmp/a.txt' })
} catch (e) {
  console.error('读取失败：', e)   // e 就是 Err 里的字符串
}
```

**关键点**：
- `map_err(|e| ...)` = 把底层错误转成给用户看的中文（第 7 节会升级成结构化 `AppError`）
- `?` 的作用：出错提前返回，不用写层层 if
- 参数 `path: String` 由 Tauri 自动把 JS 字符串转过来

**练习**：把上面的 `read_text` 改成返回 `Result<String, AppError>`（用 `error.rs` 骨架里的枚举），并在注册表加一行。

---

## 7. 实战第三课：事件与长任务

> 目标：命令立即返回，过程中通过事件把进度推给前端（AI 流式、加密进度都用这个模式）。

```rust
use tauri::{AppHandle, Emitter};   // Tauri 2 的 trait

#[tauri::command]
fn count_down(app: AppHandle, from: u32) {
    std::thread::spawn(move || {
        for i in (1..=from).rev() {
            app.emit("count:step", i).ok();   // 事件名 + 任意可序列化负载
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
        app.emit("count:done", ()).ok();
    });
}
```

前端：

```ts
import { listen } from '@tauri-apps/api/event'

const un = await listen<number>('count:step', (e) => console.log('剩余', e.payload))
// 组件卸载时 un()
```

**关键点**：
- 长任务不能阻塞命令函数（前端会一直 pending）——用 `std::thread::spawn` 或 `tauri::async_runtime::spawn`
- `emit` 在哪个对象上调用：`AppHandle` = 全局；`WebviewWindow` = 单窗口
- AI 流式就是把 `count:step` 换成 `ai:delta`（见 README 6.4）

---

## 8. 编译报错翻译表

| 报错（节选） | 白话 | 处理 |
|---|---|---|
| `value moved here` / `use of moved value` | 值被"搬走"了，不能再用 | 加 `.clone()` 或改用 `&` 借用 |
| `cannot borrow as mutable` | 有人正在读，不能同时改 | 缩短借用范围；先 `let x = ...` 取出再操作 |
| `expected String, found &str` | 类型差一层 | `s.to_string()` / `s.into()` / 参数改 `&str` |
| `missing lifetime specifier` | 编译器需要你说明引用活多久 | 初学：函数参数用 `String` 而不是 `&str` 绕开 |
| `the trait Serialize is not implemented` | DTO 没 derive | 加 `#[derive(Serialize, Deserialize)]` |
| `cannot find macro xxx` | 宏没导入 | `use` 对应模块，或加 crate 依赖 |
| `no method named xxx` | 方法不在这个类型上 | 看文档确认类型；`String` vs `&str` 常见 |
| `command xxx not found`（前端报） | 命令没注册 | `generate_handler!` 里加名字 |
| `not allowed by ACL`（前端报） | 用了需要权限的插件 API | 在 `capabilities/default.json` 加权限 |
| 编译卡住不动 | 首次编译依赖树大 | 耐心；`cargo check` 比 `cargo build` 快得多 |

**习惯**：写完一段就 `cargo check`（在 `src-tauri/` 下），不要等 `tauri dev` 一起报。

---

## 9. 四周学习计划

> 每周 3~5 小时；全部以本项目为练习场，不做无关的玩具项目。

**第 1 周：Rust 基础 + 第一个命令**
- 读《Rust 程序设计语言》中文版第 1~6 章（变量/函数/所有权/struct/enum/match）
- 完成本文第 5 节 `app_info`；再照葫芦画瓢写 `app_version`
- 练习：Rustlings 前 40 题

**第 2 周：错误处理 + 只读文件系统**
- 读第 9 章（错误处理）、第 10 章（泛型与 trait 略读）
- 实现 `read_text`（第 6 节），换成 `AppError`；实现 `fs_list_dir` 雏形（`std::fs::read_dir`）
- 验收：前端"文件夹"视图能列出真实目录

**第 3 周：Tauri 进阶 + 写操作**
- 通读 Tauri 官方文档"Calling Rust"与"Events"两章
- 实现 `fs_write_text`（临时文件 + rename 原子写）、`fs_create_dir`
- 学会用 `AppState`：存"当前打开的文件夹作用域"

**第 4 周：按需攻坚**
- 选一个：文件监听（notify）/ 系统对话框（tauri-plugin-dialog）/ AI 请求（reqwest + SSE）
- 目标不是全会，而是**独立完成一个领域并写进 README 的接入记录**

之后：私有空间加密（argon2/aes-gcm）属于"密码学"领域，建议照抄优秀开源实现思路 + 充分测试，不要自创。

---

## 10. 资料与练习

**必读**
- 《Rust 程序设计语言》中文版（官方书的中译）：https://kaisery.github.io/trpl-zh-cn/
- Rust 官方书英文原版：https://doc.rust-lang.org/book/
- Tauri 2 官方文档（重点：Calling Rust from the Frontend / Events / State Management）：https://v2.tauri.app/

**练习**
- Rustlings（官方小练习，改错为主）：https://github.com/rust-lang/rustlings
- 本项目练习法：从 `src-tauri/README.md` 第 14 节路线图挑最小的一步，实现 → 前端接通 → 记录到问题清单

**工具习惯**
- 编辑器装 `rust-analyzer` 插件（VSCode/Neovim），它能实时提示类型与错误
- `cargo fmt` 后不用再纠结格式；`cargo clippy` 会教你更地道的写法
- 看别人怎么写：`cargo doc --open` 看依赖库文档；GitHub 搜 `tauri v2 example`

---

> 记住一条就够了：**每次只实现一个命令，从注册到前端调用跑通，再写下一个。**
> 你不需要"学会 Rust"才能写这个后端——你只需要在实现每个命令时，遇到不会的再查。
