//! 私有空间 DTO（models::vault）
//!
//! ```text
//! VaultStatusDto {
//!   initialized: bool,   // 是否已创建 vault.meta
//!   unlocked: bool,      // 当前会话是否已解锁（仅内存状态）
//!   entryCount: usize,   // 条目数（不解锁也能统计）
//! }
//!
//! VaultEntryDto {
//!   id: String,          // UUID（元数据主键）
//!   name: String,        // 源文件名（明文元数据）
//!   kind: FileKind,      // 加密前的类型（预览/图标用）
//!   size: u64,           // 原始大小
//!   modifiedMs: i64,     // 导入时间
//!   tags: Vec<String>,   // 标签
//!   note: String,        // 注释
//! }
//!
//! VaultMeta（落盘 appDataDir/vault/vault.meta，JSON）：
//!   version: u32,        // 结构版本（算法升级用）
//!   kdf: { algo: "argon2id", memoryKib, iterations, parallelism, saltBase64 }
//!   wrappedDek: String,  // 用 KEK 封装的数据密钥（Base64）
//!   verify: String,      // 校验标签（用 KEK 加密的固定串）
//!
//! 存储布局（规划）：
//!   appDataDir/vault/
//!     ├── vault.meta       元数据与密钥封装（JSON）
//!     ├── index.db         条目索引（SQLite：id/文件名/标签/注释/时间）
//!     └── blobs/<id>.enc   加密内容（AES-GCM 分块流）
//! ```
//!
//! 注意：
//! - 元数据（文件名/标签）为明文，便于未解锁时展示数量与占用；
//!   若未来要求更高隐私，可将名称也移入加密区（需同步改前端列表逻辑）
//! - `index.db` 与 `vault.meta` 的备份/恢复策略在 v0.3 一并确定
