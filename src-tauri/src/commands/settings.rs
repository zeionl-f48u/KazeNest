//! 设置命令（commands::settings）—— 偏好读写的统一入口
//!
//! 计划实现的命令：
//!
//! - `settings_get(key: String) -> Option<serde_json::Value>`
//! - `settings_set(key: String, value: serde_json::Value) -> ()`
//! - `settings_all() -> serde_json::Value`
//! - `settings_reset(scope: Option<String>) -> ()`
//!
//! 说明：
//! - 前端已有 `utils/persist.ts` 直连 tauri-plugin-store（侧栏宽度/会话快照）；
//!   本模块用于"需要 Rust 侧参与"的设置（如加密的 API Key、AI 参数校验），
//!   以及后续迁移到 SQLite 后的兼容层
//! - key 采用命名空间约定：`ai.apiKey` / `ui.theme` / `editor.fontSize` …
//!
//! 注意：
//! - 敏感值（API Key）写入前用 core::crypto 加密（或用系统 Keyring）
//! - 写失败返回错误（前端提示"设置未保存"），不静默吞掉
