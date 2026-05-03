use tauri::Emitter;

/// Download the installer from `url`, save to %TEMP%, run silently, then quit.
/// Emits "update-progress" events (0-100) so the frontend can show a progress bar.
#[tauri::command]
async fn download_and_install(url: String, app: tauri::AppHandle) -> Result<(), String> {
    use futures_util::StreamExt;

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

    // Total size for progress calculation
    let total = response
        .content_length()
        .unwrap_or(0);

    let installer_path = std::env::temp_dir().join("kabab-hq-update.exe");
    let mut file = tokio::fs::File::create(&installer_path)
        .await
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    use tokio::io::AsyncWriteExt;

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

    // Flush and close file
    file.flush().await.map_err(|e| format!("Flush error: {}", e))?;
    drop(file);

    // Emit 100% before launching installer
    let _ = app.emit("update-progress", 100u8);

    // Small delay so frontend can show "Installing..." state
    tokio::time::sleep(std::time::Duration::from_millis(600)).await;

    // Launch NSIS installer silently — /S = silent mode
    std::process::Command::new(&installer_path)
        .arg("/S")
        .spawn()
        .map_err(|e| format!("Failed to launch installer: {}", e))?;

    // Give installer a moment to start, then exit
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
