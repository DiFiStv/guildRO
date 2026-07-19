// Состояние данных
let weekData = null;
let currentWeek = '';
let currentTab = 'illusion'; // illusion, guild, tower

// Статусы для иллюзии и гильдии
const STATUS = {
    NO: 0,
    OK: 1
};

const STATUS_SYMBOLS = {
    0: '❌',
    1: '✅'
};

const STATUS_COLORS = {
    0: '#ff4444',
    1: '#4caf50'
};

const STATUS_CLASSES = {
    0: 'status-0',
    1: 'status-1'
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
        
        renderTable(currentTab);
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

// Переключение вкладок
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderTable(tab);
}

// Рендер таблицы
function renderTable(tab) {
    const container = document.getElementById('tableContainer');
    
    if (!weekData || !weekData.groups || weekData.groups.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 40px;">Нет данных</div>';
        return;
    }

    let html = '<div class="week-table-wrapper"><table class="week-table">';
    
    // Заголовок в зависимости от вкладки
    if (tab === 'illusion') {
        html += `
            <thead>
                <tr>
                    <th class="col-nick">Ник</th>
                    <th class="col-status">Минотавр 1</th>
                    <th class="col-status">Бафомет 2</th>
                    <th class="col-status">Бафомет 3</th>
                </tr>
            </thead>
            <tbody>
        `;
    } else if (tab === 'guild') {
        html += `
            <thead>
                <tr>
                    <th class="col-nick">Ник</th>
                    <th class="col-status">КВМ Вт</th>
                    <th class="col-status">КВМ Чт</th>
                    <th class="col-status">ГВГ Сб 600+</th>
                    <th class="col-status">КВМ Вс</th>
                </tr>
            </thead>
            <tbody>
        `;
    } else if (tab === 'tower') {
        html += `
            <thead>
                <tr>
                    <th class="col-nick">Ник</th>
                    <th class="col-prof">Профа</th>
                    <th class="col-dps">ДПС</th>
                    <th class="col-tower">Результат</th>
                </tr>
            </thead>
            <tbody>
        `;
    }

    // Инициализируем счётчики для итогов
    const totals = {};
    
    // Определяем colspan для заголовка группы
    let colspan;
    if (tab === 'illusion') colspan = 4; // Ник + 3 колонки
    else if (tab === 'guild') colspan = 5; // Ник + 4 колонки
    else if (tab === 'tower') colspan = 4; // Ник + Профа + ДПС + Результат
    
    // Проходим по группам
    weekData.groups.forEach((group, groupIndex) => {
        html += `
            <tr class="group-header">
                <td colspan="${colspan}">
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
            
            if (tab === 'illusion') {
                // Иллюзия: mino, baph2, baph3
                const columns = ['mino', 'baph2', 'baph3'];
                columns.forEach(col => {
                    const value = player.illusion?.[col] !== undefined ? player.illusion[col] : STATUS.NO;
                    const symbol = STATUS_SYMBOLS[value] || '❌';
                    const statusClass = STATUS_CLASSES[value] || 'status-0';
                    const color = STATUS_COLORS[value] || '#ff4444';
                    
                    html += `
                        <td class="col-status ${statusClass}" 
                            data-group="${groupIndex}" 
                            data-player="${playerIndex}" 
                            data-tab="illusion"
                            data-col="${col}"
                            style="color: ${color}"
                            onclick="toggleStatus(this)">
                            ${symbol}
                        </td>
                    `;
                    
                    // Считаем итоги
                    const key = `illusion_${col}`;
                    if (!totals[key]) totals[key] = { ok: 0, total: 0 };
                    totals[key].total++;
                    if (value === STATUS.OK) totals[key].ok++;
                });
            } else if (tab === 'guild') {
                // Гильдия: kvm_tue, kvm_thu, gvg, kvm_sun
                const columns = ['kvm_tue', 'kvm_thu', 'gvg', 'kvm_sun'];
                columns.forEach(col => {
                    const value = player.guild?.[col] !== undefined ? player.guild[col] : STATUS.NO;
                    const symbol = STATUS_SYMBOLS[value] || '❌';
                    const statusClass = STATUS_CLASSES[value] || 'status-0';
                    const color = STATUS_COLORS[value] || '#ff4444';
                    
                    html += `
                        <td class="col-status ${statusClass}" 
                            data-group="${groupIndex}" 
                            data-player="${playerIndex}" 
                            data-tab="guild"
                            data-col="${col}"
                            style="color: ${color}"
                            onclick="toggleStatus(this)">
                            ${symbol}
                        </td>
                    `;
                    
                    // Считаем итоги
                    const key = `guild_${col}`;
                    if (!totals[key]) totals[key] = { ok: 0, total: 0 };
                    totals[key].total++;
                    if (value === STATUS.OK) totals[key].ok++;
                });
            } else if (tab === 'tower') {
                // Башня: профа (текст), ДПС (отформатированный), результат
                const prof = player.tower?.prof || '';
                const dps = player.tower?.dps || 0;
                const result = player.tower?.result !== undefined ? player.tower.result : -1;
                
                html += `
                    <td class="col-prof">${prof}</td>
                    <td class="col-dps">${formatDps(dps)}</td>
                    <td class="col-tower ${getTowerClass(result)}" 
                        data-group="${groupIndex}" 
                        data-player="${playerIndex}"
                        onclick="toggleTowerResult(this)">
                        ${getTowerDisplay(result)}
                    </td>
                `;
                
                // Считаем итоги для башни
                if (!totals.tower) totals.tower = { total: 0, passed: 0 };
                totals.tower.total++;
                if (result >= 1 && result <= 15) totals.tower.passed++;
                if (result === 16) totals.tower.passed++;
            }
            
            html += '</tr>';
        });
    });

    // Строка итогов
    html += `<tr class="total-row"><td class="col-nick">ИТОГО:</td>`;
    
    if (tab === 'illusion') {
        const cols = ['mino', 'baph2', 'baph3'];
        cols.forEach(col => {
            const key = `illusion_${col}`;
            const ok = totals[key]?.ok || 0;
            const total = totals[key]?.total || 0;
            html += `<td class="col-status">${ok}/${total}</td>`;
        });
    } else if (tab === 'guild') {
        const cols = ['kvm_tue', 'kvm_thu', 'gvg', 'kvm_sun'];
        cols.forEach(col => {
            const key = `guild_${col}`;
            const ok = totals[key]?.ok || 0;
            const total = totals[key]?.total || 0;
            html += `<td class="col-status">${ok}/${total}</td>`;
        });
    } else if (tab === 'tower') {
        const total = totals.tower?.total || 0;
        const passed = totals.tower?.passed || 0;
        html += `<td class="col-tower" colspan="3">${passed}/${total} пройдено</td>`;
    }
    
    html += '</tr>';
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Получение отображения для башни
function getTowerDisplay(result) {
    if (result === -1) return '❌';
    if (result === 0) return '⏳';
    if (result === 16) return '✨16';
    if (result >= 1 && result <= 15) return result.toString();
    return '❌';
}

// Форматирование ДПС
function formatDps(value) {
    if (!value || value === 0) return '0';
    
    const num = Number(value);
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + ' млрд';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + ' млн';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + ' тыс';
    }
    return num.toString();
}

// Получение класса для башни
function getTowerClass(result) {
    if (result === -1) return 'tower-no';
    if (result === 0) return 'tower-wait';
    if (result === 16) return 'tower-gold';
    if (result >= 1 && result <= 15) return 'tower-normal';
    return 'tower-no';
}

// Переключение статуса (для иллюзии и гильдии)
function toggleStatus(element) {
    const groupIdx = parseInt(element.dataset.group);
    const playerIdx = parseInt(element.dataset.player);
    const tab = element.dataset.tab;
    const col = element.dataset.col;
    
    if (!weekData || !weekData.groups[groupIdx]) return;
    
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;
    
    // Определяем, где хранится значение
    let section;
    if (tab === 'illusion') section = 'illusion';
    else if (tab === 'guild') section = 'guild';
    else return;
    
    if (!player[section]) player[section] = {};
    
    const currentValue = player[section][col] !== undefined ? player[section][col] : STATUS.NO;
    // Переключение: 0 → 1 → 0
    const newValue = currentValue === STATUS.OK ? STATUS.NO : STATUS.OK;
    
    player[section][col] = newValue;
    
    element.textContent = STATUS_SYMBOLS[newValue];
    element.className = `col-status ${STATUS_CLASSES[newValue]}`;
    element.style.color = STATUS_COLORS[newValue];
    
    renderTable(currentTab);
}

// Переключение результата башни
function toggleTowerResult(element) {
    const groupIdx = parseInt(element.dataset.group);
    const playerIdx = parseInt(element.dataset.player);
    
    if (!weekData || !weekData.groups[groupIdx]) return;
    
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;
    
    if (!player.tower) player.tower = { prof: '', result: -1 };
    
    // Циклическое переключение: -1 → 1 → 2 → ... → 16 → -1
    const currentValue = player.tower.result !== undefined ? player.tower.result : -1;
    let newValue;
    
    if (currentValue === -1) {
        newValue = 1;
    } else if (currentValue >= 1 && currentValue < 16) {
        newValue = currentValue + 1;
    } else if (currentValue === 16) {
        newValue = -1;
    } else {
        newValue = -1;
    }
    
    player.tower.result = newValue;
    
    element.textContent = getTowerDisplay(newValue);
    element.className = `col-tower ${getTowerClass(newValue)}`;
    
    renderTable(currentTab);
}

// Обновление профы в башне
function updateTowerProf(input) {
    const groupIdx = parseInt(input.dataset.group);
    const playerIdx = parseInt(input.dataset.player);
    const value = input.value.trim();
    
    if (!weekData || !weekData.groups[groupIdx]) return;
    
    const player = weekData.groups[groupIdx].players[playerIdx];
    if (!player) return;
    
    if (!player.tower) player.tower = { prof: '', result: -1 };
    player.tower.prof = value;
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
        illusion: {
            mino: STATUS.NO,
            baph2: STATUS.NO,
            baph3: STATUS.NO
        },
        guild: {
            kvm_tue: STATUS.NO,
            kvm_thu: STATUS.NO,
            gvg: STATUS.NO,
            kvm_sun: STATUS.NO
        },
        tower: {
            prof: '',
            dps: 0,
            result: -1
        }
    };
    
    weekData.groups[groupIndex].players.push(newPlayer);
    input.value = '';
    renderTable(currentTab);
}

// Сбор данных для статистики
function collectStats() {
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
            // Иллюзия (СД)
            if (player.illusion) {
                ['mino', 'baph2', 'baph3'].forEach(col => {
                    if (player.illusion[col] === STATUS.OK) totals.doomsday.ok++;
                });
                totals.doomsday.total += 3;
            }
            
            // Гильдия
            if (player.guild) {
                ['kvm_tue', 'kvm_thu', 'kvm_sun', 'gvg'].forEach(col => {
                    if (player.guild[col] === STATUS.OK) {
                        if (col === 'kvm_tue') totals.kvm_tue.ok++;
                        else if (col === 'kvm_thu') totals.kvm_thu.ok++;
                        else if (col === 'kvm_sun') totals.kvm_sun.ok++;
                        else if (col === 'gvg') totals.gvg.ok++;
                    }
                    // Считаем общее количество
                    if (col === 'kvm_tue') totals.kvm_tue.total++;
                    else if (col === 'kvm_thu') totals.kvm_thu.total++;
                    else if (col === 'kvm_sun') totals.kvm_sun.total++;
                    else if (col === 'gvg') totals.gvg.total++;
                });
            }
            
            // Башня
            if (player.tower) {
                const result = player.tower.result !== undefined ? player.tower.result : -1;
                totals.tower.total++;
                if (result >= 1 && result <= 16) totals.tower.ok++;
            }
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

    const statusNames = ['❌', '✅'];
    
    let lines = [];
    lines.push('=== ИЛЛЮЗИЯ ИСПЫТАНИЯ ===');
    lines.push('Ник\tМинотавр 1\tБафомет 2\tБафомет 3');
    
    weekData.groups.forEach(group => {
        lines.push(`--- ${group.name} ---`);
        group.players.forEach(player => {
            const mino = player.illusion?.mino !== undefined ? statusNames[player.illusion.mino] || '❌' : '❌';
            const baph2 = player.illusion?.baph2 !== undefined ? statusNames[player.illusion.baph2] || '❌' : '❌';
            const baph3 = player.illusion?.baph3 !== undefined ? statusNames[player.illusion.baph3] || '❌' : '❌';
            lines.push(`${player.nick}\t${mino}\t${baph2}\t${baph3}`);
        });
    });
    
    lines.push('');
    lines.push('=== АКТИВНОСТИ ГИЛЬДИИ ===');
    lines.push('Ник\tКВМ Вт\tКВМ Чт\tГВГ Сб 600+\tКВМ Вс');
    
    weekData.groups.forEach(group => {
        lines.push(`--- ${group.name} ---`);
        group.players.forEach(player => {
            const kvm_tue = player.guild?.kvm_tue !== undefined ? statusNames[player.guild.kvm_tue] || '❌' : '❌';
            const kvm_thu = player.guild?.kvm_thu !== undefined ? statusNames[player.guild.kvm_thu] || '❌' : '❌';
            const gvg = player.guild?.gvg !== undefined ? statusNames[player.guild.gvg] || '❌' : '❌';
            const kvm_sun = player.guild?.kvm_sun !== undefined ? statusNames[player.guild.kvm_sun] || '❌' : '❌';
            lines.push(`${player.nick}\t${kvm_tue}\t${kvm_thu}\t${gvg}\t${kvm_sun}`);
        });
    });
    
    lines.push('');
    lines.push('=== БЕСКОНЕЧНАЯ БАШНЯ ===');
    lines.push('Ник\tПрофа\tРезультат');
    
    weekData.groups.forEach(group => {
        lines.push(`--- ${group.name} ---`);
        group.players.forEach(player => {
            const prof = player.tower?.prof || '';
            const result = player.tower?.result !== undefined ? player.tower.result : -1;
            let resultDisplay;
            if (result === -1) resultDisplay = '❌';
            else if (result === 0) resultDisplay = '⏳';
            else if (result === 16) resultDisplay = '✨16';
            else resultDisplay = result.toString();
            lines.push(`${player.nick}\t${prof}\t${resultDisplay}`);
        });
    });
    
    lines.push('');
    const totals = collectStats();
    lines.push(`ИТОГО:\tБашня:${totals.tower}\tСД:${totals.doomsday}\tКВМ Вт:${totals.kvm_tue_ok}\tКВМ Чт:${totals.kvm_thu_ok}\tКВМ Вс:${totals.kvm_sun_ok}\tГВГ:${totals.gvg}`);
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
            // Иллюзия
            if (player.illusion) {
                player.illusion.mino = STATUS.NO;
                player.illusion.baph2 = STATUS.NO;
                player.illusion.baph3 = STATUS.NO;
            }
            // Гильдия
            if (player.guild) {
                player.guild.kvm_tue = STATUS.NO;
                player.guild.kvm_thu = STATUS.NO;
                player.guild.gvg = STATUS.NO;
                player.guild.kvm_sun = STATUS.NO;
            }
            // Башня
            if (player.tower) {
                player.tower.prof = '';
                player.tower.result = -1;
            }
        });
    });
    
    // Обнуляем КВМ очки
    document.getElementById('kvmTuePoints').value = 0;
    document.getElementById('kvmThuPoints').value = 0;
    document.getElementById('kvmSunPoints').value = 0;
    
    renderTable(currentTab);
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
            if (!existingStats.weeks) {
                existingStats.weeks = [];
            }
            
            const existingIndex = existingStats.weeks.findIndex(w => 
                w.year === stats.year && w.week === stats.week
            );
            
            if (existingIndex !== -1) {
                existingStats.weeks[existingIndex] = stats;
            } else {
                existingStats.weeks.push(stats);
            }
            
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
    
    // Обработчики вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Подключаем кнопки
    document.getElementById('saveJsonBtn').addEventListener('click', saveJSON);
    document.getElementById('saveTxtBtn').addEventListener('click', saveTXT);
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('saveStatsBtn').addEventListener('click', saveStats);
});

// Экспортируем функции для использования в HTML
window.toggleStatus = toggleStatus;
window.toggleTowerResult = toggleTowerResult;
window.updateTowerProf = updateTowerProf;
window.addPlayer = addPlayer;
window.updateKvmTotal = updateKvmTotal;
window.saveJSON = saveJSON;
window.saveTXT = saveTXT;
window.resetAll = resetAll;
window.saveStats = saveStats;
window.switchTab = switchTab;