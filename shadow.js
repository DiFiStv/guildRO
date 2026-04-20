(function() {
    let items = [];
    let userData = {};

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

    function getItemRanks(itemId) {
        const data = userData[itemId] || { rank1: 0, rank2: 0, rank3: 0, rank4: 0 };
        return {
            rank1: data.rank1,
            rank2: data.rank2,
            rank3: data.rank3,
            rank4: data.rank4
        };
    }

    // Главная формула: сколько нужно докупить 1⭐
    function calculateNeeded1star(m1, m2, m3, mode) {
        // Переводим всё в эквивалент 1⭐
        let total = m1 + m2 * 3 + m3 * 9;
        
        // Сколько нужно до ближайшего числа, кратного 27
        let need = (27 - (total % 27)) % 27;
        
        if (mode === 'min') {
            // Минимальная очистка: покупаем только если нужно ≤ 8
            if (need > 8) {
                return -1; // Нецелесообразно
            }
        }
        
        return need;
    }

    // Синтез после покупки
    function synthesize(m1, m2, m3, m4, bought1star) {
        let total = m1 + bought1star + m2 * 3 + m3 * 9;
        
        // Сколько целых 4⭐ получится
        let new4star = m4 + Math.floor(total / 27);
        
        return new4star;
    }

    // Полный расчёт для одного предмета
    function calculateFull(ranks, mode) {
        const m1 = ranks.rank1;
        const m2 = ranks.rank2;
        const m3 = ranks.rank3;
        const m4 = ranks.rank4;
        
        // Сначала синтезируем то, что есть (без докупки)
        // Приводим остатки к <3 простым делением
        let total = m1 + m2 * 3 + m3 * 9;
        let free4star = m4 + Math.floor(total / 27);
        let remainder = total % 27;
        
        // Теперь считаем, сколько нужно докупить
        let need = calculateNeeded1star(remainder % 3, Math.floor(remainder / 3) % 3, Math.floor(remainder / 9), mode);
        
        let final4star = free4star;
        let needText = '';
        let alertClass = '';
        
        if (need === -1) {
            needText = '-';
            alertClass = 'alert-row';
            // Нецелесообразно, ничего не покупаем
            final4star = free4star;
        } else if (need === 0) {
            needText = '0';
        } else {
            needText = need + ' шт.';
            final4star = free4star + Math.floor((remainder + need) / 27);
        }
        
        return {
            final4star: final4star,
            needText: needText,
            alertClass: alertClass,
            need: need
        };
    }

    function calculateAll(mode) {
        const results = [];
        for (const item of items) {
            const ranks = getItemRanks(item.id);
            const result = calculateFull(ranks, mode);
            results.push({
                id: item.id,
                name: item.name,
                original: ranks,
                result: result
            });
        }
        return results;
    }

    function displayCraft(mode) {
        const results = calculateAll(mode);
        
        const title = mode === 'min' 
            ? '🔨 МИНИМАЛЬНАЯ ОЧИСТКА (быстрая конвертация)'
            : '🔨 МАКСИМАЛЬНАЯ ОЧИСТКА (полная конвертация в 4⭐)';
        
        const description = mode === 'min'
            ? '🎯 Цель: получить максимум 4⭐ с минимальными вложениями (покупаем только если нужно ≤8 шт. 1⭐)<br>🔴 "-" означает, что покупка нецелесообразна'
            : '🎯 Цель: ПОЛНОСТЬЮ избавиться от 1⭐, 2⭐, 3⭐ (покупаем всегда, сколько нужно)';
        
        let html = `
            <h2>${title}</h2>
            <div class="result-card">
                <h3>📊 Результаты</h3>
                <div class="odin-info" style="margin-bottom: 15px;">
                    💡 Правило: 3 части нижнего ранга = 1 часть верхнего<br>
                    ${description}
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
                <tr class="${res.alertClass}">
                    <td class="craft-img"><img src="${imgPath}" alt="${item.name}" class="item-icon" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%221%22%3E%3Crect x=%222%22 y=%222%22 width=%2220%22 height=%2220%22 rx=%222.18%22%3E%3C/rect%3E%3C/svg%3E'"></td>
                    <td class="craft-name">${item.name}${res.need === -1 ? ' ⚠️' : ''}</td>
                    <td class="craft-orig">${orig.rank1} / ${orig.rank2} / ${orig.rank3} / ${orig.rank4}</td>
                    <td class="craft-need">${res.needText}</td>
                    <td class="craft-gain">${res.final4star}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        const totalNeeded = results.reduce((sum, item) => {
            const need = item.result.need;
            return sum + (need > 0 ? need : 0);
        }, 0);
        const totalRank4 = results.reduce((sum, item) => sum + item.result.final4star, 0);
        
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

    // Сохраняем текущий режим
    let currentMode = 'min';
    
    window.loadDataMin = async function() {
        currentMode = 'min';
        await loadItems();
        
        const rawText = document.getElementById('dataInput').value;
        if (!rawText.trim()) {
            alert('Вставьте данные из Excel!');
            return false;
        }
        
        const parsed = parseTableData(rawText);
        const loadedCount = Object.keys(parsed).length;
        
        Object.assign(userData, parsed);
        
        alert(`✅ Загружено данных для ${loadedCount} предметов`);
        displayCraft(currentMode);
        return true;
    };
    
    window.loadDataFull = async function() {
        currentMode = 'full';
        await loadItems();
        
        const rawText = document.getElementById('dataInput').value;
        if (!rawText.trim()) {
            alert('Вставьте данные из Excel!');
            return false;
        }
        
        const parsed = parseTableData(rawText);
        const loadedCount = Object.keys(parsed).length;
        
        Object.assign(userData, parsed);
        
        alert(`✅ Загружено данных для ${loadedCount} предметов`);
        displayCraft(currentMode);
        return true;
    };
})();
