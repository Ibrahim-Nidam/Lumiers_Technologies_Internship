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
    width: 400,
    height: 300,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable for local app
      allowRunningInsecureContent: true
    }
  });
  
  win.setMenu(null);
  win.loadFile('index.html');
  
  // Optional: Open DevTools in development
  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Clean up server process before quitting
  if (serverProcess) {
    exec('taskkill /IM fiche-app.exe /F /T', (err) => {
      if (err) console.error('Cleanup error:', err.message);
    });
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Launch your fiche-app.exe (hidden)
ipcMain.handle('start-server', async () => {
  if (serverProcess) {
    return { success: false, message: 'Server already running' };
  }

  try {
    const exeName = 'fiche-app.exe';
    let exePath;
    
    if (isDev) {
      // Development: look in parent directory
      exePath = path.join(__dirname, '..', exeName);
    } else {
      // Production: look in resources/app.asar.unpacked or resources
      exePath = path.join(process.resourcesPath, exeName);
    }
    
    // Check if file exists
    if (!fs.existsSync(exePath)) {
      console.error('Executable not found at:', exePath);
      return { success: false, message: `Executable not found: ${exePath}` };
    }
    
    // Debug: Check if dist folder exists
    const distPath = isDev 
      ? path.join(__dirname, '..', 'dist')
      : path.join(process.resourcesPath, 'dist');
    
    // Create default .env if it doesn't exist
    const envPath = isDev 
      ? path.join(__dirname, '..', '.env')
      : path.join(path.dirname(process.execPath), '.env');
    
    if (!fs.existsSync(envPath)) {
      const defaultEnv = `# Note de Frais Configuration
PG_DATABASE=fiche_deplacement
PG_USERNAME=postgres
PG_PASSWORD=post
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
      stdio: ['pipe', 'pipe', 'pipe'] // Capture stdout/stderr
    });

    // Handle process output
    serverProcess.stdout.on('data', (data) => {
      // Send output to renderer if needed
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

// Kill all fiche-app.exe instances
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

// Resolve local IPv4
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

// Check if server is running
ipcMain.handle('check-server-status', () => {
  return serverProcess !== null;
});