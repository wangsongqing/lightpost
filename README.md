# LightPost ⚡

A lightweight API request tool built with Tauri + React + TypeScript.

## Features

- **HTTP Methods**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Request Building**: URL params, headers, body (JSON, Form Data, URL Encoded, Raw)
- **Response Viewer**: Status code, response time, size, JSON syntax highlighting
- **Environment Variables**: Multi-environment support with `{{variable}}` syntax
- **Request History**: Auto-saved locally, click to restore
- **Keyboard Shortcut**: `⌘/Ctrl + Enter` to send request
- **Dark Theme**: Built-in Catppuccin Mocha inspired dark UI

## Tech Stack

- **Desktop Framework**: Tauri 2
- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **Styling**: CSS (no UI library, keeping it lightweight)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
# Install dependencies
npm install

# Start development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
lightpost/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── stores/             # Zustand state
│   ├── styles/             # CSS files
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/
│   └── tauri.conf.json
├── index.html
├── vite.config.ts
└── package.json
```

## License

MIT
