//! 命令层（commands）—— 前端 `invoke('xxx')` 的入口，只做薄封装
//!
//! 设计约定：
//! - 每个子模块对应一个领域：fs（文件系统）/ dialog（系统对话框）/
//!   vault（私有空间加密）/ ai（AI 请求转发）/ settings（设置读写）
//! - 命令函数只做三件事：参数校验 → 调 `crate::core` 的服务 → 返回 DTO
//! - 不在此层写业务逻辑、不直接操作磁盘/网络（方便单测与复用）
//! - 错误统一返回 `crate::error::AppError`（实现了 serde::Serialize，可直接回传前端）
//!
//! 接入步骤（填代码时）：
//! 1. 在 lib.rs 里取消对应 `mod` 注释并 `use crate::commands::*;`
//! 2. 在 `invoke_handler![...]` 中登记命令名
//! 3. 在 capabilities/default.json 里补充所需权限（如 fs 作用域）
//!
//! 子模块规划：
//! - fs.rs       文件系统：列目录 / 读写文本 / 新建 / 重命名 / 删除 / 定位
//! - dialog.rs   系统对话框：选择文件夹 / 选择文件 / 保存文件对话框
//! - vault.rs    私有空间：初始化 / 解锁 / 加密导入 / 解密导出 / 改密码
//! - ai.rs       AI：发送消息（流式事件回传）/ 取消生成 / SSE 解析转发
//! - settings.rs 设置：偏好读写（基于 tauri-plugin-store 的封装命令）
