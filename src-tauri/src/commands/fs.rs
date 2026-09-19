//! 文件系统命令（commands::fs）—— 前端"文件夹/编辑器"视图的数据来源
//!
//! 计划实现的命令（接入 v0.3 真实文件系统时填充）：
//!
//! - `fs_list_dir(path: String) -> Vec<FileEntryDto>`
//!     列出目录内容：名称 / 绝对路径 / 是否目录 / 大小 / 修改时间 / 扩展名；
//!     目录在前、同类按名称排序；权限不足或不存在时返回结构化错误
//!
//! - `fs_read_text(path: String) -> String`
//!     读取文本文件（编辑器打开用）。限制最大体积（如 5 MB），
//!     超限或二进制内容返回明确错误（防卡死 WebView）
//!
//! - `fs_write_text(path: String, content: String) -> ()`
//!     保存文本（编辑器 Ctrl+S）。先写同目录临时文件再原子 rename，
//!     避免写入中断导致文件损坏
//!
//! - `fs_create_dir(parent: String, name: String) -> FileEntryDto`
//!     新建文件夹（过滤非法字符与保留名，重名自动报错）
//!
//! - `fs_create_file(parent: String, name: String) -> FileEntryDto`
//!     新建空文件
//!
//! - `fs_rename(path: String, new_name: String) -> FileEntryDto`
//!     重命名文件/文件夹（同目录内改名）
//!
//! - `fs_delete(paths: Vec<String>) -> ()`
//!     批量删除：优先移动到系统回收站（trash crate），不可用时拒绝执行，
//!     不做"静默永久删除"（隐私与误删保护）
//!
//! - `fs_reveal(path: String) -> ()`
//!     在系统文件管理器中定位（Windows 资源管理器 / Finder / xdg-open），
//!     复用 tauri-plugin-opener
//!
//! - `fs_search(root: String, query: String) -> Vec<FileEntryDto>`
//!     目录内按名称搜索（v1 只做名称匹配；全文检索后续放独立索引服务）
//!
//! 依赖（Cargo.toml 待接入）：
//! - tauri-plugin-fs 或 std::fs（二选一：插件自带作用域校验，std 更灵活）
//! - trash（回收站）、walkdir（递归遍历）
//! - crate::core::paths（路径作用域与安全检查）
//! - crate::core::fs_watch（文件变更监听：打开中文件被外部修改时通知前端）
//! - crate::models::fs（FileEntryDto 等 DTO）
//!
//! 安全注意：
//! - 所有入参路径先经 `core::paths::ensure_in_scope` 校验（防目录穿越）
//! - 删除/覆盖类操作要求前端二次确认（命令入参加 `confirmed: bool`）
//! - 符号链接默认不跟随；禁止操作系统保留目录
//! - 错误不泄露绝对路径之外的敏感信息；写操作记录审计日志（可选）
