use tauri::Emitter;

/// Download the installer from `url`, save to %TEMP%, run silently, then quit.
/// - MSI files: uses `msiexec /i /quiet` — true in-place upgrade, no uninstall needed
/// - EXE files: uses NSIS `/S` silent flag as fallback
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

    // Detect file type from URL to choose correct installer command
    let is_msi = url.to_lowercase().ends_with(".msi");

    // Total size for progress calculation
    let total = response.content_length().unwrap_or(0);

    // Save to temp with correct extension
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

        // Emit progress percentage
        if total > 0 {
            let pct = ((downloaded as f64 / total as f64) * 100.0) as u8;
            let _ = app.emit("update-progress", pct);
        }
    }

    // Flush and close file before launching installer
    file.flush().await.map_err(|e| format!("Flush error: {}", e))?;
    drop(file);

    // Emit 100% and give frontend time to show "Installing..." state
    let _ = app.emit("update-progress", 100u8);
    tokio::time::sleep(std::time::Duration::from_millis(600)).await;

    if is_msi {
        // MSI: true in-place upgrade — no uninstall required
        // /i = install, /quiet = no UI, /qn = no dialogs, /norestart = don't reboot
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
    } else {
        // NSIS EXE: silent mode (fallback — will uninstall previous version)
        std::process::Command::new(&installer_path)
            .arg("/S")
            .spawn()
            .map_err(|e| format!("Failed to launch EXE installer: {}", e))?;
    }

    // Give installer a moment to start, then exit the app
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
