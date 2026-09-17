const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let settings = {};
let versions = [];
let localVersions = [];
let account = { authenticated: false, profile: null };
let activeLoader = 'forge';
let activeContent = 'mods';

const loaderInfo = {
  optifine: { title: 'OptiFine', icon: 'sparkles', description: 'เพิ่มประสิทธิภาพ กราฟิก และรองรับ Shader', help: 'ดาวน์โหลด OptiFine Installer จากเว็บไซต์ทางการ จากนั้นเลือกไฟล์ .jar ที่ดาวน์โหลดไว้' },
  forge: { title: 'Forge', icon: 'anvil', description: 'Mod loader ยอดนิยมสำหรับม็อด Minecraft จำนวนมาก', help: 'ดาวน์โหลด Forge Installer จากเว็บไซต์ทางการ จากนั้นเลือกไฟล์ .jar ที่ดาวน์โหลดไว้' },
  fabric: { title: 'Fabric', icon: 'feather', description: 'Mod loader ที่เบา รวดเร็ว และอัปเดตไว', help: 'ดาวน์โหลด Fabric Installer จากเว็บไซต์ทางการ จากนั้นเลือกไฟล์ .jar ที่ดาวน์โหลดไว้' }
};

const contentInfo = {
  mods: { title: 'Mods', description: 'จัดการม็อดนามสกุล .jar', icon: 'puzzle' },
  resourcepacks: { title: 'Resource Packs', description: 'จัดการ Texture และ Resource Pack นามสกุล .zip', icon: 'package-open' },
  shaders: { title: 'Shaders', description: 'จัดการ Shader Pack นามสกุล .zip', icon: 'sun-medium' }
};

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

function setSelect(name, items, selected, onChange) {
  const root = document.querySelector(`[data-select="${name}"]`);
  if (!root) return;
  const hidden = root.querySelector('input');
  const trigger = root.querySelector('.select-trigger');
  const value = root.querySelector('.select-value');
  const content = root.querySelector('.select-content');
  const normalized = items.map(item => typeof item === 'string' ? { value: item, label: item } : item);
  const current = normalized.find(item => item.value === selected) || normalized[0];
  if (!current) return;
  hidden.value = current.value;
  value.textContent = current.label;
  content.innerHTML = normalized.map(item => `<button type="button" class="select-option ${item.value === current.value ? 'selected' : ''}" role="option" aria-selected="${item.value === current.value}" data-value="${item.value}"><span>${item.label}</span>${item.meta ? `<small>${item.meta}</small>` : ''}${item.value === current.value ? '<i data-lucide="check"></i>' : ''}</button>`).join('');

  const close = () => { root.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
  const choose = item => {
    hidden.value = item.value;
    value.textContent = item.label;
    close();
    setSelect(name, normalized, item.value, onChange);
    if (onChange) onChange(item.value);
  };
  trigger.onclick = event => {
    event.stopPropagation();
    const willOpen = !root.classList.contains('open');
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    root.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
  };
  trigger.onkeydown = event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); trigger.click(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const index = Math.max(0, normalized.findIndex(item => item.value === hidden.value));
      const next = event.key === 'ArrowDown' ? Math.min(normalized.length - 1, index + 1) : Math.max(0, index - 1);
      choose(normalized[next]);
    }
  };
  content.querySelectorAll('.select-option').forEach(option => option.onclick = event => {
    event.stopPropagation();
    choose(normalized.find(item => item.value === option.dataset.value));
  });
  refreshIcons();
}

document.addEventListener('click', () => document.querySelectorAll('.custom-select.open').forEach(el => {
  el.classList.remove('open');
  el.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
}));

function toast(message, type) {
  const el = $('#toast');
  if (!el) return;

  const msg = String(message || '');
  if (!type) {
    const text = msg.toLowerCase();
    if (text.includes('error') || text.includes('ไม่สำเร็จ') || text.includes('ผิดพลาด') || text.includes('ล้มเหลว') || text.includes('ไม่ได้') || text.includes('ต้องมี') || text.includes('ไม่ถูกต้อง') || text.includes('ไม่พบ')) {
      type = 'error';
    } else if (text.includes('สำเร็จ') || text.includes('แล้ว') || text.includes('พร้อม') || text.includes('เลือก') || text.includes('บันทึก')) {
      type = 'success';
    } else {
      type = 'info';
    }
  }

  const icons = {
    success: '<svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };

  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message"></span>
    <button class="toast-close" type="button" aria-label="ปิด">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;
  el.querySelector('.toast-message').textContent = msg;

  const closeBtn = el.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      el.classList.remove('show');
    };
  }

  // Smooth re-entrance animation
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');

  clearTimeout(el.timer);
  el.timer = setTimeout(() => el.classList.remove('show'), type === 'error' ? 8000 : 3200);
}

