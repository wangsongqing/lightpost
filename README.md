# LightPost ⚡

> **超轻量级** API 客户端，安装包仅约 **5MB**，极速启动，开箱即用。

A lightweight API request tool built with Tauri + React + TypeScript.

## ✨ 为什么选择 LightPost？

- **🪶 极致轻量**：安装包仅 ~5MB，不依赖 Electron，基于 Tauri 构建，内存占用极低
- **⚡ 极速启动**：原生 Rust 后端，毫秒级启动，告别漫长等待
- **🎯 专注核心**：专注于 API 调试的核心功能，无冗余，不臃肿

## Features

### 请求构建
- **HTTP Methods**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **URL 参数**: 可视化键值对编辑，自动拼接到 URL
- **请求头**: 自定义 headers 管理
- **请求体**: 支持 JSON、Form Data、URL Encoded、Raw 等多种格式
- **环境变量**: 多环境支持，使用 `{{variable}}` 语法自动替换

### 多标签页
- **多请求并行**: 同时打开多个 API 请求，自由切换
- **未保存提示**: 修改后标签上显示圆点提醒，防止丢失
- **快速新建**: 点击 + 或双击空白处即可新建请求

### 响应查看
- **状态信息**: 状态码、响应时间、响应大小
- **JSON 高亮**: 自动格式化并语法高亮 JSON 响应
- **响应头**: 完整展示响应头信息

### 集合管理
- **目录树**: 文件夹 + 请求的层级结构管理
- **Postman 兼容**: 支持导入/导出 Postman Collection
- **右键菜单**: 快速新建、重命名、删除

### 历史记录
- **自动保存**: 每次发送的请求自动记录
- **快速恢复**: 点击历史记录即可恢复请求

### 快捷键
- `⌘/Ctrl + Enter`: 发送请求
- `⌘/Ctrl + S`: 保存当前请求

### 界面
- **深色主题**: Catppuccin Mocha 配色方案，护眼舒适
- **可调整侧边栏**: 拖拽调整目录栏宽度

## Tech Stack

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 (Rust) |
| 前端 | React 18 + TypeScript + Vite |
| 状态管理 | Zustand |
| 样式 | 纯 CSS（无 UI 库，保持轻量） |
| 数据存储 | SQLite（通过 Tauri 命令） |

## 体积对比

| 工具 | 安装包大小 |
|------|-----------|
| **LightPost** | **~5MB** |
| Postman | ~300MB+ |
| Insomnia | ~200MB+ |
| HTTPie Desktop | ~150MB+ |

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
│   ├── components/         # UI 组件
│   ├── stores/             # Zustand 状态管理
│   ├── styles/             # CSS 样式文件
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
├── src-tauri/              # Tauri 后端 (Rust)
│   ├── src/
│   └── tauri.conf.json
├── index.html
├── vite.config.ts
└── package.json
```

## License

MIT
