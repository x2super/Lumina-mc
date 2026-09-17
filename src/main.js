const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

let mainWindow;
let gameProcess = null;
let microsoftAuth = null;
let microsoftProfile = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

const defaults = {
  username: 'Player',
  version: '1.21.1',
  gameDir: path.join(app.getPath('appData'), '.minecraft'),
  javaPath: 'java',
  minMemory: '2G',
  maxMemory: '4G',
  width: 1280,
  height: 720,
  fullscreen: false
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) };
  } catch {
    return { ...defaults };
  }
}

function saveSettings(value) {
  const clean = { ...defaults, ...value };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(clean, null, 2));
  return clean;
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 780,
    minWidth: 980,
    minHeight: 650,
    frame: false,
    backgroundColor: '#f8faf9',
    icon: path.join(__dirname, 'assets', 'logo.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

if (hasSingleInstanceLock) app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('browser-window-created', (_, win) => {
  try {
    win.setIcon(path.join(__dirname, 'assets', 'logo.png'));
  } catch {}
});

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:save', (_, value) => saveSettings(value));
ipcMain.handle('folder:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('java:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Java', extensions: ['exe'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('folder:open', (_, target) => shell.openPath(target));

const contentFolders = { mods: 'mods', resourcepacks: 'resourcepacks', shaders: 'shaderpacks' };

function contentDirectory(type) {
  const folder = contentFolders[type];
  if (!folder) throw new Error('ประเภทคลังไม่ถูกต้อง');
  const dir = path.join(loadSettings().gameDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ipcMain.handle('content:list', (_, type) => {
  const dir = contentDirectory(type);
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const stats = fs.statSync(path.join(dir, entry.name));
      return { name: entry.name, enabled: !entry.name.endsWith('.disabled'), size: stats.size, modified: stats.mtimeMs };
    })
    .sort((a, b) => b.modified - a.modified);
});

ipcMain.handle('content:open', (_, type) => shell.openPath(contentDirectory(type)));

ipcMain.handle('content:import', async (_, type) => {
  const filters = type === 'mods'
    ? [{ name: 'Minecraft Mods', extensions: ['jar'] }]
    : [{ name: type === 'shaders' ? 'Shader Packs' : 'Resource Packs', extensions: ['zip'] }];
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters });
  if (result.canceled) return { imported: 0 };
  const dir = contentDirectory(type);
  for (const source of result.filePaths) fs.copyFileSync(source, path.join(dir, path.basename(source)));
  return { imported: result.filePaths.length };
});

ipcMain.handle('content:toggle', (_, type, fileName) => {
  const dir = contentDirectory(type);
  const safeName = path.basename(fileName);
  const source = path.join(dir, safeName);
  if (!fs.existsSync(source)) throw new Error('ไม่พบไฟล์');
  const targetName = safeName.endsWith('.disabled') ? safeName.slice(0, -9) : `${safeName}.disabled`;
  fs.renameSync(source, path.join(dir, targetName));
  return { ok: true };
});

ipcMain.handle('installer:run', async (_, loaderType) => {
  if (!['optifine', 'forge', 'fabric'].includes(loaderType)) throw new Error('ประเภท Installer ไม่ถูกต้อง');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `เลือก ${loaderType} Installer`,
    properties: ['openFile'],
    filters: [{ name: 'Java Installer', extensions: ['jar'] }]
  });
  if (result.canceled) return { ok: false, canceled: true };
  const settings = loadSettings();
  fs.mkdirSync(settings.gameDir, { recursive: true });
  const launcherProfiles = path.join(settings.gameDir, 'launcher_profiles.json');
  if (!fs.existsSync(launcherProfiles)) {
    fs.writeFileSync(launcherProfiles, JSON.stringify({
      profiles: {},
      settings: {},
      version: 3
    }, null, 2));
  }

  let installerJava = settings.javaPath || 'java';
  if (process.platform === 'win32') {
    if (/java\.exe$/i.test(installerJava)) {
      const javawPath = installerJava.replace(/java\.exe$/i, 'javaw.exe');
      if (fs.existsSync(javawPath)) installerJava = javawPath;
    } else if (installerJava.toLowerCase() === 'java') {
      installerJava = 'javaw';
    }
  }

  const child = spawn(installerJava, ['-jar', result.filePaths[0]], {
    cwd: settings.gameDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.once('error', error => send('installer:error', { message: error.message }));
  child.unref();
  return { ok: true };
});

