let monsters = { small: [], medium: [], large: [] };

// Загрузка базы монстров
async function loadMonsters() {
    try {
        // Добавляем случайный параметр чтобы избежать кэширования
        const timestamp = Date.now();
        const response = await fetch(`mobs.json?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        monsters = data;
        
        const total = (monsters.small?.length || 0) + (monsters.medium?.length || 0) + (monsters.large?.length || 0);
        console.log(`✅ Загружено монстров: ${total} (малых: ${monsters.small?.length || 0}, средних: ${monsters.medium?.length || 0}, больших: ${monsters.large?.length || 0})`);
        
        if (total === 0) {
            console.warn('⚠️ База монстров пуста!');
            document.getElementById('results').innerHTML = '<div style="text-align:center;color:orange;">⚠️ База монстров пуста. Добавь монстров в mobs.json</div>';
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка загрузки монстров:', error);
        document.getElementById('results').innerHTML = `<div style="text-align:center;color:red;">❌ Ошибка загрузки базы монстров. Проверь файл mobs.json</div>`;
        return false;
    }
}

// Расчёт штрафа за разницу уровней
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

// Основная функция расчёта
async function calculate() {
    const playerLevel = parseInt(document.getElementById('playerLevel').value);
    const serverBonus = document.getElementById('serverBonusX2').checked ? 2.0 : 1.0;
    const advancedMode = document.getElementById('advancedMode').checked;
    
    // Проверка, что монстры загружены
    const totalMonsters = (monsters.small?.length || 0) + (monsters.medium?.length || 0) + (monsters.large?.length || 0);
    if (totalMonsters === 0) {
        document.getElementById('results').innerHTML = '<div style="text-align:center;color:orange;">⏳ Загрузка базы монстров...</div>';
        await loadMonsters();
        if ((monsters.small?.length || 0) + (monsters.medium?.length || 0) + (monsters.large?.length || 0) === 0) {
            return;
        }
    }
    
    let allMonsters = [
        ...(monsters.small || []).map(m => ({...m, size: 'small'})),
        ...(monsters.medium || []).map(m => ({...m, size: 'medium'})),
        ...(monsters.large || []).map(m => ({...m, size: 'large'}))
    ];
    
    let results = allMonsters.map(monster => {
        let penalty = getPenalty(monster.level, playerLevel);
        let baseExp = Math.floor(monster.baseExp * penalty * serverBonus);
        let jobExp = Math.floor(monster.jobExp * penalty * serverBonus);
        
        let partyBonus = 1;
        let finalBase = baseExp;
        let finalJob = jobExp;
        
        if (advancedMode) {
            const partySize = parseInt(document.getElementById('partySize').value);
            const classVariety = parseInt(document.getElementById('classVariety').value);
            partyBonus = getPartyBonus(partySize, classVariety);
            finalBase = Math.floor(baseExp * partyBonus);
            finalJob = Math.floor(jobExp * partyBonus);
            
            if (document.getElementById('odinBless').checked) {
                finalBase *= 5;
                finalJob *= 5;
            }
        }
        
        return {
            name: monster.name,
            level: monster.level,
            baseExp: finalBase,
            jobExp: finalJob,
            penalty: penalty,
            partyBonus: partyBonus,
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
                ${topBase.map((m, i) => `
                    <div class="monster-item">
                        <div>
                            <span class="badge">#${i+1}</span>
                            <span class="monster-name">${m.name}</span>
                            <span class="monster-penalty">(lvl ${m.level}, ${Math.round(m.penalty*100)}% опыта)</span>
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
                            <span class="monster-penalty">(lvl ${m.level}, ${Math.round(m.penalty*100)}% опыта)</span>
                        </div>
                        <div class="monster-exp">${m.jobExp.toLocaleString()} XP</div>
                    </div>
                `).join('')}
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
        
        let html = `
            <h2>🎯 РАСШИРЕННЫЙ РАСЧЁТ</h2>
            <div class="result-card">
                <h3>🏆 ТОП-1 МОНСТР</h3>
                <div class="monster-item">
                    <div><span class="monster-name">${top1.name}</span> <span class="monster-penalty">(уровень ${top1.level})</span></div>
                    <div class="monster-exp">${expPerKill.toLocaleString()} XP</div>
                </div>
                <div class="monster-item"><div>Размер:</div><div>${top1.size === 'small' ? 'Маленький 🟢' : top1.size === 'medium' ? 'Средний 🟡' : 'Большой 🔴'}</div></div>
                <div class="monster-item"><div>Штраф за уровень:</div><div>${Math.round(top1.penalty*100)}%</div></div>
                <div class="monster-item"><div>Бонус пати:</div><div>+${Math.round((top1.partyBonus-1)*100)}%</div></div>
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

// UI обработчики
document.getElementById('advancedMode').addEventListener('change', (e) => {
    document.getElementById('advancedPanel').classList.toggle('show', e.target.checked);
});

document.getElementById('odinBless').addEventListener('change', (e) => {
    document.getElementById('odinPointsGroup').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('calculateBtn').addEventListener('click', calculate);

// Загрузка данных и запуск
loadMonsters().then(() => {
    calculate();
});