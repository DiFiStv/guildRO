let monsters = { small: [], medium: [], large: [] };
let currentMonsterData = null;
let currentResults = null;

// Загрузка базы монстров
async function loadMonsters() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`mobs.json?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        monsters = data;
        
        const total = (monsters.small?.length || 0) + (monsters.medium?.length || 0) + (monsters.large?.length || 0);
        console.log(`✅ Загружено монстров: ${total}`);
        
        // Заполняем список мобов
        updateMonsterList('medium');
        return true;
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        // Демо-данные на случай ошибки
        monsters = {
            small: [{name:"Poring",level:1,baseExp:32,jobExp:32}],
            medium: [{name:"Drops",level:7,baseExp:33,jobExp:55}],
            large: [{name:"Anubis",level:65,baseExp:554,jobExp:184}]
        };
        updateMonsterList('medium');
        return false;
    }
}

// Обновление списка мобов
function updateMonsterList(size) {
    const select = document.getElementById('monsterSelect');
    const monsterList = monsters[size] || [];
    select.innerHTML = '';
    
    if (monsterList.length === 0) {
        select.innerHTML = '<option value="">Нет мобов</option>';
        return;
    }
    
    // Сортируем по уровню
    const sorted = [...monsterList].sort((a, b) => a.level - b.level);
    
    sorted.forEach(monster => {
        const option = document.createElement('option');
        option.value = monster.name;
        option.textContent = `${monster.name} (${monster.level} lvl)`;
        select.appendChild(option);
    });
}

// Штраф за разницу уровней
function getPenalty(monsterLevel, playerLevel) {
    const diff = monsterLevel - playerLevel;
    const absDiff = Math.abs(diff);
    
    if (absDiff >= 0 && absDiff <= 3) return 1.0;
    if (absDiff >= 4 && absDiff <= 6) return 0.8;
    if (absDiff >= 7 && absDiff <= 8) return 0.6;
    if (absDiff === 9) return 0.4;
    if (absDiff === 10) return 0.2;
    if (absDiff >= 11) return 0.1;
    
    return 1.0;
}

// Бонус пати
function getPartyBonus(partySize, classVariety) {
    let sizeBonus = 0;
    if (partySize === 2) sizeBonus = 0.10;
    else if (partySize === 3) sizeBonus = 0.20;
    else if (partySize === 4) sizeBonus = 0.30;
    else if (partySize === 5) sizeBonus = 0.40;
    
    let classBonus = 0;
    if (classVariety === 2) classBonus = 0.05;
    else if (classVariety === 3) classBonus = 0.10;
    else if (classVariety === 4) classBonus = 0.15;
    else if (classVariety === 5) classBonus = 0.20;
    
    return 1 + sizeBonus + classBonus;
}

// Получение размера моба
function getMonsterSize(monsterName) {
    for (const [size, list] of Object.entries(monsters)) {
        if (list.some(m => m.name === monsterName)) {
            return size;
        }
    }
    return 'medium';
}

// Основная функция расчёта
async function calculateExp() {
    const playerLevel = parseInt(document.getElementById('playerLevel').value);
    const serverBonus = parseFloat(document.getElementById('serverBonus').value);
    const advancedMode = document.getElementById('advancedMode').checked;
    
    if (!advancedMode) {
        // === ПРОСТОЙ РЕЖИМ: ТОП-5 ===
        let allMonsters = [
            ...(monsters.small || []).map(m => ({...m, size: 'small'})),
            ...(monsters.medium || []).map(m => ({...m, size: 'medium'})),
            ...(monsters.large || []).map(m => ({...m, size: 'large'}))
        ];
        
        if (allMonsters.length === 0) {
            document.getElementById('results').innerHTML = '<div style="text-align:center;color:red;">❌ Нет данных о монстрах. Проверь mobs.json</div>';
            return;
        }
        
        let results = allMonsters.map(monster => {
            let penalty = getPenalty(monster.level, playerLevel);
            let baseExp = Math.floor(monster.baseExp * penalty * serverBonus);
            let jobExp = Math.floor(monster.jobExp * penalty * serverBonus);
            
            return {
                name: monster.name,
                level: monster.level,
                baseExp: baseExp,
                jobExp: jobExp,
                penalty: penalty,
                size: monster.size
            };
        });
        
        let topBase = [...results].sort((a,b) => b.baseExp - a.baseExp).slice(0, 5);
        let topJob = [...results].sort((a,b) => b.jobExp - a.jobExp).slice(0, 5);
        
        const resultsDiv = document.getElementById('results');
        let html = `
            <h2>🎯 РЕЗУЛЬТАТЫ ДЛЯ УРОВНЯ ${playerLevel}</h2>
            <div class="result-card">
                <h3>⚔️ ТОП-5 ПО БАЗОВОМУ ОПЫТУ</h3>
                ${topBase.map((m, i) => `
                    <div class="monster-item">
                        <div>
                            <span class="badge">#${i+1}</span>
                            <span class="monster-name">${m.name}</span>
                            <span class="monster-penalty"> (lvl ${m.level}, ${Math.round(m.penalty*100)}%)</span>
                        </div>
                        <div class="monster-exp">${m.baseExp.toLocaleString()} XP</div>
                    </div>
                `).join('')}
            </div>
            <div class="result-card">
                <h3>💼 ТОП-5 ПО ДЖОБ ОПЫТУ</h3>
                ${topJob.map((m, i) => `
                    <div class="monster-item">
                        <div>
                            <span class="badge">#${i+1}</span>
                            <span class="monster-name">${m.name}</span>
                            <span class="monster-penalty"> (lvl ${m.level}, ${Math.round(m.penalty*100)}%)</span>
                        </div>
                        <div class="monster-exp">${m.jobExp.toLocaleString()} XP</div>
                    </div>
                `).join('')}
            </div>
        `;
        resultsDiv.innerHTML = html;
        currentResults = null;
        return;
    }
    
    // === РАСШИРЕННЫЙ РЕЖИМ ===
    const monsterName = document.getElementById('monsterSelect').value;
    if (!monsterName) {
        alert('Выберите моба!');
        return;
    }
    
    const partySize = parseInt(document.getElementById('partySize').value);
    const classVariety = parseInt(document.getElementById('classVariety').value);
    const killTime = parseFloat(document.getElementById('killTime').value);
    
    // Находим выбранного моба
    let selectedMonster = null;
    let monsterSize = '';
    for (const [size, list] of Object.entries(monsters)) {
        const found = list.find(m => m.name === monsterName);
        if (found) {
            selectedMonster = found;
            monsterSize = size;
            break;
        }
    }
    
    if (!selectedMonster) {
        alert('Моб не найден!');
        return;
    }
    
    // Расчёт опыта
    const penalty = getPenalty(selectedMonster.level, playerLevel);
    const partyBonus = getPartyBonus(partySize, classVariety);
    const sizeNames = { small: 'Маленький 🟢', medium: 'Средний 🟡', large: 'Большой 🔴' };
    
    // Опыт за моба (до пати)
    const basePerMonster = Math.floor(selectedMonster.baseExp * penalty * serverBonus);
    const jobPerMonster = Math.floor(selectedMonster.jobExp * penalty * serverBonus);
    
    // Опыт с учётом пати (делим на количество человек)
    const basePerPerson = Math.floor(basePerMonster * partyBonus / partySize);
    const jobPerPerson = Math.floor(jobPerMonster * partyBonus / partySize);
    
    // Время убийства с учётом пати
    const killTimeParty = killTime / partySize;
    
    // Опыт в минуту и час
    const basePerMin = Math.floor(basePerPerson * (60 / killTimeParty));
    const jobPerMin = Math.floor(jobPerPerson * (60 / killTimeParty));
    const basePerHour = basePerMin * 60;
    const jobPerHour = jobPerMin * 60;
    
    // Сохраняем результаты для полей "опыт/часы"
    currentResults = {
        basePerHour: basePerHour,
        jobPerHour: jobPerHour,
        basePerMonster: basePerMonster,
        jobPerMonster: jobPerMonster,
        basePerPerson: basePerPerson,
        jobPerPerson: jobPerPerson
    };
    
    // Формируем HTML результата
    const resultsDiv = document.getElementById('results');
    let html = `
        <h2>📊 РЕЗУЛЬТАТЫ</h2>
        
        <div class="result-card">
            <h3>📋 Общая информация</h3>
            <div class="monster-item">
                <div><span class="monster-name">${selectedMonster.name}</span> (${selectedMonster.level} lvl)</div>
                <div class="monster-exp">Base: ${basePerMonster.toLocaleString()} &nbsp;|&nbsp; Job: ${jobPerMonster.toLocaleString()}</div>
            </div>
            <div class="monster-item">
                <div>Опыт в пати (на человека):</div>
                <div class="monster-exp">Base: ${basePerPerson.toLocaleString()} &nbsp;|&nbsp; Job: ${jobPerPerson.toLocaleString()}</div>
            </div>
            <div class="monster-item">
                <div>Размер:</div>
                <div>${sizeNames[monsterSize] || monsterSize}</div>
            </div>
            <div class="monster-item">
                <div>Коэффициент опыта:</div>
                <div>${Math.round(penalty * 100)}%</div>
            </div>
            <div class="monster-item">
                <div>Бонус пати:</div>
                <div>+${Math.round((partyBonus - 1) * 100)}%</div>
            </div>
        </div>
        
        <div class="result-card">
            <h3>⏱️ Статистика фарма</h3>
            <div class="monster-item">
                <div>Опыта в минуту:</div>
                <div class="monster-exp">Base: ${basePerMin.toLocaleString()} &nbsp;|&nbsp; Job: ${jobPerMin.toLocaleString()}</div>
            </div>
            <div class="monster-item">
                <div>Опыта в час:</div>
                <div class="monster-exp">Base: ${basePerHour.toLocaleString()} &nbsp;|&nbsp; Job: ${jobPerHour.toLocaleString()}</div>
            </div>
        </div>
    `;
    
    // Добавляем блок расчёта цели
    html += `
        <div class="result-card">
            <h3>🎯 Расчёт цели</h3>
            <div class="input-group">
                <label>Сколько необходимо набрать опыта:</label>
                <input type="number" id="targetExp" min="0" step="1000" value="1000000" placeholder="Введите количество опыта">
            </div>
            <div class="input-group">
                <label>Сколько часов качаться:</label>
                <input type="number" id="targetHours" min="0" step="0.1" value="1" placeholder="Введите количество часов">
            </div>
            <div id="timeToTarget" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                <div class="monster-item">
                    <div>Нужно набрать опыта:</div>
                    <div class="monster-exp" id="displayTargetExp">1,000,000 XP</div>
                </div>
                <div class="monster-item">
                    <div>Потребуется времени:</div>
                    <div class="monster-exp" id="displayTargetTime">1 час 0 минут</div>
                </div>
                <div class="monster-item">
                    <div>Или убийств:</div>
                    <div class="monster-exp" id="displayTargetKills">4,425</div>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Настраиваем взаимосвязь полей
    setupTargetFields();
}

