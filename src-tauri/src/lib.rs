// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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
    // 调节：交通灯离左/上边缘的间距（16.0 = 左右边距，20.0 = 上下边距）
    #[cfg(target_os = "macos")]
    window
        .set_traffic_lights_inset(16.0, 20.0)
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
        .invoke_handler(tauri::generate_handler![
            init_custom_titlebar,
            restore_native_titlebar
        ])
        .run(tauri::generate_context!())
}