const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');

const ROOT_DIR = (() => {
  // В packaged-режиме (portable exe) __dirname указывает на app.asar,
  // а project root — текущая рабочая папка или аргумент --root
  const argRoot = process.argv.find((a) => a.startsWith('--root='));
  if (argRoot) return path.resolve(argRoot.slice('--root='.length));
  if (process.resourcesPath && process.resourcesPath.includes('app.asar'))
    return process.cwd();
  return path.resolve(__dirname, '..', '..');
})();
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const API_URL = 'http://localhost:4000';
const WEB_URL = 'http://localhost:3000';
const MAILPIT_URL = 'http://localhost:8025';

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const services = {
  infra: {
    name: 'Инфраструктура',
    description: 'PostgreSQL + Mailpit через Docker Compose',
    color: '#4caf50',
    process: null,
    status: 'stopped',
    logFile: path.join(LOG_DIR, 'infra.log'),
  },
  api: {
    name: 'API (NestJS)',
    description: 'http://localhost:4000/api/docs',
    color: '#2196f3',
    process: null,
    status: 'stopped',
    logFile: path.join(LOG_DIR, 'api.log'),
    healthUrl: `${API_URL}/health`,
    port: 4000,
  },
  web: {
    name: 'Сайт + CRM (Next.js)',
    description: 'http://localhost:3000 и /admin',
    color: '#ff9800',
    process: null,
    status: 'stopped',
    logFile: path.join(LOG_DIR, 'web.log'),
    healthUrl: WEB_URL,
    port: 3000,
  },
};

function getServiceStatus() {
  const status = {};
  for (const [key, svc] of Object.entries(services)) {
    status[key] = {
      name: svc.name,
      description: svc.description,
      color: svc.color,
      status: svc.status,
      managed: Boolean(svc.process),
    };
  }
  return status;
}

function broadcast() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('status-update', getServiceStatus());
  }
}

function appendLog(serviceKey, line) {
  const svc = services[serviceKey] ?? services.infra;
  const timestamp = new Date().toLocaleTimeString('ru-RU');
  const entry = `[${timestamp}] ${line}`;
  fs.appendFileSync(svc.logFile, `${entry}\n`);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('log-append', { service: serviceKey, line: entry });
  }
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function commandExists(command, args = ['--version']) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd: ROOT_DIR, shell: true, stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

function checkHttp(url, timeoutMs = 1800) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function refreshRuntimeStatus() {
  services.infra.status = (await checkHttp(MAILPIT_URL)) ? 'running' : 'stopped';
  services.api.status = (await checkHttp(services.api.healthUrl)) ? 'running' : (services.api.process ? 'starting' : 'stopped');
  services.web.status = (await checkHttp(services.web.healthUrl)) ? 'running' : (services.web.process ? 'starting' : 'stopped');
  broadcast();
  return getServiceStatus();
}

function getTailscaleIp() {
  const result = spawnSync('tailscale', ['ip', '-4'], { cwd: ROOT_DIR, shell: true, encoding: 'utf-8' });
  if (result.status !== 0) return '';
  return result.stdout.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
}

function getPortPids(port) {
  if (process.platform === 'win32') {
    const result = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf-8' });
    if (result.status !== 0) return [];
    const pattern = new RegExp(`[:.]${port}\\s+.*LISTENING\\s+(\\d+)`, 'i');
    return [...new Set(result.stdout.split('\n').map((line) => line.match(pattern)?.[1]).filter(Boolean))];
  }

  const result = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf-8' });
  if (result.status !== 0) return [];
  return [...new Set(result.stdout.split('\n').map((line) => line.trim()).filter(Boolean))];
}

function killPids(pids) {
  for (const pid of pids) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(pid), '/F', '/T'], { shell: true, stdio: 'ignore' });
    } else {
      spawnSync('kill', ['-TERM', String(pid)], { stdio: 'ignore' });
    }
  }
}

function spawnLogged(serviceKey, command, args, options = {}) {
  appendLog(serviceKey, `> ${command} ${args.join(' ')}`);
  const proc = spawn(command, args, {
    cwd: options.cwd ?? ROOT_DIR,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0', ...(options.env ?? {}) },
  });

  proc.stdout.on('data', (data) => {
    for (const line of data.toString().split('\n').filter(Boolean)) appendLog(serviceKey, line);
  });
  proc.stderr.on('data', (data) => {
    for (const line of data.toString().split('\n').filter(Boolean)) appendLog(serviceKey, line);
  });

  return proc;
}