ipcMain.handle('auth:status', () => ({ authenticated: Boolean(microsoftAuth), profile: microsoftProfile }));
ipcMain.handle('auth:login', async () => {
  try {
    send('auth:state', { state: 'loading', message: 'กำลังเปิดหน้าต่าง Microsoft…' });
    const authManager = new Auth('select_account');
    authManager.on('load', (_, message) => send('auth:state', { state: 'loading', message }));
    const xbox = await authManager.launch('electron', {
      width: 520,
      height: 700,
      resizable: true,
      title: 'เข้าสู่ระบบ Microsoft • Lumina',
      icon: path.join(__dirname, 'assets', 'logo.png'),
      parent: mainWindow,
      modal: true,
      autoHideMenuBar: true,
      backgroundColor: '#0a0d0c'
    });
    const minecraft = await xbox.getMinecraft();
    microsoftAuth = minecraft.mclc();
    microsoftProfile = {
      name: minecraft.profile.name,
      id: minecraft.profile.id,
      skinUrl: minecraft.profile.skins?.[0]?.url || null
    };
    send('auth:state', { state: 'authenticated', profile: microsoftProfile, message: `เข้าสู่ระบบเป็น ${microsoftProfile.name}` });
    return { ok: true, profile: microsoftProfile };
  } catch (error) {
    const message = error?.message || (typeof error === 'string' ? error : 'ไม่สามารถเข้าสู่ระบบ Microsoft ได้');
    send('auth:state', { state: 'error', message });
    return { ok: false, error: message };
  }
});

ipcMain.handle('auth:logout', () => {
  microsoftAuth = null;
  microsoftProfile = null;
  send('auth:state', { state: 'local', message: 'ออกจากระบบ Microsoft แล้ว' });
  return { ok: true };
});

ipcMain.handle('versions:list', async () => {
  const local = [];
  const versionsDir = path.join(loadSettings().gameDir, 'versions');
  try {
    for (const entry of fs.readdirSync(versionsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(versionsDir, entry.name, `${entry.name}.json`))) local.push(entry.name);
    }
  } catch {}

  try {
    const response = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    const releases = manifest.versions.filter(v => v.type === 'release').slice(0, 35).map(v => v.id);
    return { versions: [...new Set([...local, ...releases])], local, latest: manifest.latest.release };
  } catch {
    return { versions: local.length ? local : [defaults.version], local, latest: null };
  }
});

