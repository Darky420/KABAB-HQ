use tauri::Emitter;

// Windows-only: needed for CREATE_NO_WINDOW flag
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Download the installer from `url`, save to %TEMP%, run silently, then quit.
/// - MSI files: uses `msiexec /i /quiet` — true in-place upgrade, no uninstall required
/// - EXE files: uses NSIS `/S` silent flag as fallback
///
/// After installing, a restart batch script is spawned so the app relaunches automatically.
/// Emits "update-progress" events (0-100) so the frontend shows a progress bar.
#[tauri::command]
async fn download_and_install(url: String, app: tauri::AppHandle) -> Result<(), String> {
    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    let client = reqwest::Client::builder()
        .user_agent("KABAB-HQ-Updater/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned {}", response.status()));
    }

    // Detect file type from URL
    let is_msi = url.to_lowercase().ends_with(".msi");

    // Total size for progress calculation
    let total = response.content_length().unwrap_or(0);

    // Save to %TEMP% with correct extension
    let file_name = if is_msi { "kabab-hq-update.msi" } else { "kabab-hq-update.exe" };
    let installer_path = std::env::temp_dir().join(file_name);

    let mut file = tokio::fs::File::create(&installer_path)
        .await
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Write error: {}", e))?;

        downloaded += chunk.len() as u64;

        if total > 0 {
            let pct = ((downloaded as f64 / total as f64) * 100.0) as u8;
            let _ = app.emit("update-progress", pct);
        }
    }

    file.flush().await.map_err(|e| format!("Flush error: {}", e))?;
    drop(file);

    let _ = app.emit("update-progress", 100u8);
    tokio::time::sleep(std::time::Duration::from_millis(600)).await;

    // Get current exe path so restart script can relaunch the app
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Cannot get exe path: {}", e))?;
    let exe_str = exe_path.to_string_lossy().to_string();

    if is_msi {
        // Write a restart batch script to %TEMP%
        // It waits for the MSI to finish (10 seconds), then relaunches the app
        let restart_bat = std::env::temp_dir().join("kabab-hq-restart.bat");
        let script = format!(
            "@echo off\r\ntimeout /t 10 /nobreak >nul\r\nstart \"\" \"{}\"\r\ndel \"%~f0\"\r\n",
            exe_str
        );
        std::fs::write(&restart_bat, &script)
            .map_err(|e| format!("Failed to write restart script: {}", e))?;

        // Launch MSI installer silently — true in-place upgrade
        std::process::Command::new("msiexec")
            .args([
                "/i",
                installer_path.to_str().unwrap_or(""),
                "/quiet",
                "/qn",
                "/norestart",
            ])
            .spawn()
            .map_err(|e| format!("Failed to launch MSI installer: {}", e))?;

        // Launch restart script with no visible window
        let mut cmd = std::process::Command::new("cmd");
        cmd.args(["/c", restart_bat.to_str().unwrap_or("")]);

        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

        cmd.spawn()
            .map_err(|e| format!("Failed to launch restart script: {}", e))?;
    } else {
        // NSIS EXE fallback — silent but will uninstall first
        // Write restart script the same way
        let restart_bat = std::env::temp_dir().join("kabab-hq-restart.bat");
        let script = format!(
            "@echo off\r\ntimeout /t 15 /nobreak >nul\r\nstart \"\" \"{}\"\r\ndel \"%~f0\"\r\n",
            exe_str
        );
        std::fs::write(&restart_bat, &script)
            .map_err(|e| format!("Failed to write restart script: {}", e))?;

        std::process::Command::new(&installer_path)
            .arg("/S")
            .spawn()
            .map_err(|e| format!("Failed to launch EXE installer: {}", e))?;

        let mut cmd = std::process::Command::new("cmd");
        cmd.args(["/c", restart_bat.to_str().unwrap_or("")]);

        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000);

        cmd.spawn()
            .map_err(|e| format!("Failed to launch restart script: {}", e))?;
    }

    // Brief pause then exit so installer can take over
    tokio::time::sleep(std::time::Duration::from_millis(800)).await;
    app.exit(0);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_oauth::init())
        .invoke_handler(tauri::generate_handler![download_and_install])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