function showAlertModal({ title, message, suggestion, action, actionText }) {
  const modal = $('#errorModal');
  if (!modal) return;

  $('#modalTitle').textContent = title || 'ข้อผิดพลาดในการเปิดเกม';
  $('#modalMessage').textContent = message || '';

  const suggBox = $('#modalSuggestion');
  const suggText = $('#modalSuggestionText');
  if (suggestion) {
    suggText.textContent = suggestion;
    suggBox.hidden = false;
  } else {
    suggBox.hidden = true;
  }

  const actionBtn = $('#modalActionBtn');
  if (action && actionText) {
    actionBtn.textContent = actionText;
    actionBtn.hidden = false;
    actionBtn.onclick = () => {
      closeAlertModal();
      if (action === 'settings') openPage('settings');
      else if (action === 'logs') openPage('logs');
    };
  } else {
    actionBtn.hidden = true;
  }

  modal.hidden = false;
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
  if (window.lucide) window.lucide.createIcons();
}

function closeAlertModal() {
  const modal = $('#errorModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { modal.hidden = true; }, 220);
}

function applyAccount(status) {
  account = status;
  const signedIn = Boolean(status.authenticated && status.profile);
  const name = signedIn ? status.profile.name : ($('#username').value || 'Player');
  $('#sideUsername').textContent = name;
  $('#avatarLetter').textContent = name.charAt(0).toUpperCase();
  $('#accountType').textContent = signedIn ? 'MICROSOFT ACCOUNT' : '';
  $('#microsoftLogin').hidden = signedIn;
  $('#microsoftLogout').hidden = !signedIn;
  $('#username').disabled = signedIn;
  if (signedIn) $('#username').value = status.profile.name;
  $('#playSubtext').textContent = signedIn ? 'MICROSOFT' : 'LOCAL MODE';
}

function openPage(name) {
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === name));
  const loader = loaderInfo[name];
  const content = contentInfo[name];
  const pageId = loader ? 'page-loader' : content ? 'page-content' : `page-${name}`;
  $$('.page').forEach(el => el.classList.toggle('active', el.id === pageId));
  if (loader) showLoader(name);
  if (content) showContent(name);
}

