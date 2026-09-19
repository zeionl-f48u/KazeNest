//! 路径安全（core::paths）—— 所有文件操作的守门人
//!
//! 为什么需要：
//! 前端传入的路径不可信（目录穿越 "../"、符号链接跳转、UNC 路径等），
//! 所有磁盘操作前必须经过本模块校验。
//!
//! 计划函数：
//! - `normalize(path: &Path) -> Result<PathBuf>`
//!     规范化：转绝对路径、折叠 "." / ".."、统一分隔符（Windows 反斜杠）
//!
//! - `ensure_in_scope(path: &Path, roots: &[PathBuf]) -> Result<PathBuf>`
//!     作用域校验：规范化后的路径必须位于允许根目录（已打开的文件夹/
//!     私有空间数据目录）之内；符号链接解析后再次校验（canonicalize 两次）
//!
//! - `ensure_not_reserved(path: &Path) -> Result<()>`
//!     禁止系统保留路径（如 Windows 的 C:\Windows、System32）
//!
//! - `file_kind(path: &Path) -> FileKind`
//!     按扩展名映射前端 FileKind（image/video/audio/doc/sheet/ppt/pdf/code/archive），
//!     与 `src/component/files/types.ts` 的 KIND_META 保持一致
//!
//! - `unique_name(dir: &Path, base: &str) -> String`
//!     重名处理（"未命名.txt" → "未命名 (1).txt"）
//!
//! 注意：
//! - 打开文件夹后，该目录（含子目录）加入 AppState 的作用域列表；
//!   关闭文件夹时移除
//! - 私有空间数据目录（appDataDir/vault）恒在作用域内，但 UI 层不暴露其路径
//! - 单测覆盖：`..` 穿越、符号链接、大小写差异（Windows/macOS 不敏感文件系统）
