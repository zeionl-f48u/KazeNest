//! 私有空间加密（core::crypto）—— 密码学实现（无 Tauri 依赖，可单测）
//!
//! 方案概要（v1）：
//! - 密码派生：Argon2id(password, salt) → 32 字节主密钥加密钥（KEK）
//! - 文件加密：随机生成 32 字节数据密钥（DEK），AES-256-GCM 分块加密文件，
//!   每块独立 nonce（12 字节随机 + 块序号），GCM tag 附在块尾
//! - 主密钥封装：DEK 用 KEK 加密后存 vault.meta（改密码只需重封 DEK，不必重加密大文件）
//! - 校验：vault.meta 内含校验值（用 KEK 加密的固定串），用于判断密码是否正确
//!
//! 计划函数：
//! - `derive_key(password: &str, salt: &[u8]) -> Zeroizing<[u8; 32]>`
//! - `random_bytes(n: usize) -> Vec<u8>`
//! - `encrypt_stream(reader, writer, key) -> Result<()>`（64 KB 分块，流式）
//! - `decrypt_stream(reader, writer, key) -> Result<()>`
//! - `wrap_key / unwrap_key`（用 KEK 封装 DEK 与校验标签）
//! - `VaultMeta { version, kdf, salt, wrapped_dek, verify }` 读写 vault.meta
//!
//! 依赖：aes-gcm、argon2、rand、zeroize、thiserror
//!
//! 安全要求：
//! - 密钥类型统一用 `Zeroizing`，离开作用域自动清零
//! - GCM nonce 严禁复用（块序号 + 随机前缀），加密前断言
//! - 文件头带版本号，便于未来算法升级；不做自定义加密算法
//! - 单测覆盖：加解密往返 / 篡改检测 / 错误密码 / 大文件分块边界
