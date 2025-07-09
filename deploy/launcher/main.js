const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');
const fs = require('fs');

let win;
let serverProcess = null;
const isDev = !app.isPackaged;

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 650,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });
  
  win.setMenu(null);
  win.loadFile('index.html');
  
  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    exec('taskkill /IM fiche-app.exe /F /T', (err) => {
      if (err) console.error('Cleanup error:', err.message);
    });
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('start-server', async () => {
  if (serverProcess) {
    return { success: false, message: 'Server already running' };
  }

  try {
    const exeName = 'fiche-app.exe';
    let exePath;
    
    if (isDev) {
      exePath = path.join(__dirname, '..', exeName);
    } else {
      exePath = path.join(process.resourcesPath, exeName);
    }
    
    if (!fs.existsSync(exePath)) {
      console.error('Executable not found at:', exePath);
      return { success: false, message: `Executable not found: ${exePath}` };
    }
    
    const distPath = isDev 
      ? path.join(__dirname, '..', 'dist')
      : path.join(process.resourcesPath, 'dist');
    
    const envPath = isDev 
      ? path.join(__dirname, '..', '.env')
      : path.join(path.dirname(process.execPath), '.env');
    
    if (!fs.existsSync(envPath)) {
      const defaultEnv = `# Note de Frais Configuration
PG_DATABASE=fiche_deplacement
PG_USERNAME=postgres
PG_PASSWORD=LT2025
PG_HOST=localhost
PG_PORT=5432
JWT_SECRET=TiriOtfpjMYs2LCapxRkpPmM5E8Gn2CD`;
      
      try {
        fs.writeFileSync(envPath, defaultEnv);
      } catch (error) {
        console.error('Could not create .env file:', error);
      }
    }

    
    serverProcess = spawn(exePath, [], {
      windowsHide: true,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('server-output', data.toString());
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
      if (win && !win.isDestroyed()) {
        win.webContents.send('server-error', data.toString());
      }
    });

    serverProcess.on('exit', (code, signal) => {
      serverProcess = null;
      if (win && !win.isDestroyed()) {
        win.webContents.send('server-stopped', { code, signal });
      }
    });

    serverProcess.on('error', (error) => {
      console.error('Server process error:', error);
      serverProcess = null;
      if (win && !win.isDestroyed()) {
        win.webContents.send('server-error', error.message);
      }
    });

    return { success: true, message: 'Server started successfully' };
    
  } catch (error) {
    console.error('Failed to start server:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-server', async () => {
  try {
    return new Promise((resolve) => {
      exec('taskkill /IM fiche-app.exe /F /T', (err, stdout, stderr) => {
        if (err) {
          console.error('taskkill error:', err.message);
          resolve({ success: false, message: err.message });
        } else {
          serverProcess = null;
          resolve({ success: true, message: 'Server stopped successfully' });
        }
      });
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-local-ip', () => {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
});

ipcMain.handle('check-server-status', () => {
  return serverProcess !== null;
});