@echo off
setlocal
chcp 65001 >nul <nul
title FluxDiag
cd /d "%~dp0"

set "PORTA=5181"
set "URL=http://127.0.0.1:%PORTA%"

rem --- Node.js: usa o do PATH ou o da instalacao padrao ---
where node >nul 2>nul
if errorlevel 1 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
  ) else (
    echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org e rode de novo.
    pause
    exit /b 1
  )
)

rem --- Ja esta aberto? So abre o navegador ---
curl -s -o nul --max-time 2 "%URL%" <nul && (
  echo FluxDiag ja esta rodando. Abrindo %URL%
  start "" "%URL%"
  exit /b 0
)

rem --- Dependencias (so na primeira vez) ---
if not exist "node_modules\" (
  echo Instalando dependencias, aguarde...
  call npm install --no-audit --no-fund <nul
  if errorlevel 1 (
    echo [ERRO] Falha no npm install.
    pause
    exit /b 1
  )
)

rem --- Gera a versao atual do site ---
echo Preparando o FluxDiag...
call npx vite build --logLevel error <nul
if errorlevel 1 (
  echo [ERRO] Falha ao gerar o site.
  pause
  exit /b 1
)

echo.
echo  FluxDiag rodando em %URL%
echo  Feche esta janela (ou Ctrl+C) para encerrar.
echo.
call npx vite preview --host 127.0.0.1 --port %PORTA% --strictPort --open <nul
endlocal