function runCommand(serviceKey, command, args, options = {}) {
  return new Promise((resolve) => {
    const proc = spawnLogged(serviceKey, command, args, options);
    proc.on('close', (code) => {
      appendLog(serviceKey, code === 0 ? `Команда завершена успешно` : `Команда завершилась с кодом ${code}`);
      resolve(code === 0);
    });
    proc.on('error', (err) => {
      appendLog(serviceKey, `Ошибка запуска команды: ${err.message}`);
      resolve(false);
    });
  });
}

async function startInfra() {
  const svc = services.infra;
  if (svc.status === 'running' || svc.status === 'starting') return true;
  svc.status = 'starting';
  broadcast();

  const composeFile = path.join(ROOT_DIR, 'infra', 'docker-compose.yml');
  const ok = await runCommand('infra', 'docker', ['compose', '-f', composeFile, 'up', '-d']);
  svc.process = null;
  svc.status = ok ? 'running' : 'error';
  appendLog('infra', ok ? 'Docker Compose запущен' : 'Docker Compose не запустился');
  broadcast();
  return ok;
}

async function startDev(serviceKey, cwd) {
  const svc = services[serviceKey];
  if (svc.status === 'running' || svc.status === 'starting') return true;

  if (svc.healthUrl && (await checkHttp(svc.healthUrl))) {
    svc.status = 'running';
    appendLog(serviceKey, `${svc.name} уже доступен, новый процесс не запускаю`);
    broadcast();
    return true;
  }

  if (svc.port) {
    const pids = getPortPids(svc.port);
    if (pids.length > 0) {
      appendLog(serviceKey, `Порт ${svc.port} занят stale-процессом PID ${pids.join(', ')}; освобождаю перед стартом`);
      killPids(pids);
      await new Promise((done) => setTimeout(done, 1200));
    }
  }

  svc.status = 'starting';
  broadcast();

  const proc = spawnLogged(serviceKey, getNpmCommand(), ['run', 'dev'], { cwd });
  svc.process = proc;

  let resolved = false;
  const resolveWhenReady = async (resolve) => {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline && svc.process === proc) {
      if (!svc.healthUrl || (await checkHttp(svc.healthUrl))) {
        svc.status = 'running';
        appendLog(serviceKey, `${svc.name} готов к работе`);
        broadcast();
        resolved = true;
        resolve(true);
        return;
      }
      await new Promise((done) => setTimeout(done, 1200));
    }
    if (!resolved && svc.process === proc) {
      svc.status = 'starting';
      appendLog(serviceKey, `${svc.name} ещё запускается, проверьте лог`);
      broadcast();
      resolved = true;
      resolve(true);
    }
  };

  return new Promise((resolve) => {
    resolveWhenReady(resolve);
    proc.on('close', (code) => {
      if (svc.process === proc) svc.process = null;
      const finalize = async () => {
        svc.status = svc.healthUrl && (await checkHttp(svc.healthUrl)) ? 'running' : (code === 0 ? 'stopped' : 'error');
        appendLog(serviceKey, `Процесс завершён (код ${code})`);
        broadcast();
        if (!resolved) {
          resolved = true;
          resolve(code === 0 || svc.status === 'running');
        }
      };
      finalize();
    });
    proc.on('error', (err) => {
      svc.status = 'error';
      appendLog(serviceKey, `Ошибка: ${err.message}`);
      broadcast();
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
  });
}

function stopProcess(serviceKey) {
  const svc = services[serviceKey];
  if (!svc) return;

  if (serviceKey === 'infra') {
    const composeFile = path.join(ROOT_DIR, 'infra', 'docker-compose.yml');
    spawnLogged('infra', 'docker', ['compose', '-f', composeFile, 'down']);
    svc.status = 'stopped';
    appendLog(serviceKey, `${svc.name} остановлена`);
    broadcast();
    return;
  }

  if (svc.process) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(svc.process.pid), '/f', '/t'], { shell: true, stdio: 'ignore' });
    } else {
      svc.process.kill('SIGTERM');
    }
  }
  if (!svc.process && serviceKey !== 'infra') {
    appendLog(serviceKey, `${svc.name} запущен вне лаунчера; остановите процесс вручную или освободите порт`);
    broadcast();
    return;
  }
  svc.process = null;
  svc.status = 'stopped';
  appendLog(serviceKey, `${svc.name} остановлен`);
  broadcast();
}