// Настройка взаимосвязи полей "опыт" и "часы"
function setupTargetFields() {
    const targetExp = document.getElementById('targetExp');
    const targetHours = document.getElementById('targetHours');
    const displayTargetExp = document.getElementById('displayTargetExp');
    const displayTargetTime = document.getElementById('displayTargetTime');
    const displayTargetKills = document.getElementById('displayTargetKills');
    
    if (!targetExp || !targetHours) return;
    
    // Функция обновления отображения
    function updateDisplay(exp, hours) {
        const basePerHour = currentResults?.basePerHour || 1;
        const basePerMonster = currentResults?.basePerPerson || 1;
        
        if (exp !== undefined && exp !== null && exp > 0) {
            const calculatedHours = exp / basePerHour;
            const hoursInt = Math.floor(calculatedHours);
            const minutesInt = Math.round((calculatedHours - hoursInt) * 60);
            const kills = Math.ceil(exp / basePerMonster);
            
            displayTargetExp.textContent = `${Math.floor(exp).toLocaleString()} XP`;
            displayTargetTime.textContent = `${hoursInt} час ${minutesInt} минут`;
            displayTargetKills.textContent = `${kills.toLocaleString()}`;
            
            // Обновляем поле часов (без зацикливания)
            if (!targetHours.matches(':focus')) {
                targetHours.value = calculatedHours.toFixed(1);
            }
        }
    }
    
    // При вводе опыта
    targetExp.addEventListener('input', function() {
        const exp = parseFloat(this.value);
        if (exp && exp > 0) {
            updateDisplay(exp);
        }
    });
    
    // При вводе часов
    targetHours.addEventListener('input', function() {
        const hours = parseFloat(this.value);
        if (hours && hours > 0 && currentResults) {
            const exp = hours * currentResults.basePerHour;
            displayTargetExp.textContent = `${Math.floor(exp).toLocaleString()} XP`;
            
            const hoursInt = Math.floor(hours);
            const minutesInt = Math.round((hours - hoursInt) * 60);
            const kills = Math.ceil(exp / currentResults.basePerPerson);
            
            displayTargetTime.textContent = `${hoursInt} час ${minutesInt} минут`;
            displayTargetKills.textContent = `${kills.toLocaleString()}`;
            
            // Обновляем поле опыта (без зацикливания)
            if (!targetExp.matches(':focus')) {
                targetExp.value = Math.floor(exp);
            }
        }
    });
    
    // Инициализация
    setTimeout(() => {
        const initialExp = parseFloat(targetExp.value) || 1000000;
        updateDisplay(initialExp);
    }, 100);
}

// Обновление отображения ползунка
function updateServerBonusValue() {
    const val = parseFloat(document.getElementById('serverBonus').value);
    document.getElementById('serverBonusValue').innerText = val.toFixed(2) + 'x';
}

// Обработчик изменения размера моба
document.getElementById('monsterSize').addEventListener('change', function() {
    updateMonsterList(this.value);
});

// Обработчик изменения количества человек в пати
document.getElementById('partySize').addEventListener('change', function() {
    const partySize = parseInt(this.value);
    const classSelect = document.getElementById('classVariety');
    const currentClass = parseInt(classSelect.value);
    
    // Ограничиваем количество классов
    while (classSelect.options.length > 0) {
        classSelect.remove(0);
    }
    
    for (let i = 1; i <= partySize; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        classSelect.appendChild(option);
    }
    
    // Устанавливаем значение, если оно было больше нового максимума
    if (currentClass > partySize) {
        classSelect.value = partySize;
    } else {
        classSelect.value = currentClass;
    }
});

// Переключение расширенного режима
document.getElementById('advancedMode').addEventListener('change', function() {
    const panel = document.getElementById('advancedPanel');
    const btn = document.getElementById('calculateBtn');
    
    if (this.checked) {
        panel.classList.add('show');
        btn.style.background = '#4caf50';
        btn.textContent = '🔍 РАССЧИТАТЬ';
        // Обновляем список мобов
        const size = document.getElementById('monsterSize').value;
        updateMonsterList(size);
        // Обновляем ограничение классов
        document.getElementById('partySize').dispatchEvent(new Event('change'));
    } else {
        panel.classList.remove('show');
        btn.style.background = '#ffd700';
        btn.textContent = '🔍 НАЙТИ ЛУЧШИЕ ВАРИАНТЫ';
        // Очищаем результаты
        document.getElementById('results').innerHTML = '<div style="text-align: center; color: #888;">Введите уровень и нажмите кнопку</div>';
        currentResults = null;
    }
});

// Обработчики событий
document.getElementById('serverBonus').addEventListener('input', updateServerBonusValue);
document.getElementById('calculateBtn').addEventListener('click', calculateExp);

// Загрузка данных и запуск
loadMonsters().then(() => {
    calculateExp();
});