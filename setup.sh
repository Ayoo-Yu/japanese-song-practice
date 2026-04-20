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
  echo ""
  echo "⚙️  网易云音乐登录（可选）"
  echo "启动开发服务器后，终端会自动显示二维码，用网易云音乐 APP 扫码即可登录。"
  echo "登录后可播放 VIP 歌曲。不登录也能正常使用其他功能。"
else
  echo "✅ .env 已存在，跳过配置"
fi

# ── Done ──
echo ""
echo "========================================="
echo "   ✅ 准备就绪！"
echo "=========================================""
echo ""
echo "  启动开发服务器:  pnpm dev"
echo "  生产构建:        pnpm build"
echo "  类型检查:        npx tsc --noEmit"
echo ""
echo "  首次启动会显示网易云音乐二维码，扫码即可登录。"
echo ""

# ── Optionally start dev server ──
read -p "是否现在启动开发服务器？[Y/n] " START_DEV
if [ "$START_DEV" != "n" ] && [ "$START_DEV" != "N" ]; then
  echo ""
  echo "🚀 启动中..."
  pnpm dev
fi