function showLoader(type) {
  activeLoader = type;
  const info = loaderInfo[type];
  $('#loaderTitle').textContent = info.title;
  $('#loaderDescription').textContent = info.description;
  $('#loaderHeading').textContent = `ติดตั้ง ${info.title}`;
  $('#loaderHelp').textContent = info.help;
  $('#loaderMark').innerHTML = `<i data-lucide="${info.icon}"></i>`;
  refreshIcons();
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function showContent(type) {
  activeContent = type;
  const info = contentInfo[type];
  $('#contentTitle').textContent = info.title;
  $('#contentDescription').textContent = info.description;
  $('#contentList').innerHTML = '<div class="empty-state"><span><i data-lucide="loader-circle"></i></span><b>กำลังอ่านไฟล์…</b></div>';
  $('#contentEmpty').hidden = true;
  refreshIcons();
  try {
    const files = await window.launcher.listContent(type);
    $('#contentCount').textContent = `${files.length} ไฟล์`;
    $('#contentSize').textContent = formatSize(files.reduce((sum, file) => sum + file.size, 0));
    $('#contentList').innerHTML = files.map(file => `<div class="content-item"><span class="file-icon"><i data-lucide="${info.icon}"></i></span><div class="file-info"><b title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</b><small>${formatSize(file.size)}</small></div><span class="state-pill ${file.enabled ? '' : 'off'}">${file.enabled ? 'เปิดใช้งาน' : 'ปิดอยู่'}</span><button class="toggle-file" data-file="${encodeURIComponent(file.name)}" title="${file.enabled ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}"><i data-lucide="${file.enabled ? 'toggle-right' : 'toggle-left'}"></i></button></div>`).join('');
    $('#contentEmpty').hidden = files.length > 0;
    $$('.toggle-file').forEach(button => button.onclick = async () => {
      await window.launcher.toggleContent(activeContent, decodeURIComponent(button.dataset.file));
      await showContent(activeContent);
    });
    refreshIcons();
  } catch (error) {
    toast(error.message || String(error));
  }
}

function collectSettings() {
  return {
    username: $('#username').value.trim(), version: $('#version').value,
    gameDir: $('#gameDir').value.trim(), javaPath: $('#javaPath').value.trim(),
    minMemory: $('#minMemory').value, maxMemory: $('#maxMemory').value,
    width: Number($('#gameWidth').value), height: Number($('#gameHeight').value),
    fullscreen: $('#fullscreen').checked
  };
}

function applySettings(s) {
  settings = s;
  $('#username').value = s.username;
  $('#sideUsername').textContent = s.username;
  $('#avatarLetter').textContent = s.username.charAt(0).toUpperCase();
  $('#gameDir').value = s.gameDir;
  $('#javaPath').value = s.javaPath;
  $('#minMemory').value = s.minMemory;
  $('#maxMemory').value = s.maxMemory;
  $('#gameWidth').value = s.width;
  $('#gameHeight').value = s.height;
  $('#fullscreen').checked = s.fullscreen;
}

function renderVersions(selected) {
  const active = versions.includes(selected) ? selected : versions[0];
  setSelect('version', versions.map(v => ({ value: v, label: `Minecraft ${v}`, meta: localVersions.includes(v) ? 'ติดตั้งแล้ว' : '' })), active, value => renderVersions(value));
  $('#versionGrid').innerHTML = versions.map(v => `<button class="version-card ${localVersions.includes(v) ? 'local' : ''} ${v === active ? 'selected' : ''}" data-version="${v}"><i></i><b>${v}</b><small>${localVersions.includes(v) ? 'พร้อมเล่น' : 'ดาวน์โหลดเมื่อเปิดเกม'}</small></button>`).join('');
  $$('.version-card').forEach(card => card.addEventListener('click', () => {
    renderVersions(card.dataset.version);
    toast(`เลือก Minecraft ${card.dataset.version}`);
  }));
}

async function init() {
  applySettings(await window.launcher.getSettings());
  applyAccount(await window.launcher.getAuthStatus());
  const result = await window.launcher.listVersions();
  versions = result.versions;
  localVersions = result.local;
  renderVersions(settings.version || result.latest);
  setSelect('minMemory', ['1G','2G','3G','4G'].map(v => ({ value: v, label: `${v.replace('G','')} GB` })), settings.minMemory);
  setSelect('maxMemory', ['2G','4G','6G','8G','12G'].map(v => ({ value: v, label: `${v.replace('G','')} GB` })), settings.maxMemory);
  refreshIcons();
}

$$('.nav-item').forEach(el => el.addEventListener('click', () => openPage(el.dataset.page)));
$('#minimize').addEventListener('click', window.launcher.minimize);
$('#maximize').addEventListener('click', window.launcher.maximize);
$('#close').addEventListener('click', window.launcher.close);
$('#username').addEventListener('input', event => {
  const name = event.target.value || 'P';
  $('#sideUsername').textContent = name;
  $('#avatarLetter').textContent = name.charAt(0).toUpperCase();
});
$('#chooseGameDir').addEventListener('click', async () => { const p = await window.launcher.chooseFolder(); if (p) $('#gameDir').value = p; });
$('#chooseJava').addEventListener('click', async () => { const p = await window.launcher.chooseJava(); if (p) $('#javaPath').value = p; });
$('#openGameDir').addEventListener('click', () => window.launcher.openFolder($('#gameDir').value));
$('#saveSettings').addEventListener('click', async () => { settings = await window.launcher.saveSettings(collectSettings()); toast('บันทึกการตั้งค่าแล้ว'); });
$('#clearLogs').addEventListener('click', () => { $('#logs').textContent = '[Lumina] ล้างบันทึกแล้ว\n'; });
$('#runInstaller').addEventListener('click', async () => {
  const result = await window.launcher.runInstaller(activeLoader);
  if (result.ok) toast(`เปิด ${loaderInfo[activeLoader].title} Installer แล้ว`);
});
$('#openContentFolder').addEventListener('click', () => window.launcher.openContentFolder(activeContent));
$('#importContent').addEventListener('click', async () => {
  const result = await window.launcher.importContent(activeContent);
  if (result.imported) {
    toast(`นำเข้าสำเร็จ ${result.imported} ไฟล์`);
    await showContent(activeContent);
  }
});
$('#microsoftLogin').addEventListener('click', async () => {
  const button = $('#microsoftLogin');
  button.disabled = true;
  button.querySelector('b').textContent = 'กำลังเชื่อมต่อ…';
  const result = await window.launcher.loginMicrosoft();
  button.disabled = false;
  button.querySelector('b').textContent = 'เข้าสู่ระบบ Microsoft';
  if (result.ok) {
    applyAccount({ authenticated: true, profile: result.profile });
    toast(`เข้าสู่ระบบเป็น ${result.profile.name}`);
  } else if (!String(result.error).includes('closed')) {
    toast(result.error);
  }
});
$('#microsoftLogout').addEventListener('click', async () => {
  await window.launcher.logoutMicrosoft();
  applyAccount({ authenticated: false, profile: null });
  toast('ออกจากระบบ Microsoft แล้ว');
});

// Modal Event Listeners
$('#modalCloseBtn')?.addEventListener('click', closeAlertModal);
$('#modalXBtn')?.addEventListener('click', closeAlertModal);
$('#modalLogsBtn')?.addEventListener('click', () => {
  closeAlertModal();
  openPage('logs');
});
$('#errorModal')?.addEventListener('click', e => {
  if (e.target.id === 'errorModal') closeAlertModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = $('#errorModal');
    if (modal && !modal.hidden) closeAlertModal();
  }
});

