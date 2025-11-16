# Hito

Human Intelligence Tasks organization platform.
`hito` provides a graphical user interface to help users to flag images for selective actions: copy or move to each directories.

## Synopsis

1. Run `pnpm run build` to compile TypeScript (or `pnpm run dev` for watch mode)
2. Run `pnpm run tauri dev` to start the app

## Diractory Structure

```
src/
├── main.ts                    # Entry point (~50 lines)
├── types.ts                    # Type definitions
├── constants.ts                # Constants (BATCH_SIZE, DRAG_EVENTS)
├── state.ts                    # State and DOM elements
│
├── utils/
│   ├── dom.ts                  # DOM utilities (querySelector, createElement)
│   ├── dialog.ts               # Dialog utility
│   └── images.ts               # Image loading and creation utilities
│
├── ui/
│   ├── spinner.ts              # Spinner UI functions
│   ├── error.ts                # Error UI functions
│   ├── dropZone.ts             # Drop zone UI functions
│   ├── grid.ts                 # Image grid functions
│   └── modal.ts                # Modal UI functions
│
├── handlers/
│   ├── dragDrop.ts             # Drag and drop handlers
│   ├── modal.ts                # Modal handlers
│   ├── keyboard.ts             # Keyboard handlers
│   └── permissions.ts          # macOS permissions handler
│
└── core/
    ├── browse.ts               # Main browse functionality
    └── observer.ts             # Intersection observer setup
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
