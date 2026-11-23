@echo off
chcp 65001 >nul
title TikTok Yaris Sunucusu
cd /d "%~dp0"
echo Yaris sunucusu baslatiliyor... Bu pencereyi yayin boyunca KAPATMA.
start "" "http://localhost:7777/panel.html"
node server.js
echo.
echo Sunucu durdu. Kapatmak icin bir tusa bas.
pause >nul
