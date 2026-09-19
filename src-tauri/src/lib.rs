// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//
// ============================================================
// 后端目录规划（当前为纯注释骨架，未添加 mod 声明，不影响编译）
// ============================================================
// src/
// ├── main.rs              进程入口（已有）
// ├── lib.rs               本文件：Tauri Builder、插件注册、invoke_handler（已有）
// ├── error.rs             统一错误类型 AppError（命令统一返回 Result<T, AppError>）
// ├── state.rs             全局状态 AppState（作用域 / 私有空间密钥 / AI 请求 / 监听 / SQLite）
// ├── commands/            命令层：前端 invoke('xxx') 的薄封装（校验 → 调 core → DTO）
// │   ├── fs.rs            列目录 / 读写文本 / 新建 / 重命名 / 删除 / 定位 / 搜索
// │   ├── dialog.rs        系统对话框：选择文件夹 / 多选文件 / 保存文件 / 确认框
// │   ├── vault.rs         私有空间：初始化 / 解锁 / 加密导入 / 解密导出 / 改密码
// │   ├── ai.rs            AI：发起流式对话（事件回传）/ 取消生成 / 测试 Key
// │   └── settings.rs      设置读写（敏感值加密后落盘）
// ├── core/                核心层：可单测的业务实现（不依赖 tauri:: 类型）
// │   ├── crypto.rs        Argon2id + AES-256-GCM 分块加解密 / 密钥内存清零
// │   ├── paths.rs         路径安全：作用域校验（防目录穿越）/ 文件类型判定
// │   ├── fs_watch.rs      notify 文件监听（外部修改感知、事件防抖）
// │   └── ai_client.rs     OpenAI 兼容客户端 + SSE 流式解析 + 超时/重试/取消
// └── models/              数据模型（serde DTO，字段与前端 TS 类型一一对应）
//     ├── fs.rs             FileEntryDto / DirListingDto / SearchQueryDto
//     ├── ai.rs             ChatRequestDto / 流式事件负载 / UsageDto / ModelDto
//     └── vault.rs          VaultStatusDto / VaultEntryDto / VaultMeta 布局
//
// 接入步骤（每完成一个领域执行一次）：
//   1. 取消下方 `mod …` 注释（并在各层 mod.rs 中启用 `pub mod xxx;`）
//   2. 实现命令后在 invoke_handler![...] 中登记命令名
//   3. Cargo.toml 添加对应依赖（reqwest / argon2 / aes-gcm / notify / rusqlite / trash …）
//   4. capabilities/default.json 补充所需权限（fs 作用域 / dialog / http 等）
//   5. 前端把 mock 替换为 invoke（useFileManager / useAiChat / 设置页的接入点）
//
// 待启用的模块声明（注释形式预留，启用时去掉行首注释）：
//   mod commands; mod core; mod models; mod error; mod state;
// ============================================================

use tauri::WebviewWindow;
use tauri_plugin_decoration::WebviewWindowExt;

// ============================================================
// Tauri 后端（Rust）唯一入口，只管两件事：自定义标题栏的启用/回退。
//
// 其余可调项都在 src-tauri/tauri.conf.json 里（注意：它是纯 JSON，
// 不支持注释，改完直接保存即可）：
//   - productName / identifier : 应用名与应用唯一标识（打包签名用）
//   - app.windows[0].width/height/minWidth/minHeight : 窗口默认与最小尺寸
//   - app.windows[0].title : 窗口标题（会被 Vue 顶栏覆盖显示）
//   - app.windows[0].decorations: false : 关闭系统原生标题栏（自绘顶栏的前提）
//   - app.windows[0].visible: false : 先隐藏，等顶栏就绪再由 App.vue 调 win.show()
//   - app.security.csp : 内容安全策略，接远程资源/图片/脚本时在这放行
//   - bundle.targets : 打包产物（nsis/dmg/AppImage/all…）
// ============================================================

/// 前端 onMounted 时调用：给 Webview 盖一层透明 overlay 标题栏
///（tauri-plugin-decoration 负责原生拖拽与 caption 按钮，前端只画内容）
#[tauri::command]
fn init_custom_titlebar(window: WebviewWindow) -> Result<(), String> {
    window
        .create_overlay_titlebar()
        .map_err(|error| error.to_string())?;
    // macOS 上设置交通灯按钮的内边距
    // 调节：交通灯在自绘顶栏（38px 高）内的位置——
    // 左右 16px 与顶栏内容留白协调；上下取 (38-12)/2 ≈ 13px 让灯垂直居中
    #[cfg(target_os = "macos")]
    window
        .set_traffic_lights_inset(16.0, 13.0)
        .map_err(|error| error.to_string())?;

    Ok(())
}

/// 回退到系统原生标题栏（当前未在 UI 里接线，留给"切换标题栏"功能用）
#[tauri::command]
fn restore_native_titlebar(window: WebviewWindow) -> Result<(), String> {
    // 插件提供的回退方法：让原生标题栏接管（不显示 overlay）。
    // 该方法在 2.1.4 返回 Result<&WebviewWindow, _>，我们丢弃窗口引用。
    let _ = window
        .restore_native_titlebar()
        .map_err(|error| error.to_string())?;
    Ok(())
}

// run 函数直接返回 .run() 的结果（它本身就是 Result<(), tauri::Error>）
pub fn run() -> Result<(), tauri::Error> {
    tauri::Builder::default()
        .plugin(tauri_plugin_decoration::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            init_custom_titlebar,
            restore_native_titlebar
        ])
        .run(tauri::generate_context!())
}