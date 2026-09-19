//! 私有空间命令（commands::vault）—— 加密存储的对外接口
//!
//! 计划实现的命令：
//!
//! - `vault_status() -> VaultStatusDto`
//!     空间状态：是否已初始化 / 是否已解锁 / 条目数（不泄露文件名）
//!
//! - `vault_init(password: String) -> ()`
//!     首次初始化：生成随机 salt，Argon2id 派生密钥，写入 vault.meta
//!     （含 KDF 参数与校验标签；此时不创建任何内容文件）
//!
//! - `vault_unlock(password: String) -> ()`
//!     解锁：读取 vault.meta → 派生密钥 → 校验标签比对；
//!     成功后将密钥存入 `crate::state::AppState`（仅内存）
//!     失败计数与延迟（防暴力破解：第 N 次失败后指数退避）
//!
//! - `vault_lock() -> ()`
//!     锁定：清除内存密钥（zeroize），前端回到锁定画面
//!
//! - `vault_import(paths: Vec<String>, password: String) -> Vec<VaultEntryDto>`
//!     把普通文件加密导入私有空间（加密后删除原文件或保留由参数决定）
//!
//! - `vault_list() -> Vec<VaultEntryDto>`
//!     列出私有空间条目（元数据明文存 SQLite；仅内容加密）
//!
//! - `vault_export(id: String, dest_dir: String) -> ()`
//!     解密导出到指定目录（需要已解锁）
//!
//! - `vault_delete(id: String) -> ()`
//!     删除加密文件与元数据
//!
//! - `vault_change_password(old: String, new: String) -> ()`
//!     改密码：用旧密钥解密主密钥 → 新密码重新加密（大文件不重加密方案：
//!     文件本身用随机主密钥加密，密码只加密主密钥）
//!
//! 依赖：
//! - crate::core::crypto（AES-GCM / Argon2id / zeroize）
//! - crate::models::vault（元数据与 DTO）
//! - crate::state（内存密钥）
//!
//! 安全红线：
//! - 明文密钥绝不落盘、绝不进日志；锁定时立即 zeroize
//! - 解锁失败不区分"密码错误/文件损坏"（避免信息泄露）
//! - 私有空间内容不参与全局搜索索引（前端约束）
