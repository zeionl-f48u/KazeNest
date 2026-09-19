//! 统一错误类型（error::AppError）
//!
//! 目标：所有命令返回 `Result<T, AppError>`，前端 `invoke` 的 catch 得到
//! 结构化错误（code + message），而不是字符串堆栈。
//!
//! 计划实现：
//!
//! ```text
//! #[derive(Debug, thiserror::Error)]
//! pub enum AppError {
//!   #[error("路径不在允许范围内")]          PathOutOfScope,
//!   #[error("文件不存在: {0}")]             NotFound(String),
//!   #[error("权限不足: {0}")]               PermissionDenied(String),
//!   #[error("文件过大（上限 {limit}）: {size}")] TooLarge { size: u64, limit: u64 },
//!   #[error("不是文本文件")]                NotText,
//!   #[error("重名: {0}")]                   Conflict(String),
//!   #[error("私有空间未解锁")]              VaultLocked,
//!   #[error("密码错误或数据损坏")]           VaultAuth,
//!   #[error("AI 请求失败: {0}")]            Ai(String),
//!   #[error("网络错误: {0}")]               Network(String),
//!   #[error("操作已取消")]                  Cancelled,
//!   #[error("内部错误: {0}")]               Internal(String),
//! }
//! ```
//!
//! 序列化（impl Serialize）：
//!   { "code": "PATH_OUT_OF_SCOPE", "message": "…" }
//!   code 供前端做分支（如 VAULT_LOCKED → 弹解锁画面），message 直接展示
//!
//! 约定：
//! - `From<std::io::Error>` / `From<reqwest::Error>` 等做上下文转换
//!   （io 错误按 ErrorKind 映射 NotFound / PermissionDenied，其余归 Internal）
//! - 不把底层错误原文直接透出（可能含绝对路径/URL），脱敏后再进 message
//! - `Internal` 分支在 Rust 侧 log::error! 记录详情，仅给前端通用文案
