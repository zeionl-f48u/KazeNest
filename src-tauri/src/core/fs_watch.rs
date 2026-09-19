//! 文件监听（core::fs_watch）—— 外部修改感知
//!
//! 使用场景：
//! - 编辑器打开的文件被其他程序修改 → 前端提示"文件已在磁盘上更改，是否重载"
//! - 文件夹视图停留在某目录时，外部新增/删除文件 → 列表自动刷新（可选）
//!
//! 计划实现（基于 notify crate）：
//! - `watch_file(path: &Path, on_event: impl Fn(WatchEvent)) -> Watcher`
//!     单文件监听（编辑器标签）；返回句柄用于停止监听
//! - `watch_dir(path: &Path, on_event: impl Fn(WatchEvent)) -> Watcher`
//!     目录监听（文件夹视图）；注意防抖（编辑器保存会产生多个事件）
//!
//! WatchEvent：
//! - `Modified(PathBuf)` / `Created(PathBuf)` / `Removed(PathBuf)` / `Renamed{from,to}`
//!
//! 注意：
//! - 事件合并与防抖（300 ms）在 Rust 侧完成，避免前端抖动
//! - 监听失败（inotify 句柄上限）时降级为"保存前检查 mtime"策略
//! - 停止监听必须显式调用（Watcher 离开作用域即停止也可，但显式更清晰）
//! - 跨平台差异：macOS 用 FSEvents（目录级）、Windows 用 ReadDirectoryChangesW、
//!   Linux 用 inotify；notify crate 已做统一，注意 macOS 上文件级监听的粒度问题
