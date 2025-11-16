![hito-app-icon](https://i.imgur.com/KWpeggI.png)

# Hito

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A fast and lightweight image browser built with Tauri 2.0.

`Hito` is named after Human Intelligence Tasks Organizer and a "boundary stone" in Spanish as well as "human" (人) in Japanese.
It provides a clean graphical interface to help users to flag images for selective actions: copy or move to each directories.
Simply drag and drop a folder to start browsing your images.

## Features

- **Drag & Drop**: Drag folders directly into the app to browse images
- **File Picker**: Click the drop zone to select a folder using the system file picker
- **Lazy Loading**: Images load on-demand with infinite scroll for smooth performance
- **Image Carousel**: Click any image to open a full-screen modal with navigation
- **Keyboard Shortcuts**: Navigate images with arrow keys, close with Esc, view shortcuts with `?`
- **Breadcrumb Navigation**: Click on path segments to navigate to parent directories

## Synopsis

1. Run `pnpm run build` to compile TypeScript (or `pnpm run dev` for watch mode)
2. Run `pnpm run tauri dev` to start the app

## Usage

1. **Browse a folder**: Drag and drop a folder onto the drop zone, or click to select a folder
2. **View images**: Click any image thumbnail to open it in full-screen mode
3. **Navigate**: Use arrow keys (← →) to navigate between images in the modal
4. **Navigate directories**: Click on breadcrumb segments to browse parent directories
5. **Go home**: Click the "hito" title to return to the home screen

## Keyboard Shortcuts

- `←` - Previous image
- `→` - Next image
- `Esc` - Close modal
- `?` - Show/hide keyboard shortcuts overlay

## Directory Structure

```
src/
├── main.ts                    # Entry point
├── types.ts                   # Type definitions
├── constants.ts               # Constants (BATCH_SIZE, DRAG_EVENTS)
├── state.ts                   # State and DOM elements
│
├── utils/
│   ├── dom.ts                 # DOM utilities (querySelector, createElement)
│   ├── dialog.ts              # Dialog utility
│   └── images.ts              # Image loading and creation utilities
│
├── ui/
│   ├── spinner.ts             # Spinner UI functions
│   ├── error.ts               # Error UI functions
│   ├── dropZone.ts            # Drop zone UI functions
│   ├── grid.ts                # Image grid functions
│   ├── modal.ts               # Modal UI functions
│   ├── notification.ts        # Notification bar functions
│   └── breadcrumb.ts          # Breadcrumb navigation functions
│
├── handlers/
│   ├── dragDrop.ts            # Drag and drop handlers
│   ├── modal.ts               # Modal handlers
│   ├── keyboard.ts            # Keyboard handlers
│   └── permissions.ts         # macOS permissions handler
│
└── core/
    ├── browse.ts              # Main browse functionality
    └── observer.ts            # Intersection observer setup
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
