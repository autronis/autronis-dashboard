@echo off
:: Wait 15 seconds for Windows to fully load
timeout /t 15 /nobreak >nul
:: Start the desktop agent
start "" "C:\Users\semmi\OneDrive\Claude AI\Projects\autronis-dashboard\desktop-agent\src-tauri\target\release\desktop-agent.exe"
