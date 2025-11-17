use std::fs;
use std::path::{Path, PathBuf};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[derive(serde::Serialize)]
struct ImagePath {
    path: String,
}

#[derive(serde::Serialize)]
struct DirectoryPath {
    path: String,
}

#[derive(serde::Serialize)]
struct DirectoryContents {
    directories: Vec<DirectoryPath>,
    images: Vec<ImagePath>,
}

/// Returns the parent directory path for a given file path.
///
/// The function examines `file_path` and returns the parent directory as a `String`.
///
/// # Parameters
///
/// * `file_path` - Path to a file whose parent directory is requested.
///
/// # Returns
///
/// `Ok(String)` containing the parent directory path on success; `Err(String)` with one of:
/// - `"File has no parent directory"` if the path has no parent.
/// - `"Failed to convert path to string"` if the parent path cannot be converted to UTF-8.
///
/// # Examples
///
/// ```
/// let parent = get_parent_directory("/tmp/project/src/main.rs".to_string()).unwrap();
/// assert_eq!(parent, "/tmp/project/src");
/// ```
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

/// Collects directory and image file paths from a directory and returns them separately.
///
/// Scans the provided directory for subdirectories and image files. Returns directories first,
/// then images. Image files must have common image extensions (`jpg`, `jpeg`, `png`, `gif`,
/// `bmp`, `webp`, `svg`, `ico`) and be at least 15 KB in size. Results are sorted by path.
///
/// # Returns
///
/// `Ok(DirectoryContents)` with directories and images when successful; `Err(String)` with an
/// explanatory message if the path does not exist, is not a directory, or cannot be read.
#[tauri::command]
fn list_images(path: String) -> Result<DirectoryContents, String> {
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    let image_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"];
    let mut directories = Vec::new();
    let mut images = Vec::new();
    
    match fs::read_dir(dir_path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let file_path = entry.path();
                    
                    // Check if it's a directory
                    if file_path.is_dir() {
                        if let Some(path_str) = file_path.to_str() {
                            directories.push(DirectoryPath {
                                path: path_str.to_string(),
                            });
                        }
                    } else if file_path.is_file() {
                        // Check if it's an image file
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
            }
            directories.sort_by(|a, b| a.path.cmp(&b.path));
            images.sort_by(|a, b| a.path.cmp(&b.path));
            Ok(DirectoryContents {
                directories,
                images,
            })
        }
        Err(e) => Err(format!("Failed to read directory: {}", e)),
    }
}

/// Encode an image file as a base64 data URL.
///
/// Reads the file at `image_path`, determines a MIME type from the file extension (defaults to `image/png`),
/// base64-encodes the file contents, and returns a data URL suitable for use in web contexts.
///
/// # Returns
///
/// On success, a `String` containing a data URL in the form `data:<mime_type>;base64,<base64_data>`.
/// On failure, an `Err(String)` describing the error (missing file, not a file, or read error).
///
/// # Examples
///
/// ```
/// // Example (requires the referenced file to exist in the filesystem)
/// let result = load_image("tests/fixtures/example.png".into());
/// if let Ok(data_url) = result {
///     assert!(data_url.starts_with("data:image/"));
/// }
/// ```
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

/// Deletes an image file by sending it to the system trash/recycle bin.
///
/// Uses the `trash` crate to send the file to the system trash, which works cross-platform
/// (Windows Recycle Bin, macOS Trash, Linux trash).
///
/// # Returns
///
/// `Ok(())` on success, `Err(String)` with an error message if the file cannot be deleted.
#[tauri::command]
fn delete_image(image_path: String) -> Result<(), String> {
    let file_path = Path::new(&image_path);
    
    if !file_path.exists() {
        return Err(format!("Image does not exist: {}", image_path));
    }
    
    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", image_path));
    }
    
    match trash::delete(&file_path) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to delete image: {}", e)),
    }
}

#[derive(Serialize, Deserialize)]
struct CategoryData {
    id: String,
    name: String,
    color: String,
}

#[derive(Serialize, Deserialize)]
struct HotkeyData {
    id: String,
    key: String,
    modifiers: Vec<String>,
    action: String,
}

#[derive(Serialize, Deserialize)]
struct HitoFile {
    categories: Vec<CategoryData>,
    image_categories: Vec<(String, Vec<String>)>,
    hotkeys: Vec<HotkeyData>,
}

/// Get the path to the .hito.json file in the directory.
/// If filename is provided, use it; otherwise default to ".hito.json".
fn get_hito_file_path(directory: &str, filename: Option<&str>) -> PathBuf {
    let dir_path = Path::new(directory);
    let file_name = filename.unwrap_or(".hito.json");
    dir_path.join(file_name)
}

/// Load categories and hotkeys from .hito.json in the specified directory.
///
/// Returns categories, image category assignments, and hotkeys if the file exists, otherwise returns empty data.
#[tauri::command]
fn load_hito_config(directory: String, filename: Option<String>) -> Result<HitoFile, String> {
    let hito_path = get_hito_file_path(&directory, filename.as_deref());
    
    if !hito_path.exists() {
        return Ok(HitoFile {
            categories: Vec::new(),
            image_categories: Vec::new(),
            hotkeys: Vec::new(),
        });
    }
    
    match fs::read_to_string(&hito_path) {
        Ok(content) => {
            match serde_json::from_str::<HitoFile>(&content) {
                Ok(data) => Ok(data),
                Err(e) => Err(format!("Failed to parse .hito.json file: {}", e)),
            }
        }
        Err(e) => Err(format!("Failed to read .hito.json file: {}", e)),
    }
}

/// Save categories and hotkeys to .hito.json in the specified directory.
#[tauri::command]
fn save_hito_config(
    directory: String,
    categories: Vec<CategoryData>,
    image_categories: Vec<(String, Vec<String>)>,
    hotkeys: Vec<HotkeyData>,
    filename: Option<String>,
) -> Result<(), String> {
    let hito_path = get_hito_file_path(&directory, filename.as_deref());
    
    let data = HitoFile {
        categories,
        image_categories,
        hotkeys,
    };
    
    let json_content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize .hito.json: {}", e))?;
    
    fs::write(&hito_path, json_content)
        .map_err(|e| format!("Failed to write .hito.json file: {}", e))?;
    
    Ok(())
}

/// Initializes and runs the Tauri application with configured plugins and invoke handlers.
///
/// This starts the application builder with the opener and dialog plugins,
/// registers the `list_images`, `load_image`, `get_parent_directory`, and `delete_image` invoke handlers,
/// and runs the application event loop.
///
/// # Examples
///
/// ```no_run
/// fn main() {
///     // Starts the desktop application (blocks until the app exits).
///     your_crate_name::run();
/// }
/// ```
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![list_images, load_image, get_parent_directory, delete_image, load_hito_config, save_hito_config])
        .setup(|_app| {
            // File drops in Tauri 2.0 are handled through the event system
            // JavaScript will listen for tauri://drag-drop events
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}