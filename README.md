![hito-app-icon](https://i.imgur.com/BAqSxE0.png)

# Hito

[![codecov](https://codecov.io/gh/iomz/hito/graph/badge.svg?token=JUh7WEGnQe)](https://codecov.io/gh/iomz/hito)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A fast and lightweight image browser built with Tauri 2.0.

`Hito` is named after Human Intelligence Tasks Organizer and "boundary stone" in Spanish as well as "human" (人) in Japanese.
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

1. Run `pnpm install` to install the dependencies
2. Run `pnpm run build` to compile TypeScript (or `pnpm run dev` for watch mode)
3. Run `pnpm run tauri dev` to start the app

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

```text
src/
├── main.tsx                   # React entry point
├── App.tsx                    # Main React app component
├── types.ts                   # Type definitions
├── constants.ts               # Constants (BATCH_SIZE, DRAG_EVENTS)
├── state.ts                   # Global state management
│
├── components/                # React components
│   ├── CategoryDialog.tsx     # Category creation/editing dialog
│   ├── CategoryList.tsx       # Category list display
│   ├── ConfigFileInput.tsx    # Configuration file input
│   ├── CurrentImageCategories.tsx  # Current image category display
│   ├── CurrentPath.tsx        # Breadcrumb navigation
│   ├── DirectoryItem.tsx      # Directory item in grid
│   ├── DropZone.tsx           # Drag and drop zone
│   ├── ErrorMessage.tsx       # Error message display
│   ├── HotkeyDialog.tsx       # Hotkey creation/editing dialog
│   ├── HotkeyList.tsx         # Hotkey list display
│   ├── HotkeySidebar.tsx      # Configuration sidebar
│   ├── ImageGrid.tsx          # Image grid with lazy loading
│   ├── ImageGridItem.tsx      # Individual image item
│   ├── ImageModal.tsx         # Full-screen image modal
│   ├── LoadingSpinner.tsx     # Loading spinner
│   ├── ModalCategories.tsx    # Category tags in modal
│   ├── NotificationBar.tsx    # Notification toast
│   └── ShortcutsOverlay.tsx   # Keyboard shortcuts overlay
│
├── utils/
│   ├── dom.ts                 # DOM utilities (createElement for dynamic elements)
│   ├── dialog.ts              # Dialog utilities (file picker, custom confirm modal)
│   ├── images.ts              # Image loading and creation utilities
│   ├── state.ts               # State utility functions
│   └── tauri.ts               # Tauri API wrappers
│
├── ui/                        # UI utility functions (non-React)
│   ├── categories.ts          # Category management functions
│   ├── error.ts               # Error UI functions
│   ├── hotkeys.ts             # Hotkey configuration functions
│   ├── modal.ts               # Modal UI functions
│   ├── notification.ts        # Notification functions (re-exported from component)
│   └── spinner.ts             # Spinner UI functions
│
├── handlers/
│   ├── dragDrop.ts            # Drag and drop handlers
│   └── keyboard.ts            # Keyboard handlers
│
└── core/
    └── browse.ts              # Main browse functionality
```

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Run tests with:

```bash
pnpm test          # Run tests once
pnpm test:ui       # Run tests with UI
pnpm test:coverage # Run tests with coverage report
```

Tests are located alongside source files with `.test.ts` extension.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
