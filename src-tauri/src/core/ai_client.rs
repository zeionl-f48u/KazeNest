//! AI 客户端（core::ai_client）—— OpenAI 兼容协议 + SSE 流式解析
//!
//! 目标服务：DeepSeek（api.deepseek.com，OpenAI 兼容）；预留自定义 base_url，
//! 以支持中转/自建/ Ollama 等兼容端点。
//!
//! 计划实现：
//! - `ChatRequest { model, messages, temperature, stream: true, tools? }`
//! - `send_chat(req, api_key, base_url, cancel: CancellationToken, on_event)`
//!     · reqwest POST /v1/chat/completions（stream=true）
//!     · 逐行解析 `data: {...}` SSE；`[DONE]` 结束
//!     · 增量回调：Delta{ text } / Reasoning{ text } / ToolCall{...}
//!     · 取消：select! 监听 CancellationToken，drop 请求
//! - `parse_sse_line(line) -> Option<SseEvent>`（单独函数便于单测）
//! - `usage_from_chunk(chunk) -> Option<Usage>`（真实 token 计费）
//! - `test_key(api_key, base_url) -> Result<()>`（GET /v1/models）
//!
//! 依赖：reqwest(rustls) / tokio-util(CancellationToken) / serde_json
//!
//! 注意：
//! - 超时：连接 10 s、首字节 30 s、整体 120 s（可配置）
//! - 429/5xx 指数退避重试一次；4xx 直接报错（附脱敏信息）
//! - 日志不打印 Authorization 头与正文（隐私）；仅记录耗时与 token
//! - 思维链（reasoning_content）与正文分开回传，前端分别渲染
//! - 单测覆盖：SSE 行解析 / 错误分支 / 取消信号的响应
