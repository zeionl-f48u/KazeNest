//! 全局状态（state::AppState）—— 会话级共享数据
//!
//! 由 `tauri::Builder::manage(AppState::default())` 注入，
//! 命令函数通过 `State<'_, AppState>` 获取。
//!
//! 计划持有：
//!
//! ```text
//! pub struct AppState {
//!   /// 当前打开的工作区/文件夹作用域（所有文件操作的允许根）
//!   /// 打开文件夹时插入，关闭时移除（Vec<PathBuf> + RwLock）
//!   pub scopes: RwLock<Vec<PathBuf>>,
//!
//!   /// 私有空间解锁后的数据密钥（DEK），仅内存
//!   /// 锁定时 zeroize 清空；进程退出即消失
//!   pub vault_key: RwLock<Option<Zeroizing<[u8; 32]>>>,
//!
//!   /// 进行中的 AI 请求：requestId → 取消令牌
//!   pub ai_requests: Mutex<HashMap<String, CancellationToken>>,
//!
//!   /// 文件监听句柄：路径 → Watcher（编辑器/文件夹视图）
//!   pub watchers: Mutex<HashMap<PathBuf, RecommendedWatcher>>,
//!
//!   /// 元数据数据库连接（SQLite：标签/注释/私有空间索引）
//!   pub db: Mutex<Option<rusqlite::Connection>>,
//! }
//! ```
//!
//! 注意：
//! - 全部字段要求 Send + Sync（Tauri 多线程命令）；用标准库同步原语即可
//! - 避免在持锁期间做 IO（先取数据、释放锁、再操作）
//! - 状态不做持久化（持久化数据在 settings.json / vault / SQLite 中）；
//!   重开应用时 scopes 从会话快照（前端持久化）恢复后再注入
