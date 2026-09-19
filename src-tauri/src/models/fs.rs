//! 文件系统 DTO（models::fs）
//!
//! 与前端 `src/component/files/types.ts` 严格对齐（字段 camelCase）：
//!
//! ```text
//! FileKind（枚举，serde rename_all = "lowercase"）：
//!   image | video | audio | doc | sheet | ppt | pdf | code | archive
//!
//! FileEntryDto {
//!   id: String,            // 稳定 id：路径哈希或相对路径（前端做 key）
//!   name: String,          // 文件名（含扩展名）
//!   path: String,          // 绝对路径（仅用于命令调用，不用于展示）
//!   kind: FileKind,        // 由扩展名映射（core::paths::file_kind）
//!   isDir: bool,           // 是否目录
//!   size: u64,             // 字节数（目录为 0）
//!   modifiedMs: i64,       // 修改时间（毫秒时间戳；前端格式化"x 分钟前"）
//!   tags: Vec<String>,     // 标签（资料空间元数据；文件夹模式为空）
//!   note: String,          // 注释（同上）
//!   encrypted: bool,       // 是否加密（私有空间条目）
//!   folderId: Option<String>, // 所属目录 id（当前目录列表可省）
//! }
//!
//! DirListingDto {
//!   path: String,          // 当前目录绝对路径
//!   entries: Vec<FileEntryDto>,
//!   truncated: bool,       // 是否因数量上限截断（如 > 5000 条）
//! }
//!
//! SearchQueryDto {
//!   root: String,          // 搜索根目录
//!   words: Vec<String>,    // 普通关键词（名称/注释）
//!   kinds: Vec<String>,    // # 类型条件（扩展名/类别）
//!   tags: Vec<String>,     // @ 标签条件（全部命中）
//!   limit: usize,          // 上限（防大目录卡顿）
//! }
//! ```
//!
//! 注意：
//! - 前端搜索语法解析仍在 TS 侧（utils/fileSearch），Rust 侧只接收结构化条件
//! - 元数据（标签/注释）未来存 SQLite（appDataDir/meta.db），与文件路径做映射