function analyzeGameError(text) {
  if (!text) return null;
  const str = String(text);

  // 1. UnsupportedClassVersionError (Java major mismatch)
  if (/UnsupportedClassVersionError/i.test(str)) {
    const match = str.match(/class file version (\d+)(?:\.0)?.*?(?:recognizes|recognized).*?(?:up to\s+)?(\d+)(?:\.0)?/i);
    if (match) {
      const toJavaVer = c => (c >= 45 ? c - 44 : c);
      const req = toJavaVer(parseInt(match[1], 10));
      const cur = toJavaVer(parseInt(match[2], 10));
      return {
        title: 'เวอร์ชัน Java ไม่รองรับ',
        message: `Minecraft เวอร์ชันนี้ต้องการ Java ${req} แต่ในเครื่องกำลังใช้ Java ${cur}`,
        suggestion: `แนะนำให้เลือกเวอร์ชันเกมอื่น (เช่น 1.21.1) หรือติดตั้ง Java ${req} แล้วระบุที่หน้า "ตั้งค่า"`,
        type: 'java_version',
        action: 'settings',
        actionText: 'ไปที่หน้าตั้งค่า Java'
      };
    }
    return {
      title: 'เวอร์ชัน Java ไม่ตรงกับเกม',
      message: 'Java ในเครื่องไม่สามารถรันตัวเกมเวอร์ชันนี้ได้เนื่องจากเวอร์ชันไม่รองรับ',
      suggestion: 'แนะนำให้เปลี่ยนเวอร์ชันเกม หรือติดตั้ง Java เวอร์ชันที่เกมต้องการ',
      type: 'java_version',
      action: 'settings',
      actionText: 'ไปที่หน้าตั้งค่า'
    };
  }

  // 2. RAM / Memory issues
  if (/OutOfMemoryError|Could not reserve enough space|CreateProcess error=1455/i.test(str)) {
    return {
      title: 'หน่วยความจำ (RAM) ไม่เพียงพอ',
      message: 'RAM ของเครื่องไม่เพียงพอ หรือตั้งค่า RAM ให้ตัวเกมสูงเกินไป',
      suggestion: 'ไปที่หน้า "ตั้งค่า" แล้วปรับลดหรือเพิ่ม RAM สูงสุด (Max Memory) ให้เหมาะสมกับเครื่อง',
      type: 'memory',
      action: 'settings',
      actionText: 'ปรับแต่ง RAM'
    };
  }

  // 3. JVM failure
  if (/Could not create the Java Virtual Machine|Unrecognized option|Unrecognized VM option/i.test(str)) {
    return {
      title: 'เริ่ม Java ไม่สำเร็จ',
      message: 'Java Virtual Machine (JVM) ไม่สามารถเริ่มทำงานได้เนื่องจากพารามิเตอร์ไม่ถูกต้อง',
      suggestion: 'โปรดตรวจสอบ Java executable หรือปรับขนาด RAM ในหน้า "ตั้งค่า"',
      type: 'jvm',
      action: 'settings',
      actionText: 'ไปที่หน้าตั้งค่า'
    };
  }

  // 4. Graphics / OpenGL
  if (/Pixel format not accelerated|GLFW error 65542|No OpenGL 3\.2 core context|WGL: The driver does not appear to support OpenGL/i.test(str)) {
    return {
      title: 'ไดรเวอร์การ์ดจอไม่รองรับ OpenGL',
      message: 'การ์ดจอหรือไดรเวอร์ไม่รองรับคุณสมบัติ OpenGL ที่ Minecraft ต้องการ',
      suggestion: 'กรุณาอัปเดตไดรเวอร์การ์ดจอ (NVIDIA, AMD หรือ Intel) ให้เป็นเวอร์ชันล่าสุด',
      type: 'graphics',
      action: 'logs',
      actionText: 'ดูบันทึก (Logs)'
    };
  }

  // 5. Java path / spawn error
  if (/spawn javaw? ENOENT|The system cannot find the file specified|Cannot find java/i.test(str)) {
    return {
      title: 'ไม่พบไฟล์ Java',
      message: 'ไม่พบโปรแกรม Java (javaw.exe) ตามพาธที่ระบุในระบบ',
      suggestion: 'กรุณาติดตั้ง Java ในเครื่อง หรือเลือกพาธ Java executable ในหน้า "ตั้งค่า"',
      type: 'java_missing',
      action: 'settings',
      actionText: 'เลือกพาธ Java'
    };
  }

  return null;
}

