# 日语歌练习 App

渐进式学习日语歌词，从全假名注音到能裸读原文，配合网易云音乐跟唱。

## 功能

- **搜索歌曲** — 从网易云音乐搜索日语歌，一键添加到曲库
- **歌词展示** — 5 阶段渐进式学习（全假名注音 → 原文裸读）
- **KTV 模式** — 播放音频，歌词逐字渐变，跟唱练习
- **时间校准** — 微调歌词时间轴，让渐变精准对齐
- **歌词编辑** — 修改罗马音、翻译、假名注音
- **歌词练习** — 选择题测试罗马音/假名注音/翻译，答错可纠正
- **学习进度** — 按歌曲保存当前阶段，记录正确率，并用间隔复习更新单词掌握度
- **可信度保护** — 中低置信度注音会提示核对，未确认前不会进入测验
- **本地备份** — 在设置中导出/恢复曲库、生词、收藏句、学习进度和外观设置

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
| `HOST` | 服务监听地址；云端部署设为 `0.0.0.0` | ❌ |
| `PORT` | 服务监听端口；托管平台通常会自动注入 | ❌ |
| `ALLOW_CREDENTIAL_WRITES` | 是否允许网页修改网易云凭据；公开部署请保持关闭 | ❌ |

可直接在 `.env` 中配置，也可以在应用的「设置 → 网易云音乐」中填写 `MUSIC_U`。
获取方式：浏览器 DevTools → Application → Cookies → music.163.com → MUSIC_U。

设置页显示“已配置”只代表凭据已经保存；账号权限和音源可用性会在实际播放时由网易云验证。

## 技术栈

- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS 4
- Zustand 5（状态管理）
- React Router 7（路由）
- kuromoji + wanakana（分词、汉字读音与罗马音）
- 网易云音乐 API（Vite 代理直连）

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 生产构建
pnpm test         # Vitest 回归测试
pnpm lint         # ESLint 检查
pnpm exec tsc -b  # TypeScript 类型检查
pnpm preview      # 本地预览生产构建（包含 API 中间件）
```

## 数据与部署

歌曲、收藏、学习进度和外观设置默认保存在浏览器 `localStorage`。更换浏览器、清理站点数据或迁移设备前，请先在设置页导出 JSON 备份。

`pnpm preview` 会运行项目所需的网易云、音频、TTS 和登录中间件。若只把 `dist/` 上传到纯静态托管，页面能打开，但这些服务端 API 不会存在；正式部署时需要保留 Node/Vite 服务，或把对应 `/api/*` 路由迁移到自己的后端。

仓库内置了 Railway 配置和 Dockerfile。公开部署时，网易云凭据默认只能通过托管平台的 `NETEASE_MUSIC_U` 环境变量配置，网页不会允许访客覆盖它。部署健康检查地址为 `/api/health`。

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
