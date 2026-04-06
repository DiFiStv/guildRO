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

// Штраф за разницу уровней (исправлено)
function getPenalty(monsterLevel, playerLevel) {
    const diff = monsterLevel - playerLevel;
    if (diff >= 0 && diff <= 3) return 1.0;      // 100%
    if (diff >= 4 && diff <= 6) return 0.8;      // 80%
    if (diff >= 7 && diff <= 8) return 0.6;      // 60%
    if (diff === 9) return 0.4;                   // 40%
    if (diff === 10) return 0.2;                  // 20%
    if (diff >= 11) return 0.1;                   // 10%
    return 1.0; // монстр ниже игрока
}

// Бонус пати (исправлено)
function getPartySizeBonus(partySize) {
    if (partySize === 1) return 1.0;
    if (partySize === 2) return 1.10;
    if (partySize === 3) return 1.20;
    if (partySize === 4) return 1.30;
    return 1.40; // 5 игроков
}

// Бонус за разные классы (исправлено)
function getClassBonus(classVariety) {
    if (classVariety === 1) return 1.0;
    if (classVariety === 2) return 1.05;
    if (classVariety === 3) return 1.10;
    if (classVariety === 4) return 1.15;
    return 1.20; // 5 классов
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
    
    let partySizeBonus = 1;
    let classBonus = 1;
    let odinMult = 1;
    
    if (advancedMode) {
        const partySize = parseInt(document.getElementById('partySize').value);
        const classVariety = parseInt(document.getElementById('classVariety').value);
        partySizeBonus = getPartySizeBonus(partySize);
        classBonus = getClassBonus(classVariety);
        if (document.getElementById('odinBless').checked) {
            odinMult = 5;
        }
    }
    
    let results = allMonsters.map(monster => {
        let penalty = getPenalty(monster.level, playerLevel);
        
        // Базовая формула с учётом всех множителей
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
            size: monster.size
        };
    });
    
    // Сортировка и топ-5
    let topBase = [...results].sort((a,b) => b.baseExp - a.baseExp).slice(0, 5);
    let topJob = [...results].sort((a,b) => b.jobExp - a.jobExp).slice(0, 5);
    
    const resultsDiv = document.getElementById('results');
    
    if (!advancedMode) {
        let html = `
            <h2>🎯 РЕЗУЛЬТАТЫ ДЛЯ УРОВНЯ ${playerLevel}</h2>
            <div class="result-card">
                <h3>⚔️ ТОП-5 ПО БАЗОВОМУ ОПЫТУ</h3>
                ${topBase.map((m, i) => {
                    let penaltyText = '';
                    if (m.penalty < 1) penaltyText = ` (${Math.round(m.penalty*100)}% штраф)`;
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
                    let penaltyText = '';
                    if (m.penalty < 1) penaltyText = ` (${Math.round(m.penalty*100)}% штраф)`;
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
        const expType = document.getElementById('expType').value;
        const killTime = parseFloat(document.getElementById('killTime').value);
        const odinPoints = parseInt(document.getElementById('odinPoints').value);
        const odinBless = document.getElementById('odinBless').checked;
        
        let sorted = [...results].sort((a,b) => 
            expType === 'base' ? b.baseExp - a.baseExp : b.jobExp - a.jobExp
        );
        
        let top1 = sorted[0];
        let expPerKill = expType === 'base' ? top1.baseExp : top1.jobExp;
        let expPerMin = expPerKill * (60 / killTime);
        let expPerHour = expPerKill * (3600 / killTime);
        let odinMinutes = 0;
        
        if (odinBless && odinPoints > 0) {
            let odinCost = getOdinCost(top1.name);
            let killsLeft = Math.floor(odinPoints / odinCost);
            odinMinutes = Math.floor(killsLeft * killTime / 60);
        }
        
        let penaltyText = top1.penalty < 1 ? ` (${Math.round(top1.penalty*100)}% штраф)` : ' (100%)';
        
        let html = `
            <h2>🎯 РАСШИРЕННЫЙ РАСЧЁТ</h2>
            <div class="result-card">
                <h3>🏆 ТОП-1 МОНСТР</h3>
                <div class="monster-item">
                    <div><span class="monster-name">${top1.name}</span> <span class="monster-penalty">(уровень ${top1.level}${penaltyText})</span></div>
                    <div class="monster-exp">${expPerKill.toLocaleString()} XP</div>
                </div>
                <div class="monster-item"><div>Размер:</div><div>${top1.size === 'small' ? 'Маленький 🟢' : top1.size === 'medium' ? 'Средний 🟡' : 'Большой 🔴'}</div></div>
                <div class="monster-item"><div>Бонус пати:</div><div>+${Math.round((top1.partySizeBonus-1)*100)}%</div></div>
                <div class="monster-item"><div>Бонус классов:</div><div>+${Math.round((top1.classBonus-1)*100)}%</div></div>
            </div>
            <div class="result-card">
                <h3>⏱️ СТАТИСТИКА ФАРМА</h3>
                <div class="monster-item"><div>Опыта в минуту:</div><div>${Math.floor(expPerMin).toLocaleString()} XP</div></div>
                <div class="monster-item"><div>Опыта в час:</div><div>${Math.floor(expPerHour).toLocaleString()} XP</div></div>
        `;
        
        if (odinBless && odinPoints > 0) {
            html += `
                <div class="monster-item"><div>💰 Стоимость Одина за моба:</div><div>${getOdinCost(top1.name)} очк.</div></div>
                <div class="monster-item"><div>⏳ Одина хватит на:</div><div>${odinMinutes} мин</div></div>
            `;
        }
        html += `</div>`;
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