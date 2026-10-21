// `npm run desktop`: abre o Electron limpando ELECTRON_RUN_AS_NODE (herdado de terminais do VS Code).
const { spawn } = require('node:child_process')
const electronPath = require('electron')
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(electronPath, ['.'], { stdio: 'inherit', env, cwd: require('node:path').join(__dirname, '..') })
child.on('exit', (code) => process.exit(code ?? 0))
