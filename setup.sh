#!/bin/bash
set -e

echo ""
echo "========================================="
echo "   日语歌练习 App — 一键启动脚本"
echo "========================================="
echo ""

# ── Check / Install Node.js ──
if ! command -v node &> /dev/null; then
  echo "📦 未检测到 Node.js，正在安装..."
  if command -v brew &> /dev/null; then
    brew install node
  elif command -v nvm &> /dev/null; then
    nvm install 20
    nvm use 20
  else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
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
  cp .env.example .env
  echo ""
  echo "✅ .env 已创建。"
fi

# ── Done ──
echo ""
echo "========================================="
echo "   ✅ 准备就绪！"
echo "========================================="
echo ""
echo "  启动后打开浏览器，点击底部「设置」标签"
echo "  可以扫码登录网易云音乐（VIP 歌曲需要登录）"
echo ""
echo "🚀 启动开发服务器..."
pnpm dev -- --open
