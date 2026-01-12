# One Click Lock

Lock Obsidian notes in one click to prevent accidental edits.

## Features

- **One Click**: Lock/unlock via sidebar ribbon icon
- **Menu**: Right-click menu support
- **Command**: Command palette support (can bind hotkey)
- **Lock Scope**: Properties area and title
- **Visual Indicator**: Lock icon displayed when locked
- **Cross-platform**: Works on desktop and mobile

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, `styles.css` from the latest release
2. Create folder `.obsidian/plugins/one-click-lock/` in your vault
3. Copy the three files into the folder
4. Restart Obsidian
5. Enable "One Click Lock" in Settings → Community Plugins

## Usage

### Method 1: One Click (Recommended)

Click the lock icon 🔒 in the left sidebar ribbon.

### Method 2: Menu

1. Open note
2. Click `···` menu (top right)
3. Click **Lock Note** / **Unlock Note**

### Method 3: Command Palette

1. Press `Cmd/Ctrl + P`
2. Type `Toggle Lock Note`
3. Press Enter

## How It Works

When locked, the plugin adds `locked: true` to the note's frontmatter and:
- Disables editing in Properties area
- Disables title editing
- Shows a lock icon indicator
- Hides add/remove property buttons

## License

MIT
