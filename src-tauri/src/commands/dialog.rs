//! 系统对话框命令（commands::dialog）—— 打开本地文件夹/文件的入口
//!
//! 计划实现的命令：
//!
//! - `dialog_pick_folder() -> Option<String>`
//!     文件夹选择对话框（"文件夹"视图的"打开文件夹"按钮）
//!     返回所选目录绝对路径；用户取消返回 None
//!
//! - `dialog_pick_files(filters: Vec<FileFilter>) -> Vec<String>`
//!     多选文件（导入到资料空间/私有空间用）
//!     FileFilter { name, extensions } 对应前端的多格式筛选
//!
//! - `dialog_save_file(default_name: String) -> Option<String>`
//!     保存文件对话框（导出/另存为）
//!
//! - `dialog_message(kind, title, message) -> bool`
//!     通用消息/确认对话框（危险操作二次确认；kind: info|warn|confirm）
//!
//! 实现建议：
//! - 优先用 `tauri-plugin-dialog`（跨平台、与 Tauri 权限体系一致）
//! - 中文文案与按钮顺序按平台惯例（macOS 确认键在右）
//!
//! 注意：
//! - 对话框必须由 Rust 侧发起（前端 window 的异步对话框在 macOS 上焦点异常）
//! - 选择结果只返回路径字符串；读取/写入仍走 fs 命令的校验链
