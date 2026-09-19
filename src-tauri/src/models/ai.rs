//! AI DTO（models::ai）
//!
//! 与前端 `src/composables/useAiChat.ts` 对齐，并补充 Rust 侧流式事件：
//!
//! ```text
//! ChatMessageDto {
//!   role: "system" | "user" | "assistant",
//!   content: String,
//! }
//!
//! ChatRequestDto {
//!   requestId: String,     // 前端生成（nanoid），用于事件关联与取消
//!   model: String,         // model-r1 / model-chat / model-coder → 实际模型 id
//!   messages: Vec<ChatMessageDto>,
//!   temperature: f32,      // 默认 0.7（按模型可调）
//!   work: Option<String>,  // 工作类型（coding/explain/…），用于系统提示词模板
//!   context: Option<ContextDto>, // @当前文件 / @选中代码 的真实内容
//! }
//!
//! ContextDto {
//!   files: Vec<FileContextDto>,   // { path, language, content }
//!   selection: Option<String>,    // 编辑器选中片段
//! }
//!
//! UsageDto { promptTokens, completionTokens, totalTokens }  // 真实计费
//!
//! 流式事件负载（events，前端 listen）：
//! - `ai:delta`     { requestId, text }
//! - `ai:reasoning` { requestId, text }
//! - `ai:tool`      { requestId, name, argsJson }
//! - `ai:done`      { requestId, usage }
//! - `ai:error`     { requestId, message }
//!
//! ModelDto { id, label, desc, priceIn, priceOut, maxContext }
//! ```
//!
//! 注意：
//! - 模型定价（priceIn/priceOut）与前端展示一致，单位：元 / 百万 token
//! - 事件名与请求 id 的映射在 commands::ai 内维护（HashMap<requestId, CancellationToken>）
