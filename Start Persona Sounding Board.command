#!/bin/bash
# Double-click this file to run the Persona Sounding Board on your Mac.
# It installs what it needs (first run only), then opens the tool in your browser.

cd "$(dirname "$0")" || exit 1
clear
echo "======================================================"
echo "   Persona Sounding Board  -  Cottage Health Foundation"
echo "======================================================"
echo ""

# 1) Node.js check ----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed yet — the tool needs it to run."
  echo "Opening the download page. Install the LTS version, then"
  echo "double-click this launcher again."
  open "https://nodejs.org/en/download/"
  echo ""
  read -r -p "Press Return to close this window."
  exit 1
fi
echo "Node.js found: $(node --version)"

# 2) API key (.env) ---------------------------------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "I created a settings file (.env) and will open it now."
  echo "Paste your Anthropic API key after  ANTHROPIC_API_KEY=  then SAVE (Cmd+S)."
  echo "(Get a key at https://console.anthropic.com -> Settings -> API Keys)"
  open -e .env
  echo ""
  read -r -p "Press Return here AFTER you've pasted the key and saved."
fi

# 3) Install dependencies (first run only) ----------------------------------
if [ ! -d node_modules ]; then
  echo ""
  echo "Installing dependencies (first run only — about a minute)..."
  npm install || { echo ""; echo "npm install failed. Check your internet connection and try again."; read -r -p "Press Return to close."; exit 1; }
fi

# 4) Launch -----------------------------------------------------------------
echo ""
echo "Starting the tool... your browser will open in a moment."
echo "Leave this window open while you use it. Close it (or press Ctrl+C) to stop."
echo ""
( sleep 3; open "http://localhost:3000" ) &
npm start
