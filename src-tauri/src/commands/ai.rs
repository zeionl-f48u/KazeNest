//! AI 命令（commands::ai）—— DeepSeek（OpenAI 兼容）请求与流式转发
//!
//! 计划实现的命令：
//!
//! - `ai_chat(req: ChatRequestDto) -> ()`（事件流回传）
//!     发起对话请求；通过 Tauri 事件向前端推送增量：
//!       · `ai:delta`    { requestId, text }        正文增量
//!       · `ai:reasoning`{ requestId, text }        思维链增量（R1 类模型）
//!       · `ai:done`     { requestId, usage }       完成（token 用量）
//!       · `ai:error`    { requestId, message }     失败
//!     用 tokio 异步任务 + channel（不阻塞主线程）
//!
//! - `ai_cancel(request_id: String) -> ()`
//!     取消生成（drop 掉对应的流/信号），前端"停止生成"按钮
//!
//! - `ai_test_key(api_key: String) -> bool`
//!     校验 API Key（models 接口探测），设置页"测试连接"
//!
//! - `ai_list_models() -> Vec<ModelDto>`
//!     拉取可用模型列表（失败回退内置列表）
//!
//! 依赖：
//! - reqwest（rustls，避免系统 OpenSSL 依赖）+ futures（SSE 解析）
//! - tokio（异步运行时：tauri 自带 tokio，复用即可）
//! - crate::core::ai_client（请求构造 / SSE 解析 / 重试）
//! - crate::models::ai（DTO 与事件负载）
//!
//! 配置与安全：
//! - API Key 存 `tauri-plugin-store`（后续升级：入 Keyring/强保管）
//! - 请求头/日志不打印 Key；错误信息脱敏后再回传前端
//! - 超时与重试策略在 core::ai_client 内定义（连接 10s / 整体 120s）
//! - 代理设置读取系统环境变量（HTTPS_PROXY）
