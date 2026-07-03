// Состояние данных
let weekData = null;
let currentWeek = '';

// Статусы
const STATUS = {
    NO: 0,      // ❌ Не выполнено
    OK: 1,      // ✅ Выполнено
    WAIT: 2     // 🔄 В процессе
};

// Теперь используем кружочки вместо эмодзи
const STATUS_SYMBOLS = {
    0: '❌',
    1: '✅',
    2: '🔄'
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
        document.getElementById('weekInfo').textContent = `Неделя: ${currentWeek}`;
        
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
    
    // Заголовок
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

    // Инициализируем счётчики
    const totals = {
        tower: { ok: 0, total: 0 },
        doomsday: { ok: 0, total: 0 },
        kvm_tue: { ok: 0, total: 0 },
        kvm_thu: { ok: 0, total: 0 },
        kvm_sun: { ok: 0, total: 0 },
        gvg: { ok: 0, total: 0 }
    };

    // Группы
    data.groups.forEach((group, groupIndex) => {
        // Заголовок группы с полем ввода справа
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

        // Игроки группы
        group.players.forEach((player, playerIndex) => {
            const rowId = `row-${groupIndex}-${playerIndex}`;
            
            html += `<tr id="${rowId}">`;
            html += `<td class="col-nick">${player.nick}</td>`;
            
            // Колонки со статусами
            const columns = ['tower', 'doomsday', 'kvm_tue', 'kvm_thu', 'kvm_sun', 'gvg'];
            columns.forEach(col => {
                const value = player[col] !== undefined ? player[col] : STATUS.NO;
                const symbol = STATUS_SYMBOLS[value] || '●';
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
                
                // Обновляем счётчики
                totals[col].total++;
                if (value === STATUS.OK) {
                    totals[col].ok++;
                }
            });
            
            html += '</tr>';
        });
    });

    // Строка итогов
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

// Переключение статуса при клике
function toggleStatus(element) {
    const groupIdx = parseInt(element.dataset.group);
    const playerIdx = parseInt(element.dataset.player);
    const col = element.dataset.col;
    
    if (!weekData || !weekData.groups[groupIdx]) return;
    
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;
    
    // Циклическое переключение: 0 → 2 → 1 → 0
    const currentValue = player[col] !== undefined ? player[col] : STATUS.NO;
    let newValue;
    
    if (currentValue === STATUS.NO) {
        newValue = STATUS.WAIT;
    } else if (currentValue === STATUS.WAIT) {
        newValue = STATUS.OK;
    } else {
        newValue = STATUS.NO;
    }
    
    // Обновляем данные
    player[col] = newValue;
    
    // Обновляем отображение
    element.textContent = STATUS_SYMBOLS[newValue];
    element.className = `col-status ${STATUS_CLASSES[newValue]}`;
    element.style.color = STATUS_COLORS[newValue];
    
    // Пересчитываем итоги
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
    
    // Проверяем, нет ли уже такого игрока
    const existing = weekData.groups[groupIndex].players.some(p => p.nick === nick);
    if (existing) {
        alert('Игрок с таким ником уже есть в этой группе!');
        return;
    }
    
    // Добавляем игрока
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
    
    // Перерисовываем таблицу
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

    // Обновляем строку итогов
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

// Сохранение в TXT с табуляторами
function saveTXT() {
    if (!weekData) {
        alert('Нет данных для сохранения!');
        return;
    }

    const columns = ['tower', 'doomsday', 'kvm_tue', 'kvm_thu', 'kvm_sun', 'gvg'];
    const columnNames = ['Башня', 'Судный день', 'КВМ Вт', 'КВМ Чт', 'КВМ Вс', 'ГВГ Сб 600+'];
    const statusNames = ['❌', '✅', '🔄'];
    
    let lines = [];
    
    // Заголовок
    lines.push('Ник\t' + columnNames.join('\t'));
    
    // Данные по группам
    weekData.groups.forEach(group => {
        // Заголовок группы
        lines.push(`=== ${group.name} ===`);
        
        group.players.forEach(player => {
            const statuses = columns.map(col => {
                const val = player[col] !== undefined ? player[col] : STATUS.NO;
                return statusNames[val] || '❌';
            });
            lines.push(player.nick + '\t' + statuses.join('\t'));
        });
        
        // Пустая строка между группами
        lines.push('');
    });
    
    // Итоги
    const totals = calculateTotals();
    const totalStatuses = columns.map(col => {
        return `${totals[col].ok}/${totals[col].total}`;
    });
    lines.push('ИТОГО:\t' + totalStatuses.join('\t'));
    
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

// Подсчёт итогов
function calculateTotals() {
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
    
    return totals;
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadWeekData();
    
    document.getElementById('saveBtn').addEventListener('click', saveTXT);
});