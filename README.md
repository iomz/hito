# Hito

![hito-app-icon](https://i.imgur.com/BAqSxE0.png)

[![release](https://github.com/iomz/hito/actions/workflows/release.yml/badge.svg?branch=release)](https://github.com/iomz/hito/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/iomz/hito/graph/badge.svg?token=JUh7WEGnQe)](https://codecov.io/gh/iomz/hito)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A fast and lightweight image browser and organizer built with Tauri 2.0.

`Hito` is named after Human Intelligence Tasks Organizer and "boundary stone" in Spanish as well as "human" (人) in Japanese.
It provides a clean graphical interface to help users organize and categorize images for selective actions.
Simply drag and drop a folder to start browsing your images.

## Features

![demo](https://github.com/user-attachments/assets/6be51dd4-19e8-42f1-b5e8-a574458f3894)

### Image Browsing

- **Drag & Drop**: Drag folders directly into the app to browse images
- **Lazy Loading**: Images load on-demand with infinite scroll for smooth performance
- **Image Carousel**: Click any image to open a full-screen modal with navigation
- **Breadcrumb Navigation**: Click on path segments to navigate to parent directories. The breadcrumb appears next to the logo in the header when browsing a folder
- **Image Statistics**: View total image count and categorized image count in the header, displayed alongside sort/filter controls

### Image Organization

- **Category Management**: Create, edit, and delete custom categories with color coding
- **Category Assignment**: Assign multiple categories to images for flexible organization
- **Badge-Based Filtering & Sorting**: Clean, minimal UI showing only active filters and sorts as badges
  - **Category Filtering**: Filter images by category or view uncategorized images
  - **Name Filtering**: Filter images by filename with operators (contains, starts with, ends with, exact match)
  - **Size Filtering**: Filter images by file size with operators (larger than, less than, or between two values). Size values are specified in KB.
  - **Sorting**: Sort images by name, creation date, last categorized date, or file size
  - Click the "+" button to add new sort/filter options
  - Click any badge to edit, or use the × button to remove
- **Data File Management**: Customize the data file path (`.hito.json`) per directory for flexible storage

### Keyboard Shortcuts

- **Customizable Hotkeys**: Create and manage custom keyboard shortcuts for various actions
- **Modal-Only Navigation**: Arrow keys (← →) and Esc are built-in, modal-only navigation keys that cannot be customized
- **Default Hotkeys**: J and K are pre-configured default hotkeys for navigation (customizable or removable via the Hotkeys sidebar)
- **Global Shortcuts**: `?` key shows/hides the keyboard shortcuts overlay globally
- **Hotkey Actions**: Assign hotkeys to category toggling, navigation, and more

### Data Storage

- **Hybrid Storage Architecture**:
  - Categories and hotkeys stored in app data directory (persistent across directories)
  - Image category assignments stored in `.hito.json` files (directory-specific)
- **Custom Data File Paths**: Configure different data file paths for different directories
- **Automatic Data Migration**: Seamlessly handles data file path changes and reloads

## Install

Download the installer from [the latest release](https://github.com/iomz/hito/releases) for the appropriate platform:

### macOS

- **Apple Silicon (M1/M2/M3)**: `Hito_*_aarch64.dmg` or `Hito_aarch64.app.tar.gz`
- **Intel (x64)**: `Hito_*_x64.dmg` or `Hito_x64.app.tar.gz`

### Windows

- **Installer (recommended)**: `Hito_*_x64-setup.exe`
- **MSI package**: `Hito_*_x64_en-US.msi`

### Linux

- **AppImage (universal)**: `Hito_*_amd64.AppImage`
- **Debian/Ubuntu**: `Hito_*_amd64.deb`
- **Fedora/RHEL**: `Hito-*-1.x86_64.rpm`

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) package manager
- [Rust](https://www.rust-lang.org/) (latest stable)

### Build Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/iomz/hito.git && cd hito
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build the application:

   ```bash
   pnpm run tauri build
   ```

   The built application will be in `src-tauri/target/release/bundle/`.

4. For development (watch mode):

   ```bash
   pnpm run tauri dev
   ```

## Usage

### Basic Navigation

1. **Browse a folder**: Drag and drop a folder onto the drop zone, or click to select a folder
2. **View images**: Click any image thumbnail to open it in full-screen mode
3. **Navigate**: Use arrow keys (← →) to navigate between images in the modal
4. **Navigate directories**: Click on breadcrumb segments to browse parent directories
5. **Go home**: Click the "Hito" title to return to the home screen

### Organizing Images

1. **Open sidebar**: Click the hamburger menu (☰) button in the top-right corner when viewing a directory. The sidebar slides in from the right.
2. **Create categories**: Go to the "Categories" tab and click "+ Add" to create a new category
3. **Assign categories**:
   - In the modal view, click category buttons to assign/unassign categories to the current image
   - Categories are saved automatically to the data file (`.hito.json`)
4. **Filter and sort images**: Use the badge-based filter/sort system in the header:
   - Click the "+" button to add a new sort or filter (category, name, or size)
   - Active filters and sorts appear as badges in the header
   - Click any badge to edit it, or click the × button to remove it
   - For size filtering, select an operator (larger than, less than, or between) and enter the size value(s) in KB. When using "between", enter both the minimum and maximum values.
   - Image statistics (total count and categorized count) are displayed on the right side of the header

### Customizing Hotkeys

1. **Open sidebar**: Click the hamburger menu (☰) button in the top-right corner
2. **Go to Hotkeys tab**: Click the "Hotkeys" tab in the sidebar
3. **Add hotkey**: Click "+ Add Hotkey" to create a new keyboard shortcut
4. **Configure**: Set the key combination and action for your hotkey

### Data File Management

1. **Open sidebar**: Click the hamburger menu (☰) button in the top-right corner
2. **Go to File tab**: Click the "File" tab in the sidebar
3. **Set custom path**: Enter a custom path for the data file (`.hito.json`) for the current directory
4. **Save**: Click "Save" to persist the custom data file path for this directory

## Default Keyboard Shortcuts

### Modal-Only Shortcuts (Built-in, Cannot be Customized)

- `←` / `→` - Previous/Next image in modal
- `Esc` - Close modal (or hide shortcuts overlay if visible)

### Global Shortcuts

- `?` - Show/hide keyboard shortcuts overlay

### Default Hotkeys (Pre-configured, Customizable)

- `J` - Next image (default hotkey, can be edited or removed)
- `K` - Previous image (default hotkey, can be edited or removed)

**Note**: Default hotkeys (J/K) are automatically created on first launch. You can customize or disable them by opening the sidebar (☰), going to the "Hotkeys" tab, and editing or deleting them. Modal-only shortcuts (arrow keys and Esc) are always active when the modal is open and cannot be changed.

## Testing

The project uses [Vitest](https://vitest.dev/) for testing with comprehensive test coverage. Run tests with:

```bash
pnpm test          # Run tests in watch mode (interactive development)
pnpm test:run      # Run tests once (non-watch, recommended for CI)
pnpm test:ui       # Run tests with UI
pnpm test:coverage # Run tests with coverage report (local development)
pnpm test:ci       # Run tests with coverage in CI mode (verbose reporter for CI logs)
```

**Note**: Use `pnpm test:run` or `pnpm test:ci` in CI/automated environments to prevent zombie processes. Watch mode (`pnpm test`) is fine for interactive development. The `test:coverage` script is intended for local coverage analysis, while `test:ci` is optimized for CI environments with verbose output for better log visibility.

Tests are located alongside source files with `.test.ts` extension. The test suite includes:

- Unit tests for core functionality
- Integration tests for user workflows
- Comprehensive coverage of category and hotkey management
- Direct tests for internal functions to ensure 100% coverage

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
