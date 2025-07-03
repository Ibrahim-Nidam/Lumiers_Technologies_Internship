(async function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const ipInfo = document.getElementById('ipInfo');
  const statusDiv = document.getElementById('status');
  const outputDiv = document.getElementById('output');

  // Update UI based on server status
  function updateUI(isRunning) {
    if (isRunning) {
      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
      statusDiv.textContent = 'Server Status: Running';
      statusDiv.className = 'status running';
    } else {
      stopBtn.classList.add('hidden');
      startBtn.classList.remove('hidden');
      statusDiv.textContent = 'Server Status: Stopped';
      statusDiv.className = 'status stopped';
    }
  }

  // Show message to user
  function showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    outputDiv.appendChild(messageEl);
    outputDiv.scrollTop = outputDiv.scrollHeight;
    
    // Remove old messages if too many
    while (outputDiv.children.length > 10) {
      outputDiv.removeChild(outputDiv.firstChild);
    }
  }

  // Start server
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    showMessage('Starting server...', 'info');
    
    try {
      const result = await window.server.start();
      if (result.success) {
        showMessage('Server started successfully!', 'success');
        updateUI(true);
      } else {
        showMessage(`Failed to start server: ${result.message}`, 'error');
      }
    } catch (error) {
      showMessage(`Error starting server: ${error.message}`, 'error');
    } finally {
      startBtn.disabled = false;
    }
  });

  // Stop server
  stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    showMessage('Stopping server...', 'info');
    
    try {
      const result = await window.server.stop();
      if (result.success) {
        showMessage('Server stopped successfully!', 'success');
        updateUI(false);
      } else {
        showMessage(`Failed to stop server: ${result.message}`, 'error');
      }
    } catch (error) {
      showMessage(`Error stopping server: ${error.message}`, 'error');
    } finally {
      stopBtn.disabled = false;
    }
  });

  // Listen for server events
  window.server.onServerOutput((event, data) => {
    showMessage(`Server: ${data.trim()}`, 'output');
  });

  window.server.onServerError((event, error) => {
    showMessage(`Server Error: ${error.trim()}`, 'error');
  });

  window.server.onServerStopped((event, data) => {
    showMessage(`Server stopped (code: ${data.code})`, 'info');
    updateUI(false);
  });

  // Initialize IP and status
  try {
    const ip = await window.server.getLocalIP();
    ipInfo.innerHTML = `<strong>URL:</strong> <a href="http://${ip}:3001" target="_blank">http://${ip}:3001</a>`;
    
    // Check initial server status
    const isRunning = await window.server.checkStatus();
    updateUI(isRunning);
    
    showMessage('Application initialized', 'info');
  } catch (error) {
    ipInfo.textContent = 'IP unavailable';
    showMessage(`Initialization error: ${error.message}`, 'error');
  }
})();