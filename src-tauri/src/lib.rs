use std::fs;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[derive(serde::Serialize)]
struct ImagePath {
    path: String,
}

#[tauri::command]
fn get_parent_directory(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if let Some(parent) = path.parent() {
        if let Some(parent_str) = parent.to_str() {
            Ok(parent_str.to_string())
        } else {
            Err("Failed to convert path to string".to_string())
        }
    } else {
        Err("File has no parent directory".to_string())
    }
}

#[tauri::command]
fn list_images(path: String) -> Result<Vec<ImagePath>, String> {
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    let image_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"];
    let mut images = Vec::new();
    
    match fs::read_dir(dir_path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let file_path = entry.path();
                    if let Some(extension) = file_path.extension() {
                        let ext_str = extension.to_string_lossy().to_lowercase();
                        if image_extensions.contains(&ext_str.as_str()) {
                            // Check file size - skip images smaller than 15KB
                            if let Ok(metadata) = fs::metadata(&file_path) {
                                let file_size = metadata.len();
                                const MIN_SIZE: u64 = 15 * 1024; // 15KB in bytes
                                
                                if file_size >= MIN_SIZE {
                                    if let Some(path_str) = file_path.to_str() {
                                        images.push(ImagePath {
                                            path: path_str.to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            images.sort_by(|a, b| a.path.cmp(&b.path));
            Ok(images)
        }
        Err(e) => Err(format!("Failed to read directory: {}", e)),
    }
}

#[tauri::command]
fn load_image(image_path: String) -> Result<String, String> {
    let file_path = Path::new(&image_path);
    
    if !file_path.exists() {
        return Err(format!("Image does not exist: {}", image_path));
    }
    
    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", image_path));
    }
    
    // Determine MIME type from extension
    let mime_type = if let Some(extension) = file_path.extension() {
        let ext_str = extension.to_string_lossy().to_lowercase();
        match ext_str.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "bmp" => "image/bmp",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            "ico" => "image/x-icon",
            _ => "image/png",
        }
    } else {
        "image/png"
    };
    
    match fs::read(&file_path) {
        Ok(file_data) => {
            let base64_data = general_purpose::STANDARD.encode(&file_data);
            let data_url = format!("data:{};base64,{}", mime_type, base64_data);
            Ok(data_url)
        }
        Err(e) => Err(format!("Failed to read image: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .invoke_handler(tauri::generate_handler![list_images, load_image, get_parent_directory])
        .setup(|_app| {
            // File drops in Tauri 2.0 are handled through the event system
            // JavaScript will listen for tauri://drag-drop events
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