async function getChecks() {
  const envPath = path.join(ROOT_DIR, '.env');
  const composePath = path.join(ROOT_DIR, 'infra', 'docker-compose.yml');
  const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');

  const tailscaleIp = getTailscaleIp();

  return [
    { key: 'node', label: 'Node.js', ok: await commandExists('node') },
    { key: 'npm', label: 'npm', ok: await commandExists(getNpmCommand(), ['--version']) },
    { key: 'docker', label: 'Docker', ok: await commandExists('docker', ['--version']) },
    { key: 'compose', label: 'Docker Compose', ok: await commandExists('docker', ['compose', 'version']) },
    { key: 'tailscale', label: 'Tailscale CLI', ok: await commandExists('tailscale', ['version']) },
    { key: 'tailscale-ip', label: tailscaleIp ? `Tailscale IP ${tailscaleIp}` : 'Tailscale IP', ok: Boolean(tailscaleIp) },
    { key: 'env', label: '.env в корне', ok: fs.existsSync(envPath) },
    { key: 'compose-file', label: 'infra/docker-compose.yml', ok: fs.existsSync(composePath) },
    { key: 'node-modules', label: 'node_modules', ok: fs.existsSync(nodeModulesPath) },
    { key: 'api-url', label: 'API /health', ok: await checkHttp(`${API_URL}/health`) },
    { key: 'web-url', label: 'Web', ok: await checkHttp(WEB_URL) },
    { key: 'mailpit-url', label: 'Mailpit', ok: await checkHttp(MAILPIT_URL) },
  ];
}

