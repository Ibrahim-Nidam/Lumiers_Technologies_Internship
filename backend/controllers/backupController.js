const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

function getBackupPath() {
  if (process.pkg) {
    // Put backups outside the dist folder in packaged mode
    return path.join(path.dirname(process.execPath), '..', 'backups');
  } else {
    // Development folder
    return path.join(__dirname, '..', 'backups');
  }
}

exports.createDatabaseBackup = async (req, res) => {
  const user = req.user;

  if (!user || user.role !== 'manager') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const backupDir = process.env.BACKUP_DIR || getBackupPath();

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');

  const fileName = `backup-${timestamp}.sql`;
  const fullPath = path.join(backupDir, fileName);

  const {
    PG_DATABASE,
    PG_USERNAME,
    PG_PASSWORD,
    PG_HOST = 'localhost',
    PG_PORT = '5432'
  } = process.env;

  const command = `pg_dump -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USERNAME} -d ${PG_DATABASE} -F p -f "${fullPath}"`;

  exec(command, {
    env: { ...process.env, PGPASSWORD: PG_PASSWORD }
  }, (err) => {
    if (err) {
      console.error('❌ Backup failed:', err);
      return res.status(500).json({ error: 'Backup failed' });
    }

    res.download(fullPath, fileName, (downloadErr) => {
      if (downloadErr) {
        console.error('❌ Error sending backup file:', downloadErr);
      }
    });
  });
};