ipcMain.handle('game:launch', async (_, raw) => {
  if (gameProcess) return { ok: false, error: 'เกมกำลังทำงานอยู่แล้ว' };

  const username = microsoftProfile?.name || String(raw.username || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    return { ok: false, error: 'ชื่อผู้เล่นต้องมี 3–16 ตัว และใช้เฉพาะ A-Z, 0-9 หรือ _' };
  }

  const settings = saveSettings({ ...loadSettings(), ...raw, username });
  fs.mkdirSync(settings.gameDir, { recursive: true });

  // Pre-check Java version if version metadata exists locally
  const selectedVersionJson = path.join(settings.gameDir, 'versions', settings.version, `${settings.version}.json`);
  if (fs.existsSync(selectedVersionJson)) {
    try {
      const selectedMetadata = JSON.parse(fs.readFileSync(selectedVersionJson, 'utf8'));
      if (selectedMetadata?.javaVersion?.majorVersion) {
        const requiredMajor = selectedMetadata.javaVersion.majorVersion;
        const configuredJava = settings.javaPath || 'java';
        try {
          const check = spawnSync(configuredJava, ['-version'], { encoding: 'utf8' });
          const out = (check.stderr || '') + (check.stdout || '');
          const verMatch = out.match(/version\s+"(\d+)(?:\.|\b)/i) || out.match(/version\s+"1\.(\d+)/i);
          if (verMatch) {
            const currentMajor = parseInt(verMatch[1], 10);
            if (requiredMajor > currentMajor) {
              const errObj = {
                title: 'เวอร์ชัน Java ไม่รองรับ',
                message: `Minecraft ${settings.version} ต้องการ Java ${requiredMajor} แต่ในเครื่องกำลังใช้ Java ${currentMajor}`,
                suggestion: `แนะนำให้เปลี่ยนไปเล่นเวอร์ชันอื่น (เช่น 1.21.1) หรือติดตั้ง Java ${requiredMajor} แล้วตั้งค่าในหน้า "ตั้งค่า"`,
                type: 'java_version',
                action: 'settings',
                actionText: 'ไปที่หน้าตั้งค่า Java'
              };
              send('game:state', { state: 'error', message: errObj.message, error: errObj });
              return { ok: false, error: errObj.message, details: errObj };
            }
          }
        } catch {}
      }
    } catch {}
  }

  const launcher = new Client();
  const auth = microsoftAuth || await Authenticator.getAuth(username);
  let detectedError = null;
  const recentLogs = [];

  function recordLog(type, message) {
    const text = String(message);
    recentLogs.push(text);
    if (recentLogs.length > 40) recentLogs.shift();
    const found = analyzeGameError(text);
    if (found) detectedError = found;
  }

  launcher.on('debug', message => {
    recordLog('debug', message);
    send('game:log', { type: 'debug', message: String(message) });
  });
  launcher.on('data', message => {
    recordLog('game', message);
    send('game:log', { type: 'game', message: String(message) });
  });
  launcher.on('download-status', status => send('game:progress', status));
  launcher.on('progress', progress => send('game:progress', progress));
  launcher.on('close', code => {
    gameProcess = null;
    if (code !== 0) {
      let errorPayload = detectedError;
      if (!errorPayload) {
        for (let i = recentLogs.length - 1; i >= 0; i--) {
          const found = analyzeGameError(recentLogs[i]);
          if (found) { errorPayload = found; break; }
        }
      }
      if (!errorPayload) {
        errorPayload = {
          title: 'เกมหยุดทำงานกะทันหัน',
          message: `Minecraft ปิดตัวลงโดยไม่คาดคิด (Exit code ${code})`,
          suggestion: 'สามารถเปิดดูรายละเอียดข้อผิดพลาดเพิ่มเติมได้ในแท็บ "บันทึก"',
          type: 'crash',
          action: 'logs',
          actionText: 'ดูบันทึก (Logs)'
        };
      }
      send('game:state', {
        state: 'error',
        message: errorPayload.message,
        error: errorPayload,
        code
      });
    } else {
      send('game:state', { state: 'idle', message: 'ปิดเกมแล้ว' });
    }
    mainWindow?.show();
  });

  try {
    send('game:state', { state: 'preparing', message: 'กำลังตรวจสอบและดาวน์โหลดไฟล์เกม…' });
    const versionOptions = { number: settings.version, type: 'release' };
    if (fs.existsSync(selectedVersionJson)) {
      try {
        const selectedMetadata = JSON.parse(fs.readFileSync(selectedVersionJson, 'utf8'));
        if (selectedMetadata.inheritsFrom) {
          versionOptions.number = selectedMetadata.inheritsFrom;
          versionOptions.custom = settings.version;
          send('game:log', { type: 'debug', message: `ใช้เวอร์ชันฐาน ${selectedMetadata.inheritsFrom} สำหรับ ${settings.version}` });
        }
      } catch (error) {
        send('game:log', { type: 'debug', message: `อ่านข้อมูลเวอร์ชันไม่ได้: ${error.message}` });
      }
    }
    const child = await launcher.launch({
      authorization: auth,
      root: settings.gameDir,
      javaPath: settings.javaPath || 'java',
      version: versionOptions,
      memory: { min: settings.minMemory, max: settings.maxMemory },
      window: {
        width: String(settings.width || 1280),
        height: String(settings.height || 720),
        fullscreen: Boolean(settings.fullscreen)
      },
      overrides: { detached: false }
    });
    if (!child) throw new Error('ตัวเปิดเกมหยุดทำงานก่อนสร้างโปรเซส Minecraft กรุณาดูรายละเอียดในหน้าบันทึก');
    gameProcess = child;
    send('game:state', { state: 'running', message: 'Minecraft กำลังทำงาน' });
    return { ok: true };
  } catch (error) {
    gameProcess = null;
    const rawMsg = error?.message || String(error);
    const analyzed = analyzeGameError(rawMsg) || {
      title: 'เปิดเกมไม่สำเร็จ',
      message: rawMsg,
      suggestion: 'กรุณาตรวจสอบการตั้งค่าหรือดูรายละเอียดในหน้าบันทึก',
      type: 'error',
      action: 'logs',
      actionText: 'ดูบันทึก (Logs)'
    };
    send('game:state', { state: 'error', message: analyzed.message, error: analyzed });
    return { ok: false, error: analyzed.message, details: analyzed };
  }
});
