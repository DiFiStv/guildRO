// Изолируем весь код в отдельную область видимости
(function() {
    let items = [];
    let userData = {};

    // Загрузка базы предметов
    async function loadItemsFull() {
        try {
            const timestamp = Date.now();
            const response = await fetch(`shadow.json?t=${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            items = data.items;
            console.log(`✅ [Максимальная] Загружено предметов: ${items.length}`);
            
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

    // Полный расчёт с циклом
    function calculateFull(ranks) {
        let m1 = ranks.rank1;
        let m2 = ranks.rank2;
        let m3 = ranks.rank3;
        let m4 = ranks.rank4;
        
        let steps = [];
        let totalNeeded1star = 0;
        let iteration = 1;
        
        steps.push(`📊 Исходные данные: 1⭐=${m1}, 2⭐=${m2}, 3⭐=${m3}, 4⭐=${m4}`);
        
        while (m1 > 0 || m2 > 0 || m3 > 0) {
            steps.push(`\n🔁 Итерация ${iteration++}:`);
            steps.push(`   Текущие остатки: 1⭐=${m1}, 2⭐=${m2}, 3⭐=${m3}, 4⭐=${m4}`);
            
            let need1 = (3 - (m1 % 3)) % 3;
            if (need1 > 0) {
                totalNeeded1star += need1;
                steps.push(`   🔸 Доводим 1⭐ до кратного 3: было ${m1}, докупаем ${need1} шт. → стало ${m1 + need1}`);
                m1 += need1;
            }
            
            let convert12 = Math.floor(m1 / 3);
            if (convert12 > 0) {
                steps.push(`   🔹 ${convert12 * 3} шт. 1⭐ → +${convert12} шт. 2⭐`);
                m2 += convert12;
                m1 = 0;
            }
            
            let need2 = (3 - (m2 % 3)) % 3;
            if (need2 > 0) {
                let need1For2 = need2 * 3;
                totalNeeded1star += need1For2;
                steps.push(`   🔸 Доводим 2⭐ до кратного 3: нужно ${need2} шт. 2⭐ = ${need1For2} шт. 1⭐`);
                m2 += need2;
            }
            
            let convert23 = Math.floor(m2 / 3);
            if (convert23 > 0) {
                steps.push(`   🔹 ${convert23 * 3} шт. 2⭐ → +${convert23} шт. 3⭐`);
                m3 += convert23;
                m2 = 0;
            }
            
            let need3 = (3 - (m3 % 3)) % 3;
            if (need3 > 0) {
                let need1For3 = need3 * 9;
                totalNeeded1star += need1For3;
                steps.push(`   🔸 Доводим 3⭐ до кратного 3: нужно ${need3} шт. 3⭐ = ${need1For3} шт. 1⭐`);
                m3 += need3;
            }
            
            let convert34 = Math.floor(m3 / 3);
            if (convert34 > 0) {
                steps.push(`   🔹 ${convert34 * 3} шт. 3⭐ → +${convert34} шт. 4⭐`);
                m4 += convert34;
                m3 = 0;
            }
            
            steps.push(`   📊 После итерации: 1⭐=${m1}, 2⭐=${m2}, 3⭐=${m3}, 4⭐=${m4}`);
        }
        
        steps.push(`\n✅ Итог: нужно докупить ${totalNeeded1star} шт. 1⭐, получено 4⭐: ${m4}`);
        
        return {
            finalRank4: m4,
            needed1star: totalNeeded1star,
            steps: steps
        };
    }

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

    function displayCraft() {
        const results = calculateAll();
        
        let html = `
            <h2>🔨 МАКСИМАЛЬНАЯ ОЧИСТКА (полная конвертация в 4⭐)</h2>
            <div class="result-card">
                <h3>📊 Результаты</h3>
                <div class="odin-info" style="margin-bottom: 15px;">
                    💡 Правило: 3 части нижнего ранга = 1 часть верхнего<br>
                    🎯 Цель: ПОЛНОСТЬЮ избавиться от 1⭐, 2⭐, 3⭐<br>
                    ⚠️ Для полной очистки инвентаря необходимо значительно большее число частей 1-го ранга
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
                const displaySteps = res.steps.length > 15 ? res.steps.slice(0, 15) : res.steps;
                html += `
                    <tr class="detail-row">
                        <td colspan="5" class="detail-cell">
                            <details>
                                <summary>📋 Детали расчёта (${res.steps.length} шагов)</summary>
                                <div class="detail-steps">
                                    ${displaySteps.map(s => `<div>${s}</div>`).join('')}
                                    ${res.steps.length > 15 ? `<div>... и ещё ${res.steps.length - 15} шагов</div>` : ''}
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

    // Глобальная функция для вызова из HTML
    window.loadDataFull = async function() {
        await loadItemsFull();
        
        const rawText = document.getElementById('dataInput').value;
        if (!rawText.trim()) {
            alert('Вставьте данные из Excel!');
            return false;
        }
        
        const parsed = parseTableData(rawText);
        const loadedCount = Object.keys(parsed).length;
        
        Object.assign(userData, parsed);
        
        alert(`✅ [Максимальная] Загружено данных для ${loadedCount} предметов`);
        displayCraft();
        return true;
    };
})();