use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use chrono;
use tauri::{AppHandle, Manager};

// Type alias for data file path mapping (directory -> data file path)
type DataFileMap = HashMap<String, String>;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct ImagePath {
    path: String,
    size: Option<u64>, // File size in bytes
    created_at: Option<String>, // ISO 8601 datetime string
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct DirectoryPath {
    path: String,
    size: Option<u64>, // Not calculated for directories (None)
    created_at: Option<String>, // ISO 8601 datetime string
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
/// ```no_run
/// use std::path::PathBuf;
/// // This is a Tauri command, so it must be called from the frontend
/// // Example: get_parent_directory(PathBuf::from("/tmp/project/src/main.rs"))
/// ```
#[tauri::command]
fn get_parent_directory(file_path: PathBuf) -> Result<String, String> {
    if let Some(parent) = file_path.parent() {
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
/// `bmp`, `webp`, `svg`, `ico`). Results are sorted by path.
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
                            // Get creation time if available
                            let created_at = fs::metadata(&file_path)
                                .ok()
                                .and_then(|metadata| metadata.created().ok())
                                .and_then(|time| {
                                    time.duration_since(UNIX_EPOCH)
                                        .ok()
                                        .map(|duration| {
                                            chrono::DateTime::<chrono::Utc>::from_timestamp(
                                                duration.as_secs() as i64,
                                                duration.subsec_nanos()
                                            )
                                                .map(|dt| dt.to_rfc3339())
                                        })
                                })
                                .flatten();
                            
                            directories.push(DirectoryPath {
                                path: path_str.to_string(),
                                size: None, // Don't calculate folder sizes (too slow with many files)
                                created_at,
                            });
                        }
                    } else if file_path.is_file() {
                        // Check if it's an image file
                        if let Some(extension) = file_path.extension() {
                            let ext_str = extension.to_string_lossy().to_lowercase();
                            if image_extensions.contains(&ext_str.as_str()) {
                                if let Ok(metadata) = fs::metadata(&file_path) {
                                    let file_size = metadata.len();
                                    
                                    if let Some(path_str) = file_path.to_str() {
                                        // Get creation time if available
                                        let created_at = metadata
                                            .created()
                                            .ok()
                                            .and_then(|time| {
                                                time.duration_since(UNIX_EPOCH)
                                                    .ok()
                                                    .map(|duration| {
                                                        chrono::DateTime::<chrono::Utc>::from_timestamp(
                                                            duration.as_secs() as i64,
                                                            duration.subsec_nanos()
                                                        )
                                                            .map(|dt| dt.to_rfc3339())
                                                    })
                                            })
                                            .flatten();
                                        
                                        images.push(ImagePath {
                                            path: path_str.to_string(),
                                            size: Some(file_size),
                                            created_at,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // Directories will be sorted later in combination with images
            // For now, just keep them in path order as a default
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
/// This is a Tauri command that must be called from the frontend.
/// The function returns a data URL string like `"data:image/png;base64,..."` on success.
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

/// Copies an image file to a destination directory.
///
/// Copies the file from `image_path` to `destination_dir`, preserving the filename.
///
/// # Parameters
///
/// * `image_path` - Path to the source image file
/// * `destination_dir` - Path to the destination directory
///
/// # Returns
///
/// `Ok(())` on success, `Err(String)` with an error message if the file cannot be copied.
#[tauri::command]
fn copy_image(image_path: String, destination_dir: String) -> Result<(), String> {
    let source_path = Path::new(&image_path);
    let dest_dir = Path::new(&destination_dir);
    
    if !source_path.exists() {
        return Err(format!("Image does not exist: {}", image_path));
    }
    
    if !source_path.is_file() {
        return Err(format!("Path is not a file: {}", image_path));
    }
    
    if !dest_dir.exists() {
        return Err(format!("Destination directory does not exist: {}", destination_dir));
    }
    
    if !dest_dir.is_dir() {
        return Err(format!("Destination is not a directory: {}", destination_dir));
    }
    
    // Get the filename from the source path
    let filename = match source_path.file_name() {
        Some(name) => name,
        None => return Err(format!("Failed to get filename from: {}", image_path)),
    };
    
    // Construct the destination path
    let dest_path = dest_dir.join(filename);
    
    // Copy the file
    match fs::copy(source_path, &dest_path) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to copy image: {}", e)),
    }
}

/// Moves an image file to a destination directory.
///
/// Moves the file from `image_path` to `destination_dir`, preserving the filename.
/// The source file is removed after being moved.
///
/// # Parameters
///
/// * `image_path` - Path to the source image file
/// * `destination_dir` - Path to the destination directory
///
/// # Returns
///
/// `Ok(())` on success, `Err(String)` with an error message if the file cannot be moved.
#[tauri::command]
fn move_image(image_path: String, destination_dir: String) -> Result<(), String> {
    let source_path = Path::new(&image_path);
    let dest_dir = Path::new(&destination_dir);
    
    if !source_path.exists() {
        return Err(format!("Image does not exist: {}", image_path));
    }
    
    if !source_path.is_file() {
        return Err(format!("Path is not a file: {}", image_path));
    }
    
    if !dest_dir.exists() {
        return Err(format!("Destination directory does not exist: {}", destination_dir));
    }
    
    if !dest_dir.is_dir() {
        return Err(format!("Destination is not a directory: {}", destination_dir));
    }
    
    // Get the filename from the source path
    let filename = match source_path.file_name() {
        Some(name) => name,
        None => return Err(format!("Failed to get filename from: {}", image_path)),
    };
    
    // Construct the destination path
    let dest_path = dest_dir.join(filename);
    
    // Move the file (rename is used for moving files on the same filesystem)
    match fs::rename(source_path, &dest_path) {
        Ok(_) => Ok(()),
        Err(e) => {
            // Check if this is a cross-device error (rename fails across filesystems)
            let is_cross_device = if let Some(raw_err) = e.raw_os_error() {
                #[cfg(unix)]
                {
                    // EXDEV = 18 (cross-device link not permitted)
                    raw_err == 18
                }
                #[cfg(windows)]
                {
                    // ERROR_NOT_SAME_DEVICE = 17 (0x11)
                    raw_err == 17
                }
                #[cfg(not(any(unix, windows)))]
                {
                    false
                }
            } else {
                false
            };
            
            if is_cross_device {
                // Fallback: copy then delete (works across filesystems)
                match fs::copy(source_path, &dest_path) {
                    Ok(_) => {
                        // Copy succeeded, now delete the source
                        fs::remove_file(source_path)
                            .map_err(|del_err| format!("Copied file but failed to remove source: {}", del_err))
                    }
                    Err(copy_err) => Err(format!("Failed to move image across filesystems: {}", copy_err)),
                }
            } else {
                // Not a cross-device error, return the original error
                Err(format!("Failed to move image: {}", e))
            }
        }
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

#[derive(Serialize, Deserialize, Clone)]
struct CategoryAssignment {
    category_id: String,
    assigned_at: String, // ISO 8601 datetime string
}

#[derive(Serialize, Deserialize)]
struct FilterOptions {
    category_id: Option<String>, // None or empty string = no filter, "uncategorized" = special filter
    name_pattern: Option<String>,
    name_operator: Option<String>, // "contains", "startsWith", "endsWith", "exact"
    size_operator: Option<String>, // "largerThan", "lessThan", "between"
    size_value: Option<String>,
    size_value2: Option<String>,
}

// File structure for .hito.json (only contains image assignments)
#[derive(Serialize, Deserialize)]
struct HitoFile {
    image_categories: Vec<(String, Vec<CategoryAssignment>)>,
}

// App data structure for categories and hotkeys (stored in app data directory)
#[derive(Serialize, Deserialize, Default)]
struct AppData {
    categories: Vec<CategoryData>,
    hotkeys: Vec<HotkeyData>,
    data_file_paths: Option<DataFileMap>, // directory -> data file path mapping
}

/// Get the path to the .hito.json file in the directory.
/// If filename is provided, use it; otherwise default to ".hito.json".
fn get_hito_file_path(directory: &str, filename: Option<&str>) -> PathBuf {
    let dir_path = Path::new(directory);
    let file_name = filename.unwrap_or(".hito.json");
    dir_path.join(file_name)
}

/// Get the path to the app data file.
fn get_app_data_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    Ok(app_data_dir.join("app-config.json"))
}

/// Static mutex to coordinate concurrent writes to app-config.json
static APP_DATA_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();

/// Get the app data mutex, initializing it if necessary.
fn get_app_data_mutex() -> &'static Mutex<()> {
    APP_DATA_MUTEX.get_or_init(|| Mutex::new(()))
}

/// Perform a synchronized read-modify-write operation on app-config.json.
/// 
/// This function ensures that concurrent writes to the app data file are serialized
/// to prevent lost updates. The `update_fn` closure receives the current AppData
/// (or default if the file doesn't exist) and should return the updated AppData.
fn update_app_data_sync<F>(app: &AppHandle, update_fn: F) -> Result<(), String>
where
    F: FnOnce(AppData) -> Result<AppData, String>,
{
    let app_data_path = get_app_data_path(app)?;
    let mutex = get_app_data_mutex();
    
    // Lock the mutex to serialize all file operations
    let _guard = mutex.lock().map_err(|e| format!("Failed to acquire app data lock: {}", e))?;
    
    // Read current app data (or default if file doesn't exist)
    let current_data = if app_data_path.exists() {
        match fs::read_to_string(&app_data_path) {
            Ok(content) => {
                serde_json::from_str::<AppData>(&content)
                    .map_err(|e| format!("Failed to parse app data file: {}", e))?
            }
            Err(e) => return Err(format!("Failed to read app data file: {}", e)),
        }
    } else {
        AppData::default()
    };
    
    // Apply the update function
    let updated_data = update_fn(current_data)?;
    
    // Write the updated data back to the file
    let json_content = serde_json::to_string_pretty(&updated_data)
        .map_err(|e| format!("Failed to serialize app data: {}", e))?;
    
    fs::write(&app_data_path, json_content)
        .map_err(|e| format!("Failed to write app data file: {}", e))?;
    
    Ok(())
}

/// Load categories and hotkeys from app data directory.
#[tauri::command]
fn load_app_data(app: AppHandle) -> Result<AppData, String> {
    let app_data_path = get_app_data_path(&app)?;
    let mutex = get_app_data_mutex();
    
    // Lock the mutex to ensure we don't read during a write
    let _guard = mutex.lock().map_err(|e| format!("Failed to acquire app data lock: {}", e))?;
    
    if !app_data_path.exists() {
        return Ok(AppData::default());
    }
    
    match fs::read_to_string(&app_data_path) {
        Ok(content) => {
            match serde_json::from_str::<AppData>(&content) {
                Ok(data) => Ok(data),
                Err(e) => Err(format!("Failed to parse app data file: {}", e)),
            }
        }
        Err(e) => Err(format!("Failed to read app data file: {}", e)),
    }
}

/// Save data file path mapping for a directory.
#[tauri::command]
fn save_data_file_path(
    app: AppHandle,
    directory: String,
    data_file_path: String,
) -> Result<(), String> {
    update_app_data_sync(&app, |mut app_data| {
        // Initialize or update data_file_paths
        app_data.data_file_paths
            .get_or_insert_with(DataFileMap::new)
            .insert(directory, data_file_path);
        Ok(app_data)
    })
}

/// Get data file path for a directory.
#[tauri::command]
fn get_data_file_path(
    app: AppHandle,
    directory: String,
) -> Result<Option<String>, String> {
    let app_data_path = get_app_data_path(&app)?;
    let mutex = get_app_data_mutex();
    
    // Lock the mutex to ensure we don't read during a write
    let _guard = mutex.lock().map_err(|e| format!("Failed to acquire app data lock: {}", e))?;
    
    if !app_data_path.exists() {
        return Ok(None);
    }
    
    match fs::read_to_string(&app_data_path) {
        Ok(content) => {
            match serde_json::from_str::<AppData>(&content) {
                Ok(data) => {
                    if let Some(paths) = data.data_file_paths {
                        Ok(paths.get(&directory).cloned())
                    } else {
                        Ok(None)
                    }
                }
                Err(e) => Err(format!(
                    "Failed to parse app data file at {}: {}",
                    app_data_path.display(),
                    e
                )),
            }
        }
        Err(e) => Err(format!(
            "Failed to read app data file at {}: {}",
            app_data_path.display(),
            e
        )),
    }
}

/// Save categories and hotkeys to app data directory.
#[tauri::command]
fn save_app_data(
    app: AppHandle,
    categories: Vec<CategoryData>,
    hotkeys: Vec<HotkeyData>,
) -> Result<(), String> {
    update_app_data_sync(&app, |mut app_data| {
        // Update categories and hotkeys while preserving data_file_paths
        app_data.categories = categories;
        app_data.hotkeys = hotkeys;
        Ok(app_data)
    })
}

/// Load image category assignments from .hito.json in the specified directory.
#[tauri::command]
fn load_hito_config(directory: String, filename: Option<String>) -> Result<HitoFile, String> {
    let hito_path = get_hito_file_path(&directory, filename.as_deref());
    
    if !hito_path.exists() {
        return Ok(HitoFile {
            image_categories: Vec::new(),
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

/// Save image category assignments to .hito.json in the specified directory.
#[tauri::command]
fn save_hito_config(
    directory: String,
    image_categories: Vec<(String, Vec<CategoryAssignment>)>,
    filename: Option<String>,
) -> Result<(), String> {
    let hito_path = get_hito_file_path(&directory, filename.as_deref());
    
    let data = HitoFile {
        image_categories,
    };
    
    let json_content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize .hito.json: {}", e))?;
    
    fs::write(&hito_path, json_content)
        .map_err(|e| format!("Failed to write .hito.json file: {}", e))?;
    
    Ok(())
}

/// Filter and sort images based on the specified filter and sort options.
///
/// # Parameters
/// * `images` - Vector of images with metadata to filter and sort
/// * `sort_option` - Sort option: "name", "dateCreated", "lastCategorized", or "size"
/// * `sort_direction` - Sort direction: "ascending" or "descending"
/// * `image_categories` - Map of image path to category assignments (for filtering and lastCategorized sorting)
/// * `filter_options` - Optional filter options (if None, no filtering is applied)
///
/// # Returns
/// Filtered and sorted vector of images
#[tauri::command]
fn sort_images(
    images: Vec<ImagePath>,
    sort_option: String,
    sort_direction: String,
    image_categories: Vec<(String, Vec<CategoryAssignment>)>,
    filter_options: Option<FilterOptions>,
) -> Result<Vec<ImagePath>, String> {
    // Convert image_categories to a HashMap for faster lookup
    let category_map: std::collections::HashMap<String, Vec<CategoryAssignment>> = 
        image_categories.into_iter().collect();
    
    // Filter first (more efficient than sorting then filtering)
    let mut filtered_images: Vec<ImagePath> = images;
    
    if let Some(filters) = filter_options {
        // Apply category filter
        if let Some(category_id) = filters.category_id {
            if !category_id.is_empty() {
                if category_id == "uncategorized" {
                    // Filter for images with no categories
                    filtered_images.retain(|img| {
                        category_map.get(&img.path).map_or(true, |assignments| assignments.is_empty())
                    });
                } else {
                    // Filter for images with the specified category
                    filtered_images.retain(|img| {
                        category_map.get(&img.path).map_or(false, |assignments| {
                            assignments.iter().any(|a| a.category_id == category_id)
                        })
                    });
                }
            }
        }
        
        // Apply name filter
        if let Some(name_pattern) = filters.name_pattern {
            if !name_pattern.is_empty() {
                let pattern = name_pattern.to_lowercase();
                let operator = filters.name_operator.as_deref().unwrap_or("contains");
                
                filtered_images.retain(|img| {
                    let file_name = Path::new(&img.path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|s| s.to_lowercase())
                        .unwrap_or_default();
                    
                    match operator {
                        "startsWith" => file_name.starts_with(&pattern),
                        "endsWith" => file_name.ends_with(&pattern),
                        "exact" => file_name == pattern,
                        _ => file_name.contains(&pattern), // "contains" or default
                    }
                });
            }
        }
        
        // Apply size filter
        if let Some(size_value_str) = &filters.size_value {
            if !size_value_str.is_empty() {
                // Parse size value as KB and convert to bytes (1 KB = 1024 bytes)
                if let Ok(size_value_kb) = size_value_str.parse::<u64>() {
                    let size_value_bytes = size_value_kb * 1024;
                    let operator = filters.size_operator.as_deref().unwrap_or("largerThan");
                    
                    match operator {
                        "lessThan" => {
                            filtered_images.retain(|img| {
                                let img_size = img.size.unwrap_or(0);
                                img_size < size_value_bytes
                            });
                        }
                        "between" => {
                            // For "between", we need size_value2
                            if let Some(size_value2_str) = &filters.size_value2 {
                                if !size_value2_str.is_empty() {
                                    if let Ok(size_value2_kb) = size_value2_str.parse::<u64>() {
                                        let size_value2_bytes = size_value2_kb * 1024;
                                        let min_size = size_value_bytes.min(size_value2_bytes);
                                        let max_size = size_value_bytes.max(size_value2_bytes);
                                        filtered_images.retain(|img| {
                                            let img_size = img.size.unwrap_or(0);
                                            img_size >= min_size && img_size <= max_size
                                        });
                                    }
                                }
                            }
                        }
                        _ => {
                            // "largerThan" or default
                            filtered_images.retain(|img| {
                                let img_size = img.size.unwrap_or(0);
                                img_size > size_value_bytes
                            });
                        }
                    }
                }
            }
        }
    }
    
    let mut sorted_images = filtered_images;
    
    // Determine if we should reverse the sort order
    let is_descending = sort_direction == "descending";
    
    match sort_option.as_str() {
        "name" => {
            sorted_images.sort_by(|a, b| {
                let name_a = Path::new(&a.path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                let name_b = Path::new(&b.path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                let ordering = name_a.cmp(&name_b);
                if is_descending {
                    ordering.reverse()
                } else {
                    ordering
                }
            });
        }
        "size" => {
            sorted_images.sort_by(|a, b| {
                let size_a = a.size.unwrap_or(0);
                let size_b = b.size.unwrap_or(0);
                let ordering = size_a.cmp(&size_b);
                if is_descending {
                    ordering.reverse()
                } else {
                    ordering
                }
            });
        }
        "dateCreated" => {
            sorted_images.sort_by(|a, b| {
                let date_a = a.created_at.as_ref()
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                    .map(|dt| dt.timestamp());
                let date_b = b.created_at.as_ref()
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                    .map(|dt| dt.timestamp());
                
                // Sort by date, with None values last
                let ordering = match (date_a, date_b) {
                    (Some(a), Some(b)) => a.cmp(&b),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => std::cmp::Ordering::Equal,
                };
                if is_descending {
                    ordering.reverse()
                } else {
                    ordering
                }
            });
        }
        "lastCategorized" => {
            sorted_images.sort_by(|a, b| {
                let get_latest_assignment = |path: &str| -> i64 {
                    category_map.get(path)
                        .and_then(|assignments| {
                            if assignments.is_empty() {
                                None
                            } else {
                                assignments.iter()
                                    .filter_map(|assignment| {
                                        chrono::DateTime::parse_from_rfc3339(&assignment.assigned_at)
                                            .ok()
                                            .map(|dt| dt.timestamp())
                                    })
                                    .max()
                            }
                        })
                        .unwrap_or(0) // Uncategorized images get 0, matching JavaScript behavior
                };
                
                let date_a = get_latest_assignment(&a.path);
                let date_b = get_latest_assignment(&b.path);
                
                let ordering = date_a.cmp(&date_b);
                if is_descending {
                    ordering.reverse()
                } else {
                    ordering
                }
            });
        }
        _ => {
            // Unknown sort option, return as-is
        }
    }
    
    Ok(sorted_images)
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
///     hito_lib::run();
/// }
/// ```
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![list_images, load_image, get_parent_directory, delete_image, copy_image, move_image, load_app_data, save_app_data, save_data_file_path, get_data_file_path, load_hito_config, save_hito_config, sort_images])
        .setup(|_app| {
            // File drops in Tauri 2.0 are handled through the event system
            // JavaScript will listen for tauri://drag-drop events
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_get_parent_directory() {
        // Test normal path
        assert_eq!(
            get_parent_directory(PathBuf::from("/tmp/project/src/main.rs")).unwrap(),
            "/tmp/project/src"
        );

        // Test Windows-style path
        #[cfg(windows)]
        {
            assert_eq!(
                get_parent_directory(PathBuf::from("C:\\Users\\test\\file.txt")).unwrap(),
                "C:\\Users\\test"
            );
        }

        // Test path with no parent (root)
        assert!(get_parent_directory(PathBuf::from("/")).is_err());

        // Test single filename
        assert!(get_parent_directory(PathBuf::from("file.txt")).is_ok());
    }

    #[test]
    fn test_sort_images_by_name() {
        let images = vec![
            ImagePath {
                path: "/test/zebra.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
            ImagePath {
                path: "/test/apple.jpg".to_string(),
                size: Some(2000),
                created_at: None,
            },
            ImagePath {
                path: "/test/banana.jpg".to_string(),
                size: Some(1500),
                created_at: None,
            },
        ];

        // Test ascending sort
        let result = sort_images(
            images.clone(),
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].path, "/test/apple.jpg");
        assert_eq!(result[1].path, "/test/banana.jpg");
        assert_eq!(result[2].path, "/test/zebra.jpg");

        // Test descending sort
        let result = sort_images(
            images,
            "name".to_string(),
            "descending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].path, "/test/zebra.jpg");
        assert_eq!(result[1].path, "/test/banana.jpg");
        assert_eq!(result[2].path, "/test/apple.jpg");
    }

    #[test]
    fn test_sort_images_by_size() {
        let images = vec![
            ImagePath {
                path: "/test/large.jpg".to_string(),
                size: Some(3000),
                created_at: None,
            },
            ImagePath {
                path: "/test/small.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
            ImagePath {
                path: "/test/medium.jpg".to_string(),
                size: Some(2000),
                created_at: None,
            },
        ];

        // Test ascending sort
        let result = sort_images(
            images.clone(),
            "size".to_string(),
            "ascending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].size, Some(1000));
        assert_eq!(result[1].size, Some(2000));
        assert_eq!(result[2].size, Some(3000));

        // Test descending sort
        let result = sort_images(
            images,
            "size".to_string(),
            "descending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].size, Some(3000));
        assert_eq!(result[1].size, Some(2000));
        assert_eq!(result[2].size, Some(1000));
    }

    #[test]
    fn test_sort_images_by_date_created() {
        let images = vec![
            ImagePath {
                path: "/test/new.jpg".to_string(),
                size: Some(1000),
                created_at: Some("2024-01-03T00:00:00Z".to_string()),
            },
            ImagePath {
                path: "/test/old.jpg".to_string(),
                size: Some(2000),
                created_at: Some("2024-01-01T00:00:00Z".to_string()),
            },
            ImagePath {
                path: "/test/middle.jpg".to_string(),
                size: Some(1500),
                created_at: Some("2024-01-02T00:00:00Z".to_string()),
            },
        ];

        // Test ascending sort
        let result = sort_images(
            images.clone(),
            "dateCreated".to_string(),
            "ascending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].path, "/test/old.jpg");
        assert_eq!(result[1].path, "/test/middle.jpg");
        assert_eq!(result[2].path, "/test/new.jpg");

        // Test descending sort
        let result = sort_images(
            images,
            "dateCreated".to_string(),
            "descending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].path, "/test/new.jpg");
        assert_eq!(result[1].path, "/test/middle.jpg");
        assert_eq!(result[2].path, "/test/old.jpg");
    }

    #[test]
    fn test_sort_images_by_last_categorized() {
        let images = vec![
            ImagePath {
                path: "/test/img1.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
            ImagePath {
                path: "/test/img2.jpg".to_string(),
                size: Some(2000),
                created_at: None,
            },
            ImagePath {
                path: "/test/img3.jpg".to_string(),
                size: Some(1500),
                created_at: None,
            },
        ];

        let image_categories = vec![
            (
                "/test/img1.jpg".to_string(),
                vec![CategoryAssignment {
                    category_id: "cat1".to_string(),
                    assigned_at: "2024-01-03T00:00:00Z".to_string(),
                }],
            ),
            (
                "/test/img2.jpg".to_string(),
                vec![CategoryAssignment {
                    category_id: "cat1".to_string(),
                    assigned_at: "2024-01-01T00:00:00Z".to_string(),
                }],
            ),
            // img3 has no categories (uncategorized)
        ];

        // Test ascending sort (uncategorized first, then by date)
        let result = sort_images(
            images.clone(),
            "lastCategorized".to_string(),
            "ascending".to_string(),
            image_categories.clone(),
            None,
        )
        .unwrap();

        // img3 (uncategorized, timestamp 0) should be first
        assert_eq!(result[0].path, "/test/img3.jpg");
        assert_eq!(result[1].path, "/test/img2.jpg"); // older category date
        assert_eq!(result[2].path, "/test/img1.jpg"); // newer category date

        // Test descending sort
        let result = sort_images(
            images,
            "lastCategorized".to_string(),
            "descending".to_string(),
            image_categories,
            None,
        )
        .unwrap();

        assert_eq!(result[0].path, "/test/img1.jpg"); // newest category date
        assert_eq!(result[1].path, "/test/img2.jpg"); // older category date
        assert_eq!(result[2].path, "/test/img3.jpg"); // uncategorized last
    }

    #[test]
    fn test_filter_by_category() {
        let images = vec![
            ImagePath {
                path: "/test/img1.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
            ImagePath {
                path: "/test/img2.jpg".to_string(),
                size: Some(2000),
                created_at: None,
            },
            ImagePath {
                path: "/test/img3.jpg".to_string(),
                size: Some(1500),
                created_at: None,
            },
        ];

        let image_categories = vec![
            (
                "/test/img1.jpg".to_string(),
                vec![CategoryAssignment {
                    category_id: "cat1".to_string(),
                    assigned_at: "2024-01-01T00:00:00Z".to_string(),
                }],
            ),
            (
                "/test/img2.jpg".to_string(),
                vec![CategoryAssignment {
                    category_id: "cat2".to_string(),
                    assigned_at: "2024-01-01T00:00:00Z".to_string(),
                }],
            ),
            // img3 has no categories
        ];

        // Filter by category
        let filter_options = FilterOptions {
            category_id: Some("cat1".to_string()),
            name_pattern: None,
            name_operator: None,
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images.clone(),
            "name".to_string(),
            "ascending".to_string(),
            image_categories.clone(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/img1.jpg");

        // Filter for uncategorized
        let filter_options = FilterOptions {
            category_id: Some("uncategorized".to_string()),
            name_pattern: None,
            name_operator: None,
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            image_categories,
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/img3.jpg");
    }

    #[test]
    fn test_filter_by_name() {
        let images = vec![
            ImagePath {
                path: "/test/apple.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
            ImagePath {
                path: "/test/banana.jpg".to_string(),
                size: Some(2000),
                created_at: None,
            },
            ImagePath {
                path: "/test/grape.jpg".to_string(),
                size: Some(1500),
                created_at: None,
            },
        ];

        // Test contains filter
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: Some("an".to_string()),
            name_operator: Some("contains".to_string()),
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images.clone(),
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        // "an" matches "banana" but not "grape" or "apple"
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/banana.jpg");

        // Test startsWith filter
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: Some("app".to_string()),
            name_operator: Some("startsWith".to_string()),
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images.clone(),
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/apple.jpg");

        // Test endsWith filter
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: Some("ana.jpg".to_string()),
            name_operator: Some("endsWith".to_string()),
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images.clone(),
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/banana.jpg");

        // Test exact match filter
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: Some("grape.jpg".to_string()),
            name_operator: Some("exact".to_string()),
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/grape.jpg");
    }

    #[test]
    fn test_filter_by_size() {
        let images = vec![
            ImagePath {
                path: "/test/small.jpg".to_string(),
                size: Some(1024), // 1 KB
                created_at: None,
            },
            ImagePath {
                path: "/test/medium.jpg".to_string(),
                size: Some(5120), // 5 KB
                created_at: None,
            },
            ImagePath {
                path: "/test/large.jpg".to_string(),
                size: Some(10240), // 10 KB
                created_at: None,
            },
        ];

        // Test largerThan filter
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: None,
            name_operator: None,
            size_operator: Some("largerThan".to_string()),
            size_value: Some("3".to_string()), // 3 KB
            size_value2: None,
        };

        let result = sort_images(
            images.clone(),
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.iter().any(|img| img.path == "/test/medium.jpg"));
        assert!(result.iter().any(|img| img.path == "/test/large.jpg"));

        // Test lessThan filter
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: None,
            name_operator: None,
            size_operator: Some("lessThan".to_string()),
            size_value: Some("3".to_string()), // 3 KB
            size_value2: None,
        };

        let result = sort_images(
            images.clone(),
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/small.jpg");

        // Test between filter
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: None,
            name_operator: None,
            size_operator: Some("between".to_string()),
            size_value: Some("2".to_string()), // 2 KB
            size_value2: Some("8".to_string()), // 8 KB
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/medium.jpg");
    }

    #[test]
    fn test_combined_filters() {
        let images = vec![
            ImagePath {
                path: "/test/apple.jpg".to_string(),
                size: Some(1024),
                created_at: None,
            },
            ImagePath {
                path: "/test/banana.jpg".to_string(),
                size: Some(5120),
                created_at: None,
            },
            ImagePath {
                path: "/test/grape.jpg".to_string(),
                size: Some(10240),
                created_at: None,
            },
        ];

        let image_categories = vec![(
            "/test/apple.jpg".to_string(),
            vec![CategoryAssignment {
                category_id: "fruit".to_string(),
                assigned_at: "2024-01-01T00:00:00Z".to_string(),
            }],
        )];

        // Combine category and size filters
        let filter_options = FilterOptions {
            category_id: Some("fruit".to_string()),
            name_pattern: None,
            name_operator: None,
            size_operator: Some("lessThan".to_string()),
            size_value: Some("5".to_string()), // 5 KB
            size_value2: None,
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            image_categories,
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/apple.jpg");
    }

    #[test]
    fn test_list_images_with_temp_dir() {
        let temp_dir = TempDir::new().unwrap();
        let test_dir = temp_dir.path();

        // Create subdirectories
        fs::create_dir_all(test_dir.join("subdir1")).unwrap();
        fs::create_dir_all(test_dir.join("subdir2")).unwrap();

        // Create image files
        let mut file1 = fs::File::create(test_dir.join("image1.jpg")).unwrap();
        file1.write_all(b"fake image data").unwrap();
        drop(file1);

        let mut file2 = fs::File::create(test_dir.join("image2.png")).unwrap();
        file2.write_all(b"fake image data").unwrap();
        drop(file2);

        // Create non-image file (should be ignored)
        let mut file3 = fs::File::create(test_dir.join("text.txt")).unwrap();
        file3.write_all(b"not an image").unwrap();
        drop(file3);

        let result = list_images(test_dir.to_str().unwrap().to_string()).unwrap();

        // Should find 2 images
        assert_eq!(result.images.len(), 2);
        assert!(result.images.iter().any(|img| img.path.contains("image1.jpg")));
        assert!(result.images.iter().any(|img| img.path.contains("image2.png")));

        // Should find 2 directories
        assert_eq!(result.directories.len(), 2);
        assert!(result
            .directories
            .iter()
            .any(|dir| dir.path.contains("subdir1")));
        assert!(result
            .directories
            .iter()
            .any(|dir| dir.path.contains("subdir2")));
    }

    #[test]
    fn test_list_images_nonexistent_path() {
        let result = list_images("/nonexistent/path/that/does/not/exist".to_string());
        match result {
            Err(e) => assert!(e.contains("does not exist")),
            Ok(_) => panic!("Expected error for nonexistent path"),
        }
    }

    #[test]
    fn test_list_images_not_a_directory() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("file.txt");
        fs::File::create(&test_file).unwrap();

        let result = list_images(test_file.to_str().unwrap().to_string());
        match result {
            Err(e) => assert!(e.contains("not a directory")),
            Ok(_) => panic!("Expected error for file path"),
        }
    }

    #[test]
    fn test_load_image_with_temp_file() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.png");

        // Create a minimal PNG file (1x1 pixel PNG)
        let png_data = vec![
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // ...more PNG data
        ];
        fs::write(&test_file, &png_data).unwrap();

        let result = load_image(test_file.to_str().unwrap().to_string()).unwrap();

        assert!(result.starts_with("data:image/png;base64,"));
        assert!(result.len() > 30); // Should have base64 data
    }

    #[test]
    fn test_load_image_nonexistent() {
        let result = load_image("/nonexistent/image.jpg".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_load_image_mime_types() {
        let temp_dir = TempDir::new().unwrap();

        // Test different image extensions
        let extensions = vec![
            ("jpg", "image/jpeg"),
            ("jpeg", "image/jpeg"),
            ("png", "image/png"),
            ("gif", "image/gif"),
            ("bmp", "image/bmp"),
            ("webp", "image/webp"),
            ("svg", "image/svg+xml"),
            ("ico", "image/x-icon"),
        ];

        for (ext, expected_mime) in extensions {
            let test_file = temp_dir.path().join(format!("test.{}", ext));
            fs::File::create(&test_file).unwrap();

            let result = load_image(test_file.to_str().unwrap().to_string()).unwrap();
            assert!(
                result.starts_with(&format!("data:{};base64,", expected_mime)),
                "Failed for extension: {}",
                ext
            );
        }
    }

    #[test]
    fn test_hito_file_serialization() {
        let hito_file = HitoFile {
            image_categories: vec![(
                "/test/image.jpg".to_string(),
                vec![CategoryAssignment {
                    category_id: "cat1".to_string(),
                    assigned_at: "2024-01-01T00:00:00Z".to_string(),
                }],
            )],
        };

        let json = serde_json::to_string_pretty(&hito_file).unwrap();
        let deserialized: HitoFile = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.image_categories.len(), 1);
        assert_eq!(
            deserialized.image_categories[0].0,
            "/test/image.jpg"
        );
        assert_eq!(
            deserialized.image_categories[0].1[0].category_id,
            "cat1"
        );
    }

    #[test]
    fn test_app_data_serialization() {
        let app_data = AppData {
            categories: vec![CategoryData {
                id: "cat1".to_string(),
                name: "Test Category".to_string(),
                color: "#FF0000".to_string(),
            }],
            hotkeys: vec![HotkeyData {
                id: "hotkey1".to_string(),
                key: "j".to_string(),
                modifiers: vec!["Control".to_string()],
                action: "next".to_string(),
            }],
            data_file_paths: Some({
                let mut map = DataFileMap::new();
                map.insert("/test/dir".to_string(), "/custom/path.json".to_string());
                map
            }),
        };

        let json = serde_json::to_string_pretty(&app_data).unwrap();
        let deserialized: AppData = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.categories.len(), 1);
        assert_eq!(deserialized.hotkeys.len(), 1);
        assert!(deserialized.data_file_paths.is_some());
        assert_eq!(
            deserialized
                .data_file_paths
                .as_ref()
                .unwrap()
                .get("/test/dir"),
            Some(&"/custom/path.json".to_string())
        );
    }

    #[test]
    fn test_delete_image() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.jpg");
        
        // Create a test file
        fs::File::create(&test_file).unwrap();
        assert!(test_file.exists());

        // Delete the image
        let result = delete_image(test_file.to_str().unwrap().to_string());
        assert!(result.is_ok());
        
        // Verify the file was actually removed from the original path
        // On all supported platforms (macOS, Linux, Windows), moving to trash removes
        // the file from its original location, so it should no longer exist here
        assert!(!test_file.exists(), "File should be removed from original path after deletion");
    }

    #[test]
    fn test_delete_image_nonexistent() {
        let result = delete_image("/nonexistent/image.jpg".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_delete_image_not_a_file() {
        let temp_dir = TempDir::new().unwrap();
        let test_dir = temp_dir.path().join("subdir");
        fs::create_dir_all(&test_dir).unwrap();

        let result = delete_image(test_dir.to_str().unwrap().to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a file"));
    }

    #[test]
    fn test_load_hito_config_nonexistent() {
        let temp_dir = TempDir::new().unwrap();
        let result = load_hito_config(temp_dir.path().to_str().unwrap().to_string(), None).unwrap();
        assert_eq!(result.image_categories.len(), 0);
    }

    #[test]
    fn test_load_hito_config_with_file() {
        let temp_dir = TempDir::new().unwrap();
        let hito_file = temp_dir.path().join(".hito.json");
        
        let test_data = HitoFile {
            image_categories: vec![(
                "/test/image.jpg".to_string(),
                vec![CategoryAssignment {
                    category_id: "cat1".to_string(),
                    assigned_at: "2024-01-01T00:00:00Z".to_string(),
                }],
            )],
        };
        
        let json = serde_json::to_string_pretty(&test_data).unwrap();
        fs::write(&hito_file, json).unwrap();

        let result = load_hito_config(temp_dir.path().to_str().unwrap().to_string(), None).unwrap();
        assert_eq!(result.image_categories.len(), 1);
        assert_eq!(result.image_categories[0].0, "/test/image.jpg");
    }

    #[test]
    fn test_load_hito_config_custom_filename() {
        let temp_dir = TempDir::new().unwrap();
        let custom_file = temp_dir.path().join("custom.json");
        
        let test_data = HitoFile {
            image_categories: vec![(
                "/test/image.jpg".to_string(),
                vec![CategoryAssignment {
                    category_id: "cat1".to_string(),
                    assigned_at: "2024-01-01T00:00:00Z".to_string(),
                }],
            )],
        };
        
        let json = serde_json::to_string_pretty(&test_data).unwrap();
        fs::write(&custom_file, json).unwrap();

        let result = load_hito_config(
            temp_dir.path().to_str().unwrap().to_string(),
            Some("custom.json".to_string()),
        ).unwrap();
        assert_eq!(result.image_categories.len(), 1);
    }

    #[test]
    fn test_load_hito_config_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        let hito_file = temp_dir.path().join(".hito.json");
        fs::write(&hito_file, "invalid json").unwrap();

        let result = load_hito_config(temp_dir.path().to_str().unwrap().to_string(), None);
        match result {
            Err(e) => assert!(e.contains("Failed to parse")),
            Ok(_) => panic!("Expected error for invalid JSON"),
        }
    }

    #[test]
    fn test_save_hito_config() {
        let temp_dir = TempDir::new().unwrap();
        let hito_file = temp_dir.path().join(".hito.json");

        let image_categories = vec![(
            "/test/image.jpg".to_string(),
            vec![CategoryAssignment {
                category_id: "cat1".to_string(),
                assigned_at: "2024-01-01T00:00:00Z".to_string(),
            }],
        )];

        let result = save_hito_config(
            temp_dir.path().to_str().unwrap().to_string(),
            image_categories,
            None,
        );
        assert!(result.is_ok());
        assert!(hito_file.exists());

        // Verify the file content
        let content = fs::read_to_string(&hito_file).unwrap();
        let loaded: HitoFile = serde_json::from_str(&content).unwrap();
        assert_eq!(loaded.image_categories.len(), 1);
    }

    #[test]
    fn test_save_hito_config_custom_filename() {
        let temp_dir = TempDir::new().unwrap();
        let custom_file = temp_dir.path().join("custom.json");

        let image_categories = vec![(
            "/test/image.jpg".to_string(),
            vec![CategoryAssignment {
                category_id: "cat1".to_string(),
                assigned_at: "2024-01-01T00:00:00Z".to_string(),
            }],
        )];

        let result = save_hito_config(
            temp_dir.path().to_str().unwrap().to_string(),
            image_categories,
            Some("custom.json".to_string()),
        );
        assert!(result.is_ok());
        assert!(custom_file.exists());
    }

    #[test]
    fn test_sort_images_unknown_option() {
        let images = vec![
            ImagePath {
                path: "/test/img1.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
        ];

        // Test with unknown sort option
        let result = sort_images(
            images.clone(),
            "unknown".to_string(),
            "ascending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        // Should return images as-is (no sorting applied)
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].path, "/test/img1.jpg");
    }

    #[test]
    fn test_list_images_files_without_extension() {
        let temp_dir = TempDir::new().unwrap();
        let test_dir = temp_dir.path();

        // Create file without extension (should be ignored)
        let mut file1 = fs::File::create(test_dir.join("noextension")).unwrap();
        file1.write_all(b"fake data").unwrap();
        drop(file1);

        // Create image file
        let mut file2 = fs::File::create(test_dir.join("image.jpg")).unwrap();
        file2.write_all(b"fake image").unwrap();
        drop(file2);

        let result = list_images(test_dir.to_str().unwrap().to_string()).unwrap();

        // Should only find the image file
        assert_eq!(result.images.len(), 1);
        assert!(result.images[0].path.contains("image.jpg"));
    }

    #[test]
    fn test_list_images_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let result = list_images(temp_dir.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(result.images.len(), 0);
        assert_eq!(result.directories.len(), 0);
    }

    #[test]
    fn test_load_image_read_error() {
        // Test with a directory instead of a file (should fail with "not a file")
        let temp_dir = TempDir::new().unwrap();
        let test_dir = temp_dir.path().join("subdir");
        fs::create_dir_all(&test_dir).unwrap();

        let result = load_image(test_dir.to_str().unwrap().to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a file"));
    }

    #[test]
    fn test_filter_empty_name_pattern() {
        let images = vec![
            ImagePath {
                path: "/test/image.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
        ];

        // Filter with empty name pattern (should not filter anything)
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: Some("".to_string()),
            name_operator: Some("contains".to_string()),
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_filter_empty_category_id() {
        let images = vec![
            ImagePath {
                path: "/test/image.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
        ];

        // Filter with empty category_id (should not filter anything)
        let filter_options = FilterOptions {
            category_id: Some("".to_string()),
            name_pattern: None,
            name_operator: None,
            size_operator: None,
            size_value: None,
            size_value2: None,
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_filter_empty_size_value() {
        let images = vec![
            ImagePath {
                path: "/test/image.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
        ];

        // Filter with empty size_value (should not filter anything)
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: None,
            name_operator: None,
            size_operator: Some("largerThan".to_string()),
            size_value: Some("".to_string()),
            size_value2: None,
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_filter_between_with_empty_size_value2() {
        let images = vec![
            ImagePath {
                path: "/test/image.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
        ];

        // Filter with "between" but empty size_value2 (should not filter)
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: None,
            name_operator: None,
            size_operator: Some("between".to_string()),
            size_value: Some("2".to_string()),
            size_value2: Some("".to_string()),
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_filter_between_with_invalid_size_value2() {
        let images = vec![
            ImagePath {
                path: "/test/image.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
        ];

        // Filter with "between" but invalid size_value2 (should not filter)
        let filter_options = FilterOptions {
            category_id: None,
            name_pattern: None,
            name_operator: None,
            size_operator: Some("between".to_string()),
            size_value: Some("2".to_string()),
            size_value2: Some("invalid".to_string()),
        };

        let result = sort_images(
            images,
            "name".to_string(),
            "ascending".to_string(),
            Vec::new(),
            Some(filter_options),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_sort_images_with_none_size() {
        let images = vec![
            ImagePath {
                path: "/test/img1.jpg".to_string(),
                size: None, // No size
                created_at: None,
            },
            ImagePath {
                path: "/test/img2.jpg".to_string(),
                size: Some(1000),
                created_at: None,
            },
        ];

        // Sort by size - images with None should be treated as 0
        let result = sort_images(
            images,
            "size".to_string(),
            "ascending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].size, None);
        assert_eq!(result[1].size, Some(1000));
    }

    #[test]
    fn test_sort_images_date_created_with_none() {
        let images = vec![
            ImagePath {
                path: "/test/img1.jpg".to_string(),
                size: Some(1000),
                created_at: None, // No date
            },
            ImagePath {
                path: "/test/img2.jpg".to_string(),
                size: Some(2000),
                created_at: Some("2024-01-01T00:00:00Z".to_string()),
            },
        ];

        // Sort by date - images with None should be last
        let result = sort_images(
            images,
            "dateCreated".to_string(),
            "ascending".to_string(),
            Vec::new(),
            None,
        )
        .unwrap();

        assert_eq!(result[0].path, "/test/img2.jpg");
        assert_eq!(result[1].path, "/test/img1.jpg");
    }

    #[test]
    #[cfg(unix)]
    fn test_get_parent_directory_invalid_utf8_path() {
        // This test verifies the error handling for paths that can't be converted to UTF-8
        // We use OsStrExt::from_bytes to create an OsStr with invalid UTF-8 bytes
        use std::os::unix::ffi::OsStrExt;
        
        // Create a path with invalid UTF-8 bytes (0xFF 0xFE is not valid UTF-8)
        let invalid_utf8_bytes = b"/test/\xFF\xFE/file.txt";
        let os_str = std::ffi::OsStr::from_bytes(invalid_utf8_bytes);
        let path_buf = PathBuf::from(os_str);
        
        // The function should return an error because the parent path contains invalid UTF-8
        let result = get_parent_directory(path_buf);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Failed to convert path to string");
    }

    #[test]
    #[cfg(unix)]
    fn test_get_parent_directory_valid_utf8_path() {
        // This test verifies that normal UTF-8 paths work correctly
        let result = get_parent_directory(PathBuf::from("/valid/path/file.txt"));
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "/valid/path");
    }

    #[test]
    fn test_copy_image() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        let dest_dir = temp_dir.path().join("dest");
        let dest_file = dest_dir.join("source.jpg");
        
        // Create source file with content
        fs::create_dir_all(&dest_dir).unwrap();
        fs::write(&source_file, b"fake image data").unwrap();
        assert!(source_file.exists());
        
        // Copy the image
        let result = copy_image(
            source_file.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_ok());
        
        // Verify the destination file exists and has the same content
        assert!(dest_file.exists());
        let source_content = fs::read(&source_file).unwrap();
        let dest_content = fs::read(&dest_file).unwrap();
        assert_eq!(source_content, dest_content);
        
        // Verify the source file still exists (copy doesn't remove source)
        assert!(source_file.exists());
    }

    #[test]
    fn test_copy_image_nonexistent_source() {
        let temp_dir = TempDir::new().unwrap();
        let dest_dir = temp_dir.path().join("dest");
        fs::create_dir_all(&dest_dir).unwrap();
        
        let result = copy_image(
            "/nonexistent/image.jpg".to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_copy_image_not_a_file() {
        let temp_dir = TempDir::new().unwrap();
        let source_dir = temp_dir.path().join("source_dir");
        let dest_dir = temp_dir.path().join("dest");
        fs::create_dir_all(&source_dir).unwrap();
        fs::create_dir_all(&dest_dir).unwrap();
        
        let result = copy_image(
            source_dir.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a file"));
    }

    #[test]
    fn test_copy_image_nonexistent_destination() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        fs::write(&source_file, b"fake image data").unwrap();
        
        let result = copy_image(
            source_file.to_str().unwrap().to_string(),
            "/nonexistent/destination".to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_copy_image_destination_not_a_directory() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        let dest_file = temp_dir.path().join("dest.txt");
        fs::write(&source_file, b"fake image data").unwrap();
        fs::write(&dest_file, b"not a directory").unwrap();
        
        let result = copy_image(
            source_file.to_str().unwrap().to_string(),
            dest_file.to_str().unwrap().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a directory"));
    }

    #[test]
    fn test_copy_image_overwrites_existing() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        let dest_dir = temp_dir.path().join("dest");
        let dest_file = dest_dir.join("source.jpg");
        
        // Create source file
        fs::create_dir_all(&dest_dir).unwrap();
        fs::write(&source_file, b"new image data").unwrap();
        
        // Create existing destination file with different content
        fs::write(&dest_file, b"old image data").unwrap();
        
        // Copy should overwrite the existing file
        let result = copy_image(
            source_file.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_ok());
        
        // Verify the destination file has the new content
        let dest_content = fs::read(&dest_file).unwrap();
        assert_eq!(dest_content, b"new image data");
    }

    #[test]
    fn test_move_image() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        let dest_dir = temp_dir.path().join("dest");
        let dest_file = dest_dir.join("source.jpg");
        
        // Create source file with content
        fs::create_dir_all(&dest_dir).unwrap();
        fs::write(&source_file, b"fake image data").unwrap();
        assert!(source_file.exists());
        
        // Move the image
        let result = move_image(
            source_file.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_ok());
        
        // Verify the destination file exists and has the same content
        assert!(dest_file.exists());
        let dest_content = fs::read(&dest_file).unwrap();
        assert_eq!(dest_content, b"fake image data");
        
        // Verify the source file no longer exists (move removes source)
        assert!(!source_file.exists());
    }

    #[test]
    fn test_move_image_nonexistent_source() {
        let temp_dir = TempDir::new().unwrap();
        let dest_dir = temp_dir.path().join("dest");
        fs::create_dir_all(&dest_dir).unwrap();
        
        let result = move_image(
            "/nonexistent/image.jpg".to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_move_image_not_a_file() {
        let temp_dir = TempDir::new().unwrap();
        let source_dir = temp_dir.path().join("source_dir");
        let dest_dir = temp_dir.path().join("dest");
        fs::create_dir_all(&source_dir).unwrap();
        fs::create_dir_all(&dest_dir).unwrap();
        
        let result = move_image(
            source_dir.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a file"));
    }

    #[test]
    fn test_move_image_nonexistent_destination() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        fs::write(&source_file, b"fake image data").unwrap();
        
        let result = move_image(
            source_file.to_str().unwrap().to_string(),
            "/nonexistent/destination".to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_move_image_destination_not_a_directory() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        let dest_file = temp_dir.path().join("dest.txt");
        fs::write(&source_file, b"fake image data").unwrap();
        fs::write(&dest_file, b"not a directory").unwrap();
        
        let result = move_image(
            source_file.to_str().unwrap().to_string(),
            dest_file.to_str().unwrap().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a directory"));
    }

    #[test]
    fn test_move_image_overwrites_existing() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("source.jpg");
        let dest_dir = temp_dir.path().join("dest");
        let dest_file = dest_dir.join("source.jpg");
        
        // Create source file
        fs::create_dir_all(&dest_dir).unwrap();
        fs::write(&source_file, b"new image data").unwrap();
        
        // Create existing destination file with different content
        fs::write(&dest_file, b"old image data").unwrap();
        
        // Move should overwrite the existing file
        let result = move_image(
            source_file.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_ok());
        
        // Verify the destination file has the new content
        let dest_content = fs::read(&dest_file).unwrap();
        assert_eq!(dest_content, b"new image data");
        
        // Verify the source file no longer exists
        assert!(!source_file.exists());
    }

    #[test]
    fn test_move_image_preserves_filename() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("original_name.jpg");
        let dest_dir = temp_dir.path().join("dest");
        let dest_file = dest_dir.join("original_name.jpg");
        
        fs::create_dir_all(&dest_dir).unwrap();
        fs::write(&source_file, b"fake image data").unwrap();
        
        let result = move_image(
            source_file.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_ok());
        
        // Verify the filename is preserved
        assert!(dest_file.exists());
        assert!(!source_file.exists());
    }

    #[test]
    fn test_copy_image_preserves_filename() {
        let temp_dir = TempDir::new().unwrap();
        let source_file = temp_dir.path().join("original_name.jpg");
        let dest_dir = temp_dir.path().join("dest");
        let dest_file = dest_dir.join("original_name.jpg");
        
        fs::create_dir_all(&dest_dir).unwrap();
        fs::write(&source_file, b"fake image data").unwrap();
        
        let result = copy_image(
            source_file.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
        );
        assert!(result.is_ok());
        
        // Verify the filename is preserved
        assert!(dest_file.exists());
        // Source should still exist (copy doesn't remove source)
        assert!(source_file.exists());
    }

}