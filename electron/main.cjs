// FluxDiag desktop: janela Electron que carrega o mesmo site gerado pelo Vite (dist/).
const { app, BrowserWindow, Menu, shell, dialog } = require('electron')
const path = require('node:path')

const SITE = 'https://github.com/RicardoBiazin/FluxDiag'

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 560,
    title: 'FluxDiag',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#f4f5f7',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })
  win.once('ready-to-show', () => win.show())
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // Links externos abrem no navegador; a janela nunca navega para fora do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) {
      e.preventDefault()
      if (/^https?:/i.test(url)) shell.openExternal(url)
    }
  })
  win.on('closed', () => {
    win = null
  })
}

function buildMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [{ role: 'quit', label: 'Sair' }],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar tudo' },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'togglefullscreen', label: 'Tela cheia' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamanho da interface: normal' },
        { role: 'zoomIn', label: 'Aumentar interface' },
        { role: 'zoomOut', label: 'Diminuir interface' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Ferramentas do desenvolvedor' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        { label: 'Página do projeto', click: () => shell.openExternal(SITE) },
        {
          label: 'Sobre o FluxDiag',
          click: () =>
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Sobre o FluxDiag',
              message: `FluxDiag ${app.getVersion()}`,
              detail: 'Diagramas e fluxogramas que viram apresentação.\n' + SITE,
            }),
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(() => {
  buildMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