$('#playButton').addEventListener('click', async () => {
  const button = $('#playButton');
  button.disabled = true;
  $('#playSubtext').textContent = 'PREPARING';
  $('#progressWrap').classList.add('show');
  $('#progressText').textContent = 'กำลังเตรียมไฟล์เกม…';
  const result = await window.launcher.launch(collectSettings());
  if (!result.ok) {
    button.disabled = false;
    $('#playSubtext').textContent = account.authenticated ? 'MICROSOFT' : 'LOCAL MODE';
    $('#progressWrap').classList.remove('show');
    const err = result.details || {
      title: 'เปิดเกมไม่สำเร็จ',
      message: result.error,
      suggestion: 'กรุณาตรวจสอบการตั้งค่าหรือดูรายละเอียดในหน้าบันทึก',
      action: 'logs',
      actionText: 'ดูบันทึก (Logs)'
    };
    toast(`${err.title || 'ข้อผิดพลาด'}: ${err.message}`, 'error');
    showAlertModal(err);
  }
});

window.launcher.onState(({ state, message, error }) => {
  $('#logStatus').innerHTML = `<i></i>${message}`;
  $('#progressText').textContent = message;
  if (state === 'running') { $('#playSubtext').textContent = 'RUNNING'; $('#progressBar').style.width = '100%'; }
  if (state === 'idle' || state === 'error') {
    $('#playButton').disabled = false; $('#playSubtext').textContent = account.authenticated ? 'MICROSOFT' : 'LOCAL MODE';
    setTimeout(() => $('#progressWrap').classList.remove('show'), 1500);
  }
  if (state === 'error') {
    const err = error || {
      title: 'เกิดข้อผิดพลาดในการเปิดเกม',
      message: message,
      suggestion: 'สามารถตรวจสอบข้อผิดพลาดเพิ่มเติมได้ในแท็บ "บันทึก"',
      action: 'logs',
      actionText: 'ดูบันทึก (Logs)'
    };
    toast(`${err.title || 'ข้อผิดพลาด'}: ${err.message}`, 'error');
    showAlertModal(err);
  }
});

window.launcher.onProgress(value => {
  const total = Number(value.total || value.totalBytes || 0);
  const current = Number(value.task || value.current || value.downloaded || 0);
  if (total > 0 && current >= 0) $('#progressBar').style.width = `${Math.min(100, Math.round(current / total * 100))}%`;
  if (value.type) $('#progressText').textContent = `กำลังดาวน์โหลด ${value.type}…`;
});

window.launcher.onLog(({ type, message }) => {
  const logs = $('#logs');
  logs.textContent += `[${type.toUpperCase()}] ${message.replace(/\x1b\[[0-9;]*m/g, '')}\n`;
  logs.scrollTop = logs.scrollHeight;
});

window.launcher.onAuthState(({ state, profile, message }) => {
  if (state === 'authenticated') applyAccount({ authenticated: true, profile });
  if (state === 'local') applyAccount({ authenticated: false, profile: null });
  if (state === 'loading') $('#microsoftLogin').querySelector('b').textContent = 'กำลังเชื่อมต่อ…';
  if (state === 'error') toast(message);
});

init().catch(error => toast(`เริ่มต้นไม่สำเร็จ: ${error.message}`));
