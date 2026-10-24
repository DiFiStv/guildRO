// ============ КОНФИГУРАЦИЯ ============
let IS_LOCAL = false; // определим асинхронно

// ============ СОСТОЯНИЕ ============
let weekData = null;
let currentWeek = '';
let currentTab = 'doomsday';

const STATUS = { NO: 0, OK: 1 };
const STATUS_SYMBOLS = { 0: '❌', 1: '✅' };
const STATUS_COLORS = { 0: '#ff4444', 1: '#4caf50' };
const STATUS_CLASSES = { 0: 'status-0', 1: 'status-1' };

// ============ ОПРЕДЕЛЕНИЕ РЕЖИМА ============
async function detectLocal() {
    const host = location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
        IS_LOCAL = false;
        return;
    }
    try {
        const r = await fetch('/api/ping', { method: 'HEAD' });
        IS_LOCAL = r.ok;
    } catch {
        IS_LOCAL = false;
    }
}

// ============ ЗАГРУЗКА ============
async function loadWeekData() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`players.json?t=${timestamp}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        weekData = data;

        // Миграция: если старый формат с illusion — переносим в doomsday
        weekData.groups.forEach(group => {
            group.players.forEach(player => {
                if (player.illusion && !player.doomsday) {
                    player.doomsday = player.illusion;
                    delete player.illusion;
                }
                if (!player.thanatos) player.thanatos = { t1: 0, t2: 0, t3: 0 };
            });
        });

        const now = new Date();
        const weekNumber = getWeekNumber(now);
        currentWeek = `${weekNumber}-я неделя ${now.getFullYear()}`;
        document.getElementById('weekInfo').textContent = `📅 Неделя: ${currentWeek}`;

        if (weekData.kvm) {
            document.getElementById('kvmTuePoints').value = weekData.kvm.tue?.points || 0;
            document.getElementById('kvmThuPoints').value = weekData.kvm.thu?.points || 0;
            document.getElementById('kvmSunPoints').value = weekData.kvm.sun?.points || 0;
        }
        updateKvmTotal();
        renderOtherworld();
        initOtherworldEditor();
        renderTable(currentTab);

        // Показываем «Применить» только в localhost
        if (IS_LOCAL) {
            document.getElementById('applyBtn').style.display = '';
            document.getElementById('otherworldEditor').style.display = '';
        }

        return true;
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('tableContainer').innerHTML = `
            <div style="text-align: center; color: #ff4444; padding: 40px;">
                ❌ Ошибка загрузки данных<br>
                <small style="color: #888;">${error.message}</small>
            </div>
        `;
        return false;
    }
}

function getWeekNumber(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = (date - startOfYear + (startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60000) / 86400000;
    return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
}

// ============ ВКЛАДКИ ============
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderTable(tab);
}

// ============ РЕНДЕР ТАБЛИЦЫ ============
function renderTable(tab) {
    const container = document.getElementById('tableContainer');
    if (!weekData || !weekData.groups || weekData.groups.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 40px;">Нет данных</div>';
        return;
    }

    let html = '<div class="week-table-wrapper"><table class="week-table">';

    // Заголовки
    if (tab === 'doomsday') {
        html += `<thead><tr>
            <th class="col-nick">Ник</th>
            <th class="col-status">Минотавр 1</th>
            <th class="col-status">Бафомет 2</th>
            <th class="col-status">Бафомет 3</th>
            ${IS_LOCAL ? '<th class="col-remove">Исключить</th>' : ''}
        </tr></thead><tbody>`;
    } else if (tab === 'thanatos') {
        html += `<thead><tr>
            <th class="col-nick">Ник</th>
            <th class="col-status">Танатос 1</th>
            <th class="col-status">Танатос 2</th>
            <th class="col-status">Танатос 3</th>
            ${IS_LOCAL ? '<th class="col-remove">Исключить</th>' : ''}
        </tr></thead><tbody>`;
    } else if (tab === 'guild') {
        html += `<thead><tr>
            <th class="col-nick">Ник</th>
            <th class="col-status">КВМ Вт</th>
            <th class="col-status">КВМ Чт</th>
            <th class="col-status">ГВГ Сб 600+</th>
            <th class="col-status">КВМ Вс</th>
            ${IS_LOCAL ? '<th class="col-remove">Исключить</th>' : ''}
        </tr></thead><tbody>`;
    } else if (tab === 'tower') {
        html += `<thead><tr>
            <th class="col-nick">Ник</th>
            <th class="col-prof">Профа</th>
            <th class="col-dps">ДПС</th>
            <th class="col-tower">Результат</th>
            ${IS_LOCAL ? '<th class="col-remove">Исключить</th>' : ''}
        </tr></thead><tbody>`;
    }

    const totals = {};

    let colspan;
    if (tab === 'doomsday') colspan = IS_LOCAL ? 5 : 4;
    else if (tab === 'thanatos') colspan = IS_LOCAL ? 5 : 4;
    else if (tab === 'guild') colspan = IS_LOCAL ? 6 : 5;
    else if (tab === 'tower') colspan = IS_LOCAL ? 5 : 4;

    weekData.groups.forEach((group, groupIndex) => {
        html += `<tr class="group-header"><td colspan="${colspan}">
            <span class="group-name">${group.name}</span>
            <span class="group-controls">
                <input type="text" class="add-input" id="addInput-${groupIndex}" placeholder="Новый ник">
                <button class="add-btn" onclick="addPlayer(${groupIndex})">➕ Добавить</button>
            </span>
        </td></tr>`;

        group.players.forEach((player, playerIndex) => {
            html += `<tr id="row-${groupIndex}-${playerIndex}">`;
            html += `<td class="col-nick">${player.nick}</td>`;

            if (tab === 'doomsday' || tab === 'thanatos') {
                const section = tab;
                const cols = tab === 'doomsday' ? ['mino', 'baph2', 'baph3'] : ['t1', 't2', 't3'];
                cols.forEach(col => {
                    const value = player[section]?.[col] !== undefined ? player[section][col] : STATUS.NO;
                    const symbol = STATUS_SYMBOLS[value] || '❌';
                    const statusClass = STATUS_CLASSES[value] || 'status-0';
                    const color = STATUS_COLORS[value] || '#ff4444';
                    html += `<td class="col-status ${statusClass}"
                        data-group="${groupIndex}" data-player="${playerIndex}"
                        data-tab="${tab}" data-col="${col}"
                        style="color: ${color}"
                        onclick="toggleStatus(this)">${symbol}</td>`;
                    const key = `${tab}_${col}`;
                    if (!totals[key]) totals[key] = { ok: 0, total: 0 };
                    totals[key].total++;
                    if (value === STATUS.OK) totals[key].ok++;
                });
            } else if (tab === 'guild') {
                const cols = ['kvm_tue', 'kvm_thu', 'gvg', 'kvm_sun'];
                cols.forEach(col => {
                    const value = player.guild?.[col] !== undefined ? player.guild[col] : STATUS.NO;
                    const symbol = STATUS_SYMBOLS[value] || '❌';
                    const statusClass = STATUS_CLASSES[value] || 'status-0';
                    const color = STATUS_COLORS[value] || '#ff4444';
                    html += `<td class="col-status ${statusClass}"
                        data-group="${groupIndex}" data-player="${playerIndex}"
                        data-tab="guild" data-col="${col}"
                        style="color: ${color}"
                        onclick="toggleStatus(this)">${symbol}</td>`;
                    const key = `guild_${col}`;
                    if (!totals[key]) totals[key] = { ok: 0, total: 0 };
                    totals[key].total++;
                    if (value === STATUS.OK) totals[key].ok++;
                });
            } else if (tab === 'tower') {
                const prof = player.tower?.prof || '';
                const dps = player.tower?.dps || 0;
                const result = player.tower?.result !== undefined ? player.tower.result : -1;
                html += `<td class="col-prof">${prof}</td>`;
                if (IS_LOCAL) {
                    html += `<td class="col-dps">
                        <input type="number" class="dps-input" value="${dps}"
                            data-group="${groupIndex}" data-player="${playerIndex}"
                            onchange="updateTowerDps(this)">
                    </td>`;
                } else {
                    html += `<td class="col-dps">${formatDps(dps)}</td>`;
                }
                html += `<td class="col-tower ${getTowerClass(result)}"
                    data-group="${groupIndex}" data-player="${playerIndex}"
                    onclick="toggleTowerResult(this)">${getTowerDisplay(result)}</td>`;
                if (!totals.tower) totals.tower = { total: 0, passed: 0 };
                totals.tower.total++;
                if (result >= 1 && result <= 16) totals.tower.passed++;
            }

            // Кнопка «Исключить»
            if (IS_LOCAL) {
                html += `<td class="col-remove">
                    <button class="remove-btn" onclick="removePlayer(${groupIndex}, ${playerIndex})">✖</button>
                </td>`;
            }

            html += '</tr>';
        });
    });

    // Итоги
    html += `<tr class="total-row"><td class="col-nick">ИТОГО:</td>`;
    if (tab === 'doomsday') {
        ['mino', 'baph2', 'baph3'].forEach(col => {
            const k = `doomsday_${col}`;
            html += `<td class="col-status">${totals[k]?.ok || 0}/${totals[k]?.total || 0}</td>`;
        });
    } else if (tab === 'thanatos') {
        ['t1', 't2', 't3'].forEach(col => {
            const k = `thanatos_${col}`;
            html += `<td class="col-status">${totals[k]?.ok || 0}/${totals[k]?.total || 0}</td>`;
        });
    } else if (tab === 'guild') {
        ['kvm_tue', 'kvm_thu', 'gvg', 'kvm_sun'].forEach(col => {
            const k = `guild_${col}`;
            html += `<td class="col-status">${totals[k]?.ok || 0}/${totals[k]?.total || 0}</td>`;
        });
    } else if (tab === 'tower') {
        html += `<td class="col-tower" colspan="3">${totals.tower?.passed || 0}/${totals.tower?.total || 0} пройдено</td>`;
    }
    if (IS_LOCAL) html += `<td class="col-remove"></td>`;
    html += '</tr></tbody></table></div>';
    container.innerHTML = html;
}

// ============ БАШНЯ ============
function getTowerDisplay(result) {
    if (result === -1) return '❌';
    if (result === 0) return '⏳';
    if (result === 16) return '✨16';
    if (result >= 1 && result <= 15) return result.toString();
    return '❌';
}
function formatDps(value) {
    if (!value || value === 0) return '0';
    const num = Number(value);
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' млрд';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' млн';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + ' тыс';
    return num.toString();
}
function getTowerClass(result) {
    if (result === -1) return 'tower-no';
    if (result === 0) return 'tower-wait';
    if (result === 16) return 'tower-gold';
    if (result >= 1 && result <= 15) return 'tower-normal';
    return 'tower-no';
}

// ============ СТАТУСЫ ============
function toggleStatus(element) {
    const groupIdx = parseInt(element.dataset.group);
    const playerIdx = parseInt(element.dataset.player);
    const tab = element.dataset.tab;
    const col = element.dataset.col;
    if (!weekData?.groups[groupIdx]) return;
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;

    const section = tab;
    if (!player[section]) player[section] = {};
    const cur = player[section][col] !== undefined ? player[section][col] : STATUS.NO;
    const next = cur === STATUS.OK ? STATUS.NO : STATUS.OK;
    player[section][col] = next;

    element.textContent = STATUS_SYMBOLS[next];
    element.className = `col-status ${STATUS_CLASSES[next]}`;
    element.style.color = STATUS_COLORS[next];
    renderTable(currentTab);
}

function toggleTowerResult(element) {
    const groupIdx = parseInt(element.dataset.group);
    const playerIdx = parseInt(element.dataset.player);
    if (!weekData?.groups[groupIdx]) return;
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;
    if (!player.tower) player.tower = { prof: '', dps: 0, result: -1 };
    const cur = player.tower.result !== undefined ? player.tower.result : -1;
    let next;
    if (cur === -1) next = 1;
    else if (cur >= 1 && cur < 16) next = cur + 1;
    else next = -1;
    player.tower.result = next;
    element.textContent = getTowerDisplay(next);
    element.className = `col-tower ${getTowerClass(next)}`;
    renderTable(currentTab);
}

function updateTowerDps(input) {
    const groupIdx = parseInt(input.dataset.group);
    const playerIdx = parseInt(input.dataset.player);
    if (!weekData?.groups[groupIdx]) return;
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;
    if (!player.tower) player.tower = { prof: '', dps: 0, result: -1 };
    player.tower.dps = parseInt(input.value) || 0;
}

// ============ ИГРОКИ ============
function addPlayer(groupIndex) {
    const input = document.getElementById(`addInput-${groupIndex}`);
    const nick = input.value.trim();
    if (!nick) { alert('Введите ник игрока!'); return; }
    const existing = weekData.groups[groupIndex].players.some(p => p.nick === nick);
    if (existing) { alert('Игрок с таким ником уже есть в этой группе!'); return; }

    const newPlayer = {
        id: Date.now(),
        nick: nick,
        doomsday: { mino: 0, baph2: 0, baph3: 0 },
        thanatos: { t1: 0, t2: 0, t3: 0 },
        guild: { kvm_tue: 0, kvm_thu: 0, gvg: 0, kvm_sun: 0 },
        tower: { prof: '', dps: 0, result: -1 }
    };
    weekData.groups[groupIndex].players.push(newPlayer);
    input.value = '';
    renderTable(currentTab);
}

function removePlayer(groupIndex, playerIndex) {
    const player = weekData.groups[groupIndex]?.players[playerIndex];
    if (!player) return;
    if (!confirm(`Удалить игрока «${player.nick}»?`)) return;
    weekData.groups[groupIndex].players.splice(playerIndex, 1);
    renderTable(currentTab);
}

// ============ КВМ ============
function updateKvmTotal() {
    const tue = parseInt(document.getElementById('kvmTuePoints').value) || 0;
    const thu = parseInt(document.getElementById('kvmThuPoints').value) || 0;
    const sun = parseInt(document.getElementById('kvmSunPoints').value) || 0;
    document.getElementById('kvmTotalSum').textContent = tue + thu + sun;
}

// ============ ИНОМИР ============
function renderOtherworld() {
    const ow = weekData.otherworld || { active: false };
    const titleEl = document.getElementById('otherworldTitle');
    const infoEl = document.getElementById('otherworldInfo');
    const cloud = document.getElementById('otherworldCloud');

    titleEl.textContent = '🌌 ИНОМИР';
    if (ow.active && ow.date && ow.day && ow.time) {
        infoEl.textContent = `Иномир будет открыт ${ow.date} ${ow.day} ${ow.time}-${addMinutes(ow.time, 20)}`;
        cloud.style.background = 'linear-gradient(135deg, #1a0533, #2d1b69, #1a0533)';
    } else {
        infoEl.textContent = 'Иномир набирает силы...';
        cloud.style.background = 'linear-gradient(135deg, #0a0a1a, #1a0a2e, #0a0a1a)';
    }
}

function addMinutes(time, mins) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function initOtherworldEditor() {
    const timeSelect = document.getElementById('owTime');
    timeSelect.innerHTML = '';
    for (let h = 19; h <= 23; h++) {
        for (let m = 0; m < 60; m += 20) {
            const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            timeSelect.appendChild(opt);
        }
    }
    // 24:00 — отдельно
    const opt24 = document.createElement('option');
    opt24.value = '23:40';
    opt24.textContent = '23:40';
    // (на самом деле 23:40 уже есть выше, но если нужен 24:00 — это 00:00 следующего дня, лучше не добавлять)

    const ow = weekData.otherworld || {};
    document.getElementById('owDate').value = ow.date || '';
    document.getElementById('owDay').value = ow.day || '';
    document.getElementById('owTime').value = ow.time || '19:00';
    document.getElementById('owActive').checked = !!ow.active;

    // Обработчики
    ['owDate', 'owDay', 'owTime', 'owActive'].forEach(id => {
        document.getElementById(id).addEventListener('change', saveOtherworldToMemory);
    });
}

function saveOtherworldToMemory() {
    if (!weekData) return;
    weekData.otherworld = {
        active: document.getElementById('owActive').checked,
        date: document.getElementById('owDate').value,
        day: document.getElementById('owDay').value,
        time: document.getElementById('owTime').value
    };
    renderOtherworld();
}

// ============ СОХРАНЕНИЕ НА СЕРВЕР ============
async function applyChanges() {
    if (!weekData) { alert('Нет данных'); return; }
    // Собираем актуальные КВМ-очки
    weekData.kvm = {
        tue: { points: parseInt(document.getElementById('kvmTuePoints').value) || 0 },
        thu: { points: parseInt(document.getElementById('kvmThuPoints').value) || 0 },
        sun: { points: parseInt(document.getElementById('kvmSunPoints').value) || 0 }
    };
    saveOtherworldToMemory();

    try {
        const r = await fetch('/api/save/players.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(weekData)
        });
        const j = await r.json();
        if (!j.ok) {
            alert('❌ Ошибка сохранения: ' + (j.error || 'неизвестно'));
            return;
        }
        alert('✅ Сохранено в Dynamic и Static');
    } catch (e) {
        alert('❌ Ошибка сети: ' + e.message);
    }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', async function() {
    await detectLocal();
    await loadWeekData();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    const applyBtn = document.getElementById('applyBtn');
    if (applyBtn) applyBtn.addEventListener('click', applyChanges);
});

// Экспорт
window.toggleStatus = toggleStatus;
window.toggleTowerResult = toggleTowerResult;
window.updateTowerDps = updateTowerDps;
window.addPlayer = addPlayer;
window.removePlayer = removePlayer;
window.updateKvmTotal = updateKvmTotal;
window.switchTab = switchTab;