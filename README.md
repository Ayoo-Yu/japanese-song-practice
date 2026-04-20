# 日语歌练习 App

渐进式学习日语歌词，从全假名注音到能裸读原文，配合网易云音乐跟唱。

## 功能

- **搜索歌曲** — 从网易云音乐搜索日语歌，一键添加到曲库
- **歌词展示** — 5 阶段渐进式学习（全假名注音 → 原文裸读）
- **KTV 模式** — 播放音频，歌词逐字渐变，跟唱练习
- **时间校准** — 微调歌词时间轴，让渐变精准对齐
- **歌词编辑** — 修改罗马音、翻译、假名注音
- **歌词练习** — 选择题测试罗马音/假名注音/翻译，答错可纠正

## 快速开始

### 一键启动（推荐）

```bash
bash setup.sh
```

脚本会自动检测 Node.js、安装 pnpm 和依赖、引导配置环境变量，最后询问是否启动开发服务器。

### 手动启动

```bash
# 1. 安装 pnpm（如果没有）
npm install -g pnpm

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的配置

# 4. 启动开发服务器
pnpm dev
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `NETEASE_MUSIC_U` | 网易云音乐 Cookie（VIP 歌曲） | ❌ |

首次启动开发服务器时，终端会自动显示二维码，用网易云音乐 APP 扫码即可自动登录。
也可以手动获取 Cookie：浏览器 DevTools > Application > Cookies > music.163.com > MUSIC_U

## 技术栈

- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS 4
- Zustand 5（状态管理）
- React Router 7（路由）
- kuroshiro + kuromoji（汉字 → 假名注音）
- 网易云音乐 API（Vite 代理直连）

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 生产构建
pnpm lint         # ESLint 检查
npx tsc --noEmit  # 类型检查
```

## 项目结构

```
src/
├── components/       # UI 组件（按功能分组）
│   ├── search/       # 搜索相关
│   ├── song/         # 歌曲播放、歌词展示
│   ├── practice/     # 练习模块
│   └── layout/       # 布局组件
├── pages/            # 页面级组件
├── services/         # 数据服务（localStorage CRUD）
├── stores/           # Zustand 状态管理
├── hooks/            # 自定义 React Hooks
├── lib/              # 纯逻辑工具
└── types/            # TypeScript 类型定义
```