async function runAction(action) {
  const npm = getNpmCommand();
  switch (action) {
    case 'install':
      return runCommand('infra', npm, ['install'], { cwd: ROOT_DIR });
    case 'migrate':
      return runCommand('api', npm, ['run', 'db:migrate'], { cwd: ROOT_DIR });
    case 'seed':
      return runCommand('api', npm, ['run', 'db:seed'], { cwd: ROOT_DIR });
    case 'build-api':
      return runCommand('api', npm, ['run', 'build', '--workspace', 'apps/api'], { cwd: ROOT_DIR });
    case 'build-web':
      return runCommand('web', npm, ['run', 'build', '--workspace', 'apps/web'], { cwd: ROOT_DIR });
    case 'free-api-port':
      killPids(getPortPids(4000));
      appendLog('api', 'Порт 4000 освобождён');
      return true;
    case 'free-web-port':
      killPids(getPortPids(3000));
      appendLog('web', 'Порт 3000 освобождён');
      return true;
    case 'quick-start': {
      // Полный автоматический запуск с нуля
      appendLog('infra', '══════════ Quick Start ══════════');

      // 1. npm install
      if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
        appendLog('infra', '→ Установка зависимостей...');
        const installed = await runCommand('infra', npm, ['install'], { cwd: ROOT_DIR });
        if (!installed) { appendLog('infra', '✕ npm install не удался'); return false; }
      } else
        appendLog('infra', '✓ Зависимости уже установлены');

      // 2. Docker Compose up
      appendLog('infra', '→ Запуск PostgreSQL и Mailpit...');
      const composeFile = path.join(ROOT_DIR, 'infra', 'docker-compose.yml');
      const infraOk = await runCommand('infra', 'docker', ['compose', '-f', composeFile, 'up', '-d']);
      if (!infraOk) { appendLog('infra', '✕ Docker не запустился'); return false; }

      // 3. Ждём PostgreSQL (проверяем по Mailpit :8025)
      appendLog('infra', '→ Ожидание PostgreSQL...');
      for (let i = 0; i < 30; i++) {
        if (await checkHttp('http://localhost:8025')) break;
        await new Promise((r) => setTimeout(r, 2000));
      }

      // 4. Prisma migrate
      appendLog('api', '→ Миграция базы данных...');
      const migrated = await runCommand('api', npm, ['run', 'db:migrate'], { cwd: ROOT_DIR });
      if (!migrated) { appendLog('api', '✕ Миграция не удалась'); return false; }

      // 5. Prisma seed (если нет данных — upsert безопасен)
      appendLog('api', '→ Заполнение начальными данными...');
      await runCommand('api', npm, ['run', 'db:seed'], { cwd: ROOT_DIR });

      // 6. Стартуем API
      appendLog('api', '→ Запуск API...');
      await startDev('api', path.join(ROOT_DIR, 'apps', 'api'));

      // 7. Стартуем Web
      appendLog('web', '→ Запуск Web...');
      await startDev('web', path.join(ROOT_DIR, 'apps', 'web'));

      // 8. Открываем сайт в браузере
      for (let i = 0; i < 20; i++) {
        if (await checkHttp(WEB_URL)) {
          shell.openExternal(WEB_URL);
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      appendLog('infra', '══════════ Quick Start завершён ══════════');
      return true;
    }
    default:
      return false;
  }
}

async function createStaffUser(input) {
  const login = String(input?.login ?? '').trim();
  const name = String(input?.name ?? '').trim();
  const password = String(input?.password ?? '');
  const role = String(input?.role ?? 'OPERATOR').toUpperCase();

  if (!login || !name || password.length < 6) {
    appendLog('api', 'CRM аккаунт не создан: заполните логин, имя и пароль от 6 символов');
    return false;
  }

  if (!['ADMIN', 'OPERATOR'].includes(role)) {
    appendLog('api', 'CRM аккаунт не создан: роль должна быть ADMIN или OPERATOR');
    return false;
  }

  return runCommand('api', 'node', ['scripts/create-staff-user.js'], {
    cwd: path.join(ROOT_DIR, 'apps', 'launcher'),
    env: {
      CRM_LOGIN: login,
      CRM_NAME: name,
      CRM_PASSWORD: password,
      CRM_ROLE: role,
    },
  });
}

async function createCustomerUser(input) {
  const email = String(input?.email ?? '').trim().toLowerCase();
  const name = String(input?.name ?? '').trim();
  const phone = String(input?.phone ?? '').trim();
  const password = String(input?.password ?? '');

  if (!email || !name || password.length < 6) {
    appendLog('api', 'Клиентский аккаунт не создан: заполните email, имя и пароль от 6 символов');
    return false;
  }

  return runCommand('api', 'node', ['scripts/create-customer-user.js'], {
    cwd: path.join(ROOT_DIR, 'apps', 'launcher'),
    env: {
      CUSTOMER_EMAIL: email,
      CUSTOMER_NAME: name,
      CUSTOMER_PHONE: phone,
      CUSTOMER_PASSWORD: password,
    },
  });
}

function openTarget(target) {
  const map = {
    web: WEB_URL,
    admin: `${WEB_URL}/admin`,
    api: `${API_URL}/api/docs`,
    health: `${API_URL}/health`,
    mailpit: MAILPIT_URL,
    logs: LOG_DIR,
  };
  const value = map[target];
  if (!value) return false;
  if (target === 'logs') shell.openPath(value);
  else shell.openExternal(value);
  return true;
}

ipcMain.handle('get-status', () => getServiceStatus());
ipcMain.handle('refresh-status', () => refreshRuntimeStatus());
ipcMain.handle('get-checks', () => getChecks());
ipcMain.handle('run-action', (_event, action) => runAction(action));
ipcMain.handle('create-staff-user', (_event, input) => createStaffUser(input));
ipcMain.handle('create-customer-user', (_event, input) => createCustomerUser(input));
ipcMain.handle('open-target', (_event, target) => openTarget(target));

ipcMain.handle('get-logs', (_event, serviceKey) => {
  const svc = services[serviceKey];
  if (!svc) return '';
  try {
    const data = fs.readFileSync(svc.logFile, 'utf-8');
    return data.split('\n').filter(Boolean).slice(-300).join('\n');
  } catch {
    return '';
  }
});

ipcMain.handle('start-service', async (_event, serviceKey) => {
  switch (serviceKey) {
    case 'infra':
      return startInfra();
    case 'api':
      return startDev('api', path.join(ROOT_DIR, 'apps', 'api'));
    case 'web':
      return startDev('web', path.join(ROOT_DIR, 'apps', 'web'));
    default:
      return false;
  }
});

ipcMain.handle('stop-service', (_event, serviceKey) => {
  stopProcess(serviceKey);
  return true;
});

ipcMain.handle('start-all', async () => {
  await startInfra();
  await startDev('api', path.join(ROOT_DIR, 'apps', 'api'));
  await startDev('web', path.join(ROOT_DIR, 'apps', 'web'));
  return true;
});

ipcMain.handle('stop-all', () => {
  for (const key of Object.keys(services).reverse()) stopProcess(key);
  return true;
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: 'Грильяж Лаунчер',
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  for (const key of Object.keys(services).reverse()) {
    if (services[key].process) stopProcess(key);
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
