//! 数据模型（models）—— 跨层传输的 DTO（全部 serde 序列化）
//!
//! 约定：
//! - 字段命名 camelCase（serde rename_all），与前端 TypeScript 类型一一对应
//! - DTO 只做数据载体，不带方法；业务逻辑在 core 层
//! - 与前端类型对齐文件：
//!   · models/fs.rs  ↔ src/component/files/types.ts（ManagedFile / FolderNode / FileKind）
//!   · models/ai.rs  ↔ src/composables/useAiChat.ts（AiMessage / ModelDef / ChatRequest）
//!   · models/vault.rs ↔ 私有空间（前端待接入）
//!
//! 子模块：
//! - fs.rs     文件/目录条目、文件类型枚举、搜索请求
//! - ai.rs     聊天请求/响应、流式事件负载、Usage、模型定义
//! - vault.rs  私有空间条目、状态、加解密请求
