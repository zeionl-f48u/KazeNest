// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::WebviewWindow;
use tauri_plugin_decoration::WebviewWindowExt;

#[tauri::command]
pub fn init_custom_titlebar(window: WebviewWindow) -> Result<(), String> {
    window
        .create_overlay_titlebar()
        .map_err(|error| error.to_string())?;
    // macOS 上设置交通灯按钮的内边距
    #[cfg(target_os = "macos")]
    window
        .set_traffic_lights_inset(16.0, 20.0)
        .map_err(|error| error.to_string())?;

    Ok(())
}

// run 函数直接返回 .run() 的结果（它本身就是 Result<(), tauri::Error>）
pub fn run() -> Result<(), tauri::Error> {
    tauri::Builder::default()
        .plugin(tauri_plugin_decoration::init())
        .invoke_handler(tauri::generate_handler![init_custom_titlebar])
        .run(tauri::generate_context!())
}