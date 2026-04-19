let items = [];
let userData = {};

// Загрузка базы предметов
async function loadItems() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`shadow.json?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        items = data.items;
        console.log(`✅ Загружено предметов: ${items.length}`);
        
        items.forEach(item => {
            userData[item.id] = { rank1: 0, rank2: 0, rank3: 0, rank4: 0 };
        });
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        items = [];
        return false;
    }
}

// Парсинг вставленных данных
function parseTableData(rawText) {
    const lines = rawText.split(/\r?\n/);
    const parsed = {};
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        const parts = line.split(/\s+/);
        if (parts.length < 5) continue;
        
        let name = parts[0];
        let idx = 1;
        
        while (idx < parts.length && isNaN(parseInt(parts[idx]))) {
            name += ' ' + parts[idx];
            idx++;
        }
        
        if (idx + 3 >= parts.length) continue;
        
        const rank1 = parseInt(parts[idx]) || 0;
        const rank2 = parseInt(parts[idx + 1]) || 0;
        const rank3 = parseInt(parts[idx + 2]) || 0;
        const rank4 = parseInt(parts[idx + 3]) || 0;
        
        const item = items.find(i => i.name === name);
        if (item) {
            parsed[item.id] = { rank1, rank2, rank3, rank4 };
        }
    }
    
    return parsed;
}

// Загрузка данных
function loadData() {
    const rawText = document.getElementById('dataInput').value;
    if (!rawText.trim()) {
        alert('Вставьте данные из Excel!');
        return false;
    }
    
    const parsed = parseTableData(rawText);
    const loadedCount = Object.keys(parsed).length;
    
    Object.assign(userData, parsed);
    
    alert(`✅ Загружено данных для ${loadedCount} предметов`);
    displayCraft();
    return true;
}

// Получение данных предмета
function getItemRanks(itemId) {
    const data = userData[itemId] || { rank1: 0, rank2: 0, rank3: 0, rank4: 0 };
    return {
        rank1: data.rank1,
        rank2: data.rank2,
        rank3: data.rank3,
        rank4: data.rank4
    };
}

// Шаг 1: Конвертация без докупки
function convertWithoutBuying(ranks) {
    let m1 = ranks.rank1;
    let m2 = ranks.rank2;
    let m3 = ranks.rank3;
    let m4 = ranks.rank4;
    
    let steps = [];
    
    // Конвертируем 3⭐ → 4⭐
    let convert34 = Math.floor(m3 / 3);
    if (convert34 > 0) {
        steps.push(`🔹 ${convert34 * 3} шт. 3⭐ → +${convert34} шт. 4⭐`);
        m4 += convert34;
        m3 = m3 % 3;
    }
    
    // Конвертируем 2⭐ → 3⭐
    let convert23 = Math.floor(m2 / 3);
    if (convert23 > 0) {
        steps.push(`🔹 ${convert23 * 3} шт. 2⭐ → +${convert23} шт. 3⭐`);
        m3 += convert23;
        m2 = m2 % 3;
    }
    
    // Конвертируем 1⭐ → 2⭐
    let convert12 = Math.floor(m1 / 3);
    if (convert12 > 0) {
        steps.push(`🔹 ${convert12 * 3} шт. 1⭐ → +${convert12} шт. 2⭐`);
        m2 += convert12;
        m1 = m1 % 3;
    }
    
    return {
        rank1: m1,
        rank2: m2,
        rank3: m3,
        rank4: m4,
        steps: steps
    };
}

// Шаг 2: Твой алгоритм для остатков
function calculateNeeded(ranks) {
    let m1 = ranks.rank1;
    let m2 = ranks.rank2;
    let m3 = ranks.rank3;
    let m4 = ranks.rank4;
    
    let steps = [];
    let k = 0;
    
    // Определяем, сколько нужно до кратного 3
    let n3 = (3 - (m3 % 3)) % 3;
    let n2 = (3 - (m2 % 3)) % 3;
    let n1 = (3 - (m1 % 3)) % 3;
    
    steps.push(`📊 Остатки после конвертации: 1⭐=${m1}, 2⭐=${m2}, 3⭐=${m3}, 4⭐=${m4}`);
    steps.push(`📊 Нужно добавить: 1⭐=${n1}, 2⭐=${n2}, 3⭐=${n3} до кратного 3`);
    
    // Получаем количество 1⭐, необходимых для "закрытия"
    if (n2 > 0) {
        k = Math.abs(n2 * 3 - m1);
        steps.push(`🔸 k = |${n2} × 3 - ${m1}| = ${k}`);
    } else {
        k = Math.abs(0 - m1);
        steps.push(`🔸 n2 = 0, k = |0 - ${m1}| = ${k}`);
    }
    
    // Добавляем k к m1
    m1 = m1 + k;
    steps.push(`🔸 1⭐ стало: ${ranks.rank1} + ${k} = ${m1}`);
    
    // Конвертируем m1 → m2
    let convert12 = Math.floor(m1 / 3);
    m2 = m2 + convert12;
    steps.push(`🔹 ${convert12 * 3} шт. 1⭐ → +${convert12} шт. 2⭐`);
    m1 = 0;
    
    // Конвертируем m2 → m3
    let convert23 = Math.floor(m2 / 3);
    m3 = m3 + convert23;
    steps.push(`🔹 ${convert23 * 3} шт. 2⭐ → +${convert23} шт. 3⭐`);
    m2 = 0;
    
    // Конвертируем m3 → m4
    let convert34 = Math.floor(m3 / 3);
    m4 = m4 + convert34;
    steps.push(`🔹 ${convert34 * 3} шт. 3⭐ → +${convert34} шт. 4⭐`);
    m3 = 0;
    
    return {
        finalRank4: m4,
        needed1star: k,
        steps: steps
    };
}

// Полный расчёт
function calculateFull(ranks) {
    // Шаг 1: Конвертируем без докупки
    const afterConvert = convertWithoutBuying(ranks);
    
    // Шаг 2: Применяем алгоритм к остаткам
    const result = calculateNeeded(afterConvert);
    
    // Объединяем шаги
    const allSteps = [...afterConvert.steps, ...result.steps];
    
    return {
        finalRank4: result.finalRank4,
        needed1star: result.needed1star,
        steps: allSteps
    };
}

// Расчёт для всех предметов
function calculateAll() {
    const results = [];
    
    for (const item of items) {
        const ranks = getItemRanks(item.id);
        
        const result = calculateFull(ranks);
        
        results.push({
            id: item.id,
            name: item.name,
            original: ranks,
            result: result
        });
    }
    
    return results;
}

// Отображение результатов
function displayCraft() {
    const results = calculateAll();
    
    let html = `
        <h2>🔨 Конвертация в 4⭐</h2>
        <div class="result-card">
            <h3>📊 Результаты</h3>
            <div class="odin-info" style="margin-bottom: 15px;">
                💡 Правило: 3 части нижнего ранга = 1 часть верхнего<br>
                🎯 Цель: избавиться от 1⭐, 2⭐, 3⭐, получить максимум 4⭐
            </div>
            <table class="craft-table">
                <thead>
                    <tr>
                        <th>Изображение</th>
                        <th>Предмет</th>
                        <th>Было (1⭐/2⭐/3⭐/4⭐)</th>
                        <th>Нужно докупить 1⭐</th>
                        <th>Итого 4⭐</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    results.forEach((item) => {
        const imgNumber = String(item.id).padStart(2, '0');
        const imgPath = `img/${imgNumber}.png`;
        const orig = item.original;
        const res = item.result;
        
        html += `
            <tr>
                <td class="craft-img"><img src="${imgPath}" alt="${item.name}" class="item-icon" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%221%22%3E%3Crect x=%222%22 y=%222%22 width=%2220%22 height=%2220%22 rx=%222.18%22%3E%3C/rect%3E%3C/svg%3E'"></td>
                <td class="craft-name">${item.name}</td>
                <td class="craft-orig">${orig.rank1} / ${orig.rank2} / ${orig.rank3} / ${orig.rank4}</td>
                <td class="craft-need">${res.needed1star > 0 ? res.needed1star + ' шт.' : '—'}</td>
                <td class="craft-gain">${res.finalRank4}</td>
            </tr>
        `;
        
        if (res.steps.length > 0 && (res.needed1star > 0 || res.finalRank4 > 0)) {
            html += `
                <tr class="detail-row">
                    <td colspan="5" class="detail-cell">
                        <details>
                            <summary>📋 Детали расчёта</summary>
                            <div class="detail-steps">
                                ${res.steps.map(s => `<div>${s}</div>`).join('')}
                            </div>
                        </details>
                    </td>
                </tr>
            `;
        }
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    const totalNeeded = results.reduce((sum, item) => sum + item.result.needed1star, 0);
    const totalRank4 = results.reduce((sum, item) => sum + item.result.finalRank4, 0);
    
    html += `
        <div class="result-card">
            <h3>📊 ИТОГО</h3>
            <div class="monster-item">
                <div>💰 Всего нужно докупить 1⭐:</div>
                <div class="craft-need">${totalNeeded} шт.</div>
            </div>
            <div class="monster-item">
                <div>🎯 Всего получено 4⭐:</div>
                <div class="craft-total">${totalRank4} шт.</div>
            </div>
        </div>
    `;
    
    document.getElementById('craftResults').innerHTML = html;
}

// Обработчики
document.getElementById('loadBtn').addEventListener('click', () => {
    loadData();
});

// Запуск
loadItems();