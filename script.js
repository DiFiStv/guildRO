let monsters = { small: [], medium: [], large: [] };

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
        return true;
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        return false;
    }
}

// Штраф за разницу уровней
function getPenalty(monsterLevel, playerLevel) {
    const diff = monsterLevel - playerLevel;
    if (diff >= 0 && diff <= 3) return 1.0;
    if (diff >= 4 && diff <= 6) return 0.8;
    if (diff >= 7 && diff <= 8) return 0.6;
    if (diff === 9) return 0.4;
    if (diff === 10) return 0.2;
    if (diff >= 11) return 0.1;
    return 1.0;
}

// Бонус пати
function getPartySizeBonus(partySize) {
    if (partySize === 1) return 1.0;
    if (partySize === 2) return 1.10;
    if (partySize === 3) return 1.20;
    if (partySize === 4) return 1.30;
    return 1.40;
}

// Бонус за разные классы
function getClassBonus(classVariety) {
    if (classVariety === 1) return 1.0;
    if (classVariety === 2) return 1.05;
    if (classVariety === 3) return 1.10;
    if (classVariety === 4) return 1.15;
    return 1.20;
}

// Определение размера моба
function getMonsterSize(monsterName) {
    if (monsters.small?.some(m => m.name === monsterName)) return 'small';
    if (monsters.medium?.some(m => m.name === monsterName)) return 'medium';
    if (monsters.large?.some(m => m.name === monsterName)) return 'large';
    return 'medium';
}

// Стоимость Одина
function getOdinCost(monsterName) {
    const size = getMonsterSize(monsterName);
    if (size === 'small') return 1;
    if (size === 'medium') return 2;
    return 3;
}

// Основная функция расчёта
async function calculate() {
    const playerLevel = parseInt(document.getElementById('playerLevel').value);
    const serverBonus = parseFloat(document.getElementById('serverBonus').value);
    const advancedMode = document.getElementById('advancedMode').checked;
    
    const totalMonsters = (monsters.small?.length || 0) + (monsters.medium?.length || 0) + (monsters.large?.length || 0);
    if (totalMonsters === 0) {
        await loadMonsters();
        if ((monsters.small?.length || 0) + (monsters.medium?.length || 0) + (monsters.large?.length || 0) === 0) {
            document.getElementById('results').innerHTML = '<div style="text-align:center;color:red;">❌ Нет данных о монстрах</div>';
            return;
        }
    }
    
    let allMonsters = [
        ...(monsters.small || []).map(m => ({...m, size: 'small'})),
        ...(monsters.medium || []).map(m => ({...m, size: 'medium'})),
        ...(monsters.large || []).map(m => ({...m, size: 'large'}))
    ];
    
    // Параметры для расширенного режима
    let partySizeBonus = 1;
    let classBonus = 1;
    let odinMult = 1;
    let killTime = 5;
    let odinPoints = 0;
    let expType = 'base';
    
    if (advancedMode) {
        const partySize = parseInt(document.getElementById('partySize').value);
        const classVariety = parseInt(document.getElementById('classVariety').value);
        partySizeBonus = getPartySizeBonus(partySize);
        classBonus = getClassBonus(classVariety);
        killTime = parseFloat(document.getElementById('killTime').value);
        odinPoints = parseInt(document.getElementById('odinPoints').value);
        expType = document.getElementById('expType').value;
        if (document.getElementById('odinBless').checked) {
            odinMult = 5;
        }
    }
    
    let results = allMonsters.map(monster => {
        let penalty = getPenalty(monster.level, playerLevel);
        
        let baseExp = Math.floor(monster.baseExp * penalty * serverBonus * partySizeBonus * classBonus * odinMult);
        let jobExp = Math.floor(monster.jobExp * penalty * serverBonus * partySizeBonus * classBonus * odinMult);
        
        return {
            name: monster.name,
            level: monster.level,
            baseExp: baseExp,
            jobExp: jobExp,
            penalty: penalty,
            partySizeBonus: partySizeBonus,
            classBonus: classBonus,
            size: monster.size,
            odinCost: getOdinCost(monster.name)
        };
    });
    
    // Сортировка
    let topBase = [...results].sort((a,b) => b.baseExp - a.baseExp).slice(0, 5);
    let topJob = [...results].sort((a,b) => b.jobExp - a.jobExp).slice(0, 5);
    
    const resultsDiv = document.getElementById('results');
    
    if (!advancedMode) {
        // ОБЫЧНЫЙ РЕЖИМ - ТОП 5
        let html = `
            <h2>🎯 РЕЗУЛЬТАТЫ ДЛЯ УРОВНЯ ${playerLevel}</h2>
            <div class="result-card">
                <h3>⚔️ ТОП-5 ПО БАЗОВОМУ ОПЫТУ</h3>
                ${topBase.map((m, i) => {
                    let penaltyText = m.penalty < 1 ? ` (${Math.round(m.penalty*100)}%)` : '';
                    return `
                    <div class="monster-item">
                        <div>
                            <span class="badge">#${i+1}</span>
                            <span class="monster-name">${m.name}</span>
                            <span class="monster-penalty">(lvl ${m.level}${penaltyText})</span>
                        </div>
                        <div class="monster-exp">${m.baseExp.toLocaleString()} XP</div>
                    </div>
                `}).join('')}
            </div>
            <div class="result-card">
                <h3>💼 ТОП-5 ПО ДЖОБ ОПЫТУ</h3>
                ${topJob.map((m, i) => {
                    let penaltyText = m.penalty < 1 ? ` (${Math.round(m.penalty*100)}%)` : '';
                    return `
                    <div class="monster-item">
                        <div>
                            <span class="badge">#${i+1}</span>
                            <span class="monster-name">${m.name}</span>
                            <span class="monster-penalty">(lvl ${m.level}${penaltyText})</span>
                        </div>
                        <div class="monster-exp">${m.jobExp.toLocaleString()} XP</div>
                    </div>
                `}).join('')}
            </div>
        `;
        resultsDiv.innerHTML = html;
    } else {
        // РАСШИРЕННЫЙ РЕЖИМ - ТОП 1 С ДЕТАЛИЗАЦИЕЙ
        let sorted = [...results].sort((a,b) => 
            expType === 'base' ? b.baseExp - a.baseExp : b.jobExp - a.jobExp
        );
        
        let top1 = sorted[0];
        let expPerKill = expType === 'base' ? top1.baseExp : top1.jobExp;
        let expPerMin = expPerKill * (60 / killTime);
        let expPerHour = expPerKill * (3600 / killTime);
        
        let odinMinutes = 0;
        const odinBless = document.getElementById('odinBless').checked;
        if (odinBless && odinPoints > 0) {
            let killsLeft = Math.floor(odinPoints / top1.odinCost);
            odinMinutes = Math.floor(killsLeft * killTime / 60);
        }
        
        let penaltyText = top1.penalty < 1 ? `${Math.round(top1.penalty*100)}% штраф` : '100%';
        
        let html = `
            <h2>🎯 РАСШИРЕННЫЙ РАСЧЁТ</h2>
            <div class="result-card">
                <h3>🏆 ТОП-1 МОНСТР</h3>
                <div class="monster-item">
                    <div><span class="monster-name">${top1.name}</span> <span class="monster-penalty">(уровень ${top1.level})</span></div>
                    <div class="monster-exp">${expPerKill.toLocaleString()} XP</div>
                </div>
                <div class="monster-item">
                    <div>Размер:</div>
                    <div>${top1.size === 'small' ? 'Маленький 🟢 (1 Один)' : top1.size === 'medium' ? 'Средний 🟡 (2 Одина)' : 'Большой 🔴 (3 Одина)'}</div>
                </div>
                <div class="monster-item">
                    <div>Штраф за уровень:</div>
                    <div>${penaltyText}</div>
                </div>
                <div class="monster-item">
                    <div>Бонус пати (${document.getElementById('partySize').value} чел):</div>
                    <div>+${Math.round((top1.partySizeBonus-1)*100)}%</div>
                </div>
                <div class="monster-item">
                    <div>Бонус классов (${document.getElementById('classVariety').value} классов):</div>
                    <div>+${Math.round((top1.classBonus-1)*100)}%</div>
                </div>
            </div>
            <div class="result-card">
                <h3>⏱️ СТАТИСТИКА ФАРМА</h3>
                <div class="monster-item">
                    <div>Время убийства:</div>
                    <div>${killTime} сек</div>
                </div>
                <div class="monster-item">
                    <div>Опыта в минуту:</div>
                    <div><strong>${Math.floor(expPerMin).toLocaleString()} XP</strong></div>
                </div>
                <div class="monster-item">
                    <div>Опыта в час:</div>
                    <div><strong>${Math.floor(expPerHour).toLocaleString()} XP</strong></div>
                </div>
        `;
        
        if (odinBless) {
            html += `
                <div class="monster-item">
                    <div>✨ Благословение Одина:</div>
                    <div>×5 опыт (активно)</div>
                </div>
            `;
            if (odinPoints > 0) {
                html += `
                    <div class="monster-item">
                        <div>💰 Стоимость Одина за моба:</div>
                        <div>${top1.odinCost} очк.</div>
                    </div>
                    <div class="monster-item">
                        <div>💎 Очков Одина в запасе:</div>
                        <div>${odinPoints}</div>
                    </div>
                    <div class="monster-item">
                        <div>⏳ Одина хватит на:</div>
                        <div><strong>${odinMinutes} минут</strong> (${Math.floor(odinMinutes/60)} ч ${odinMinutes%60} мин)</div>
                    </div>
                `;
            } else if (odinPoints === 0) {
                html += `
                    <div class="monster-item">
                        <div>⚠️ Очков Одина:</div>
                        <div style="color:orange;">0 — добавь в настройках</div>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        
        // Добавим топ-3 для справки
        html += `
            <div class="result-card">
                <h3>📋 ТОП-3 ДЛЯ СПРАВКИ (${expType === 'base' ? 'Base' : 'Job'} опыт)</h3>
                ${sorted.slice(0, 3).map((m, i) => `
                    <div class="monster-item">
                        <div>
                            <span class="badge">#${i+1}</span>
                            <span class="monster-name">${m.name}</span>
                            <span class="monster-penalty">(lvl ${m.level})</span>
                        </div>
                        <div class="monster-exp">${(expType === 'base' ? m.baseExp : m.jobExp).toLocaleString()} XP</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        resultsDiv.innerHTML = html;
    }
}

// Обновление отображения ползунка
function updateServerBonusValue() {
    const val = parseFloat(document.getElementById('serverBonus').value);
    document.getElementById('serverBonusValue').innerText = val.toFixed(2) + 'x';
}

// UI обработчики
document.getElementById('advancedMode').addEventListener('change', (e) => {
    document.getElementById('advancedPanel').classList.toggle('show', e.target.checked);
});

document.getElementById('odinBless').addEventListener('change', (e) => {
    document.getElementById('odinPointsGroup').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('serverBonus').addEventListener('input', updateServerBonusValue);
document.getElementById('calculateBtn').addEventListener('click', calculate);

// Загрузка данных и запуск
loadMonsters().then(() => {
    calculate();
});