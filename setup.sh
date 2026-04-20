#!/bin/bash
set -e

echo ""
echo "========================================="
echo "   日语歌练习 App — 一键启动脚本"
echo "========================================="
echo ""

# ── Check Node.js ──
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js，请先安装 Node.js 18+"
  echo "   推荐使用 nvm: https://github.com/nvm-sh/nvm"
  echo "   安装后运行: nvm install 18 && nvm use 18"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 版本过低 (当前 $(node -v))，需要 18+"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# ── Check / Install pnpm ──
if ! command -v pnpm &> /dev/null; then
  echo "📦 正在安装 pnpm..."
  npm install -g pnpm
fi
echo "✅ pnpm $(pnpm -v)"

# ── Install dependencies ──
echo ""
echo "📦 安装依赖..."
pnpm install

# ── Configure environment ──
if [ ! -f .env ]; then
  echo ""
  echo "⚙️  配置环境变量 (.env)"
  cp .env.example .env

  echo ""
  echo "请输入以下配置（直接回车可跳过，稍后手动编辑 .env）："
  echo ""

  read -p "  Supabase URL [默认: 跳过]: " SUPABASE_URL
  if [ -n "$SUPABASE_URL" ]; then
    sed -i.bak "s|your_supabase_url_here|${SUPABASE_URL}|" .env
  fi

  read -p "  Supabase Anon Key [默认: 跳过]: " SUPABASE_KEY
  if [ -n "$SUPABASE_KEY" ]; then
    sed -i.bak "s|your_supabase_anon_key_here|${SUPABASE_KEY}|" .env
  fi

  read -p "  网易云音乐 API 地址 [默认: 跳过]: " NETEASE_URL
  if [ -n "$NETEASE_URL" ]; then
    sed -i.bak "s|your_netease_api_url_here|${NETEASE_URL}|" .env
  fi

  rm -f .env.bak

  echo ""
  echo "✅ .env 已创建。你也可以随时手动编辑它。"
else
  echo "✅ .env 已存在，跳过配置"
fi

# ── Done ──
echo ""
echo "========================================="
echo "   ✅ 准备就绪！"
echo "========================================="
echo ""
echo "  启动开发服务器:  pnpm dev"
echo "  生产构建:        pnpm build"
echo "  类型检查:        npx tsc --noEmit"
echo ""
echo "  编辑环境变量:    vi .env"
echo ""

# ── Optionally start dev server ──
read -p "是否现在启动开发服务器？[Y/n] " START_DEV
if [ "$START_DEV" != "n" ] && [ "$START_DEV" != "N" ]; then
  echo ""
  echo "🚀 启动中..."
  pnpm dev
fi
