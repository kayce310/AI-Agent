@echo off
set TELEGRAM_PROACTIVE_CHAT_ID=5287587550
cd /d D:\AI-Agent
node --max-old-space-size=4096 dist/scripts/start-telegram.js
