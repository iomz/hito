use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use chrono;

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

#[derive(Serialize, Deserialize)]
struct HitoFile {
    categories: Vec<CategoryData>,
    image_categories: Vec<(String, Vec<CategoryAssignment>)>,
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
    image_categories: Vec<(String, Vec<CategoryAssignment>)>,
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
///     your_crate_name::run();
/// }
/// ```
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![list_images, load_image, get_parent_directory, delete_image, load_hito_config, save_hito_config, sort_images])
        .setup(|_app| {
            // File drops in Tauri 2.0 are handled through the event system
            // JavaScript will listen for tauri://drag-drop events
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}