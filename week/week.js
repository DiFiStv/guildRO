// Состояние данных
let weekData = null;
let currentWeek = '';

// Статусы
const STATUS = {
    NO: 0,
    OK: 1,
    WAIT: 2
};

const STATUS_SYMBOLS = {
    0: '❌',
    1: '✅',
    2: '⏹'
};

const STATUS_COLORS = {
    0: '#ff4444',
    1: '#4caf50',
    2: '#ff9800'
};

const STATUS_CLASSES = {
    0: 'status-0',
    1: 'status-1',
    2: 'status-2'
};

// Загрузка данных
async function loadWeekData() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`players.json?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        weekData = data;
        
        // Определяем неделю
        const now = new Date();
        const weekNumber = getWeekNumber(now);
        currentWeek = `${weekNumber}-я неделя ${now.getFullYear()}`;
        document.getElementById('weekInfo').textContent = `📅 Неделя: ${currentWeek}`;
        
        // Загружаем КВМ очки
        if (weekData.kvm) {
            document.getElementById('kvmTuePoints').value = weekData.kvm.tue?.points || 0;
            document.getElementById('kvmThuPoints').value = weekData.kvm.thu?.points || 0;
            document.getElementById('kvmSunPoints').value = weekData.kvm.sun?.points || 0;
        }

        updateKvmTotal();
        
        // Загружаем Иномир
        if (weekData.otherworld) {
            if (weekData.otherworld.active) {
                document.getElementById('otherworldTitle').textContent = weekData.otherworld.title || '🌌 ИНОМИР';
                document.getElementById('otherworldInfo').textContent = weekData.otherworld.info || 'Набирает силы...';
                document.getElementById('otherworldCloud').style.background = 'linear-gradient(135deg, #1a0533, #2d1b69, #1a0533)';
            } else {
                document.getElementById('otherworldTitle').textContent = '🌌 ИНОМИР';
                document.getElementById('otherworldInfo').textContent = 'Набирает силы...';
                document.getElementById('otherworldCloud').style.background = 'linear-gradient(135deg, #0a0a1a, #1a0a2e, #0a0a1a)';
            }
        } else {
            document.getElementById('otherworldTitle').textContent = '🌌 ИНОМИР';
            document.getElementById('otherworldInfo').textContent = 'Набирает силы...';
            document.getElementById('otherworldCloud').style.background = 'linear-gradient(135deg, #0a0a1a, #1a0a2e, #0a0a1a)';
        }
        
        renderTable(weekData);
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

// Получение номера недели
function getWeekNumber(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = (date - startOfYear + (startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60000) / 86400000;
    return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
}

// Рендер таблицы
function renderTable(data) {
    const container = document.getElementById('tableContainer');
    
    if (!data || !data.groups || data.groups.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 40px;">Нет данных</div>';
        return;
    }

    let html = '<div class="week-table-wrapper"><table class="week-table">';
    
    html += `
        <thead>
            <tr>
                <th class="col-nick">Ник</th>
                <th class="col-status">Башня</th>
                <th class="col-status">Судный день</th>
                <th class="col-status">КВМ Вт</th>
                <th class="col-status">КВМ Чт</th>
                <th class="col-status">КВМ Вс</th>
                <th class="col-status">ГВГ Сб 600+</th>
            </tr>
        </thead>
        <tbody>
    `;

    const totals = {
        tower: { ok: 0, total: 0 },
        doomsday: { ok: 0, total: 0 },
        kvm_tue: { ok: 0, total: 0 },
        kvm_thu: { ok: 0, total: 0 },
        kvm_sun: { ok: 0, total: 0 },
        gvg: { ok: 0, total: 0 }
    };

    data.groups.forEach((group, groupIndex) => {
        html += `
            <tr class="group-header">
                <td colspan="7">
                    <span class="group-name">${group.name}</span>
                    <span class="group-controls">
                        <input type="text" class="add-input" id="addInput-${groupIndex}" placeholder="Новый ник">
                        <button class="add-btn" onclick="addPlayer(${groupIndex})">➕ Добавить</button>
                    </span>
                </td>
            </tr>
        `;

        group.players.forEach((player, playerIndex) => {
            html += `<tr id="row-${groupIndex}-${playerIndex}">`;
            html += `<td class="col-nick">${player.nick}</td>`;
            
            const columns = ['tower', 'doomsday', 'kvm_tue', 'kvm_thu', 'kvm_sun', 'gvg'];
            columns.forEach(col => {
                const value = player[col] !== undefined ? player[col] : STATUS.NO;
                const symbol = STATUS_SYMBOLS[value] || '❌';
                const statusClass = STATUS_CLASSES[value] || 'status-0';
                const color = STATUS_COLORS[value] || '#ff4444';
                
                html += `
                    <td class="col-status ${statusClass}" 
                        data-group="${groupIndex}" 
                        data-player="${playerIndex}" 
                        data-col="${col}"
                        style="color: ${color}"
                        onclick="toggleStatus(this)">
                        ${symbol}
                    </td>
                `;
                
                totals[col].total++;
                if (value === STATUS.OK) {
                    totals[col].ok++;
                }
            });
            
            html += '</tr>';
        });
    });

    html += `
        <tr class="total-row">
            <td class="col-nick">ИТОГО:</td>
            <td class="col-status">${totals.tower.ok}/${totals.tower.total}</td>
            <td class="col-status">${totals.doomsday.ok}/${totals.doomsday.total}</td>
            <td class="col-status">${totals.kvm_tue.ok}/${totals.kvm_tue.total}</td>
            <td class="col-status">${totals.kvm_thu.ok}/${totals.kvm_thu.total}</td>
            <td class="col-status">${totals.kvm_sun.ok}/${totals.kvm_sun.total}</td>
            <td class="col-status">${totals.gvg.ok}/${totals.gvg.total}</td>
        </tr>
    `;

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Переключение статуса
function toggleStatus(element) {
    const groupIdx = parseInt(element.dataset.group);
    const playerIdx = parseInt(element.dataset.player);
    const col = element.dataset.col;
    
    if (!weekData || !weekData.groups[groupIdx]) return;
    
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;
    
    const currentValue = player[col] !== undefined ? player[col] : STATUS.NO;
    let newValue;
    
    if (currentValue === STATUS.NO) {
        newValue = STATUS.WAIT;
    } else if (currentValue === STATUS.WAIT) {
        newValue = STATUS.OK;
    } else {
        newValue = STATUS.NO;
    }
    
    player[col] = newValue;
    
    element.textContent = STATUS_SYMBOLS[newValue];
    element.className = `col-status ${STATUS_CLASSES[newValue]}`;
    element.style.color = STATUS_COLORS[newValue];
    
    recalculateTotals();
}

// Добавление игрока
function addPlayer(groupIndex) {
    const input = document.getElementById(`addInput-${groupIndex}`);
    const nick = input.value.trim();
    
    if (!nick) {
        alert('Введите ник игрока!');
        return;
    }
    
    const existing = weekData.groups[groupIndex].players.some(p => p.nick === nick);
    if (existing) {
        alert('Игрок с таким ником уже есть в этой группе!');
        return;
    }
    
    const newPlayer = {
        id: Date.now(),
        nick: nick,
        tower: STATUS.NO,
        doomsday: STATUS.NO,
        kvm_tue: STATUS.NO,
        kvm_thu: STATUS.NO,
        kvm_sun: STATUS.NO,
        gvg: STATUS.NO
    };
    
    weekData.groups[groupIndex].players.push(newPlayer);
    input.value = '';
    renderTable(weekData);
}

// Пересчёт итогов
function recalculateTotals() {
    const totals = {
        tower: { ok: 0, total: 0 },
        doomsday: { ok: 0, total: 0 },
        kvm_tue: { ok: 0, total: 0 },
        kvm_thu: { ok: 0, total: 0 },
        kvm_sun: { ok: 0, total: 0 },
        gvg: { ok: 0, total: 0 }
    };

    const columns = ['tower', 'doomsday', 'kvm_tue', 'kvm_thu', 'kvm_sun', 'gvg'];
    
    weekData.groups.forEach(group => {
        group.players.forEach(player => {
            columns.forEach(col => {
                const value = player[col] !== undefined ? player[col] : STATUS.NO;
                totals[col].total++;
                if (value === STATUS.OK) {
                    totals[col].ok++;
                }
            });
        });
    });

    const totalRow = document.querySelector('.week-table .total-row');
    if (totalRow) {
        const cells = totalRow.querySelectorAll('.col-status');
        columns.forEach((col, idx) => {
            if (cells[idx]) {
                cells[idx].textContent = `${totals[col].ok}/${totals[col].total}`;
            }
        });
    }
}

// Сбор данных для статистики
function collectStats() {
    const columns = ['tower', 'doomsday', 'kvm_tue', 'kvm_thu', 'kvm_sun', 'gvg'];
    const totals = {
        tower: { ok: 0, total: 0 },
        doomsday: { ok: 0, total: 0 },
        kvm_tue: { ok: 0, total: 0 },
        kvm_thu: { ok: 0, total: 0 },
        kvm_sun: { ok: 0, total: 0 },
        gvg: { ok: 0, total: 0 }
    };
    
    weekData.groups.forEach(group => {
        group.players.forEach(player => {
            columns.forEach(col => {
                const value = player[col] !== undefined ? player[col] : STATUS.NO;
                totals[col].total++;
                if (value === STATUS.OK) {
                    totals[col].ok++;
                }
            });
        });
    });
    
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    
    return {
        year: now.getFullYear(),
        week: weekNumber,
        tower: totals.tower.ok,
        doomsday: totals.doomsday.ok,
        kvm_tue_ok: totals.kvm_tue.ok,
        kvm_tue_points: parseInt(document.getElementById('kvmTuePoints').value) || 0,
        kvm_thu_ok: totals.kvm_thu.ok,
        kvm_thu_points: parseInt(document.getElementById('kvmThuPoints').value) || 0,
        kvm_sun_ok: totals.kvm_sun.ok,
        kvm_sun_points: parseInt(document.getElementById('kvmSunPoints').value) || 0,
        gvg: totals.gvg.ok,
        other: 0
    };
}

// Сохранение JSON
function saveJSON() {
    if (!weekData) {
        alert('Нет данных для сохранения!');
        return;
    }
    
    // Сохраняем КВМ очки
    weekData.kvm = {
        tue: { points: parseInt(document.getElementById('kvmTuePoints').value) || 0 },
        thu: { points: parseInt(document.getElementById('kvmThuPoints').value) || 0 },
        sun: { points: parseInt(document.getElementById('kvmSunPoints').value) || 0 }
    };
    
    const json = JSON.stringify(weekData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Сохранение TXT
function saveTXT() {
    if (!weekData) {
        alert('Нет данных для сохранения!');
        return;
    }

    const columns = ['tower', 'doomsday', 'kvm_tue', 'kvm_thu', 'kvm_sun', 'gvg'];
    const columnNames = ['Башня', 'Судный день', 'КВМ Вт', 'КВМ Чт', 'КВМ Вс', 'ГВГ Сб 600+'];
    const statusNames = ['❌', '✅', '⏹'];
    
    let lines = [];
    lines.push('Ник\t' + columnNames.join('\t'));
    
    weekData.groups.forEach(group => {
        lines.push(`=== ${group.name} ===`);
        group.players.forEach(player => {
            const statuses = columns.map(col => {
                const val = player[col] !== undefined ? player[col] : STATUS.NO;
                return statusNames[val] || '❌';
            });
            lines.push(player.nick + '\t' + statuses.join('\t'));
        });
        lines.push('');
    });
    
    const totals = collectStats();
    lines.push(`ИТОГО:\t${totals.tower}\t${totals.doomsday}\t${totals.kvm_tue_ok}\t${totals.kvm_thu_ok}\t${totals.kvm_sun_ok}\t${totals.gvg}`);
    lines.push('');
    lines.push(`КВМ очки:\tВТ:${totals.kvm_tue_points}\tЧТ:${totals.kvm_thu_points}\tВС:${totals.kvm_sun_points}`);
    
    const txt = lines.join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `week_${currentWeek.replace(/[^0-9a-zA-Z]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Обнуление всех статусов
function resetAll() {
    if (!confirm('❗ Вы уверены, что хотите обнулить все статусы?')) {
        return;
    }
    
    weekData.groups.forEach(group => {
        group.players.forEach(player => {
            player.tower = STATUS.NO;
            player.doomsday = STATUS.NO;
            player.kvm_tue = STATUS.NO;
            player.kvm_thu = STATUS.NO;
            player.kvm_sun = STATUS.NO;
            player.gvg = STATUS.NO;
        });
    });
    
    // Обнуляем КВМ очки
    document.getElementById('kvmTuePoints').value = 0;
    document.getElementById('kvmThuPoints').value = 0;
    document.getElementById('kvmSunPoints').value = 0;
    
    renderTable(weekData);
    alert('✅ Все статусы обнулены!');
}

// Сохранение статистики
function saveStats() {
    if (!weekData) {
        alert('Нет данных для сохранения!');
        return;
    }
    
    const stats = collectStats();
    
    // Загружаем существующую статистику
    fetch('stats.json')
        .then(response => response.json())
        .then(existingStats => {
            // Добавляем новую запись
            if (!existingStats.weeks) {
                existingStats.weeks = [];
            }
            
            // Проверяем, есть ли уже запись за эту неделю
            const existingIndex = existingStats.weeks.findIndex(w => 
                w.year === stats.year && w.week === stats.week
            );
            
            if (existingIndex !== -1) {
                // Обновляем существующую запись
                existingStats.weeks[existingIndex] = stats;
            } else {
                // Добавляем новую запись
                existingStats.weeks.push(stats);
            }
            
            // Сортируем по году и неделе
            existingStats.weeks.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.week - b.week;
            });
            
            const json = JSON.stringify(existingStats, null, 2);
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'stats.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`✅ Статистика за ${stats.week}-ю неделю ${stats.year} года сохранена!`);
        })
        .catch(() => {
            // Если stats.json нет, создаём новый
            const newStats = { weeks: [stats] };
            const json = JSON.stringify(newStats, null, 2);
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'stats.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`✅ Статистика за ${stats.week}-ю неделю ${stats.year} года сохранена!`);
        });
}

// Обновление итоговой суммы КВМ очков
function updateKvmTotal() {
    const tue = parseInt(document.getElementById('kvmTuePoints').value) || 0;
    const thu = parseInt(document.getElementById('kvmThuPoints').value) || 0;
    const sun = parseInt(document.getElementById('kvmSunPoints').value) || 0;
    const total = tue + thu + sun;
    document.getElementById('kvmTotalSum').textContent = total;
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadWeekData();
    
    document.getElementById('saveJsonBtn').addEventListener('click', saveJSON);
    document.getElementById('saveTxtBtn').addEventListener('click', saveTXT);
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('saveStatsBtn').addEventListener('click', saveStats);
});