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

    // Функция для "ломки" частей следующего ранга
    function breakHigherRanks(ranks, targetRank) {
        let m1 = ranks.rank1;
        let m2 = ranks.rank2;
        let m3 = ranks.rank3;
        let m4 = ranks.rank4;
        
        // Если целевой ранг - 3⭐, ломаем 4⭐ в 3⭐
        if (targetRank === 3) {
            // 1 предмет 4⭐ = 2 предмета 3⭐
            m3 += m4 * 2;
            m4 = 0;
        }
        // Если целевой ранг - 2⭐, ломаем 4⭐ и 3⭐ в 2⭐
        else if (targetRank === 2) {
            // 1 предмет 4⭐ = 6 предметов 2⭐ (2*3)
            m2 += m4 * 6;
            m4 = 0;
            // 1 предмет 3⭐ = 2 предмета 2⭐
            m2 += m3 * 2;
            m3 = 0;
        }
        // Если целевой ранг - 4⭐, не ломаем ничего
        // (4⭐ уже максимальный)
        
        return { rank1: m1, rank2: m2, rank3: m3, rank4: m4 };
    }

    // Универсальная формула для любого целевого ранга
    function calculateNeeded(ranks, targetRank, mode) {
        const m1 = ranks.rank1;
        const m2 = ranks.rank2;
        const m3 = ranks.rank3;
        const m4 = ranks.rank4;
        
        // Переводим всё в эквивалент 1⭐
        let total = m1 + m2 * 3 + m3 * 9 + m4 * 27;
        
        // Определяем делитель для целевого ранга
        let divisor;
        switch(targetRank) {
            case 2: divisor = 3; break;
            case 3: divisor = 9; break;
            case 4: 
            default: divisor = 27; break;
        }
        
        // Сколько нужно до ближайшего числа, кратного divisor
        let need = (divisor - (total % divisor)) % divisor;
        
        if (mode === 'min') {
            // Минимальная очистка: покупаем только если нужно ≤ 8
            if (need > 8) {
                return -1; // Нецелесообразно
            }
        }
        
        return need;
    }

    // Полный расчёт для одного предмета
    function calculateFull(ranks, mode, targetRank, breakHigher) {
        let m1 = ranks.rank1;
        let m2 = ranks.rank2;
        let m3 = ranks.rank3;
        let m4 = ranks.rank4;
        
        // Если включена "ломка" - разбираем части следующего ранга
        if (breakHigher) {
            const broken = breakHigherRanks({ rank1: m1, rank2: m2, rank3: m3, rank4: m4 }, targetRank);
            m1 = broken.rank1;
            m2 = broken.rank2;
            m3 = broken.rank3;
            m4 = broken.rank4;
        }
        
        // Определяем делитель для целевого ранга
        let divisor;
        switch(targetRank) {
            case 2: divisor = 3; break;
            case 3: divisor = 9; break;
            case 4: 
            default: divisor = 27; break;
        }
        
        // Считаем общее количество в эквиваленте 1⭐
        let total;
        if (breakHigher || targetRank === 4) {
            // Если ломаем или целевой 4⭐ - используем все ранги
            total = m1 + m2 * 3 + m3 * 9 + m4 * 27;
        } else {
            // Если НЕ ломаем - используем только ранги ≤ targetRank
            if (targetRank === 3) {
                total = m1 + m2 * 3 + m3 * 9;  // 4⭐ не трогаем
            } else if (targetRank === 2) {
                total = m1 + m2 * 3;  // 3⭐ и 4⭐ не трогаем
            } else {
                total = m1 + m2 * 3 + m3 * 9 + m4 * 27; // на всякий случай
            }
        }
        
        let freeTarget = Math.floor(total / divisor);
        let remainder = total % divisor;
        
        // Теперь считаем, сколько нужно докупить
        let need = calculateNeeded({ rank1: m1, rank2: m2, rank3: m3, rank4: m4 }, targetRank, mode);
        
        let finalTarget = freeTarget;
        let needText = '';
        let alertClass = '';
        
        if (need === -1) {
            needText = '-';
            alertClass = 'alert-row';
            // Нецелесообразно, ничего не покупаем
            finalTarget = freeTarget;
        } else if (need === 0) {
            needText = '0';
        } else {
            needText = need + ' шт.';
            finalTarget = freeTarget + Math.floor((remainder + need) / divisor);
        }
        
        // Сохраняем информацию о том, были ли сломаны части
        const wasBroken = breakHigher && (targetRank === 2 || targetRank === 3);
        
        return {
            finalTarget: finalTarget,
            needText: needText,
            alertClass: alertClass,
            need: need,
            wasBroken: wasBroken,
            brokenRanks: wasBroken ? { rank1: m1, rank2: m2, rank3: m3, rank4: m4 } : null
        };
    }

    function calculateAll(mode, targetRank, breakHigher) {
        const results = [];
        for (const item of items) {
            const ranks = getItemRanks(item.id);
            const result = calculateFull(ranks, mode, targetRank, breakHigher);
            results.push({
                id: item.id,
                name: item.name,
                original: ranks,
                result: result
            });
        }
        return results;
    }

    function displayCraft(mode, targetRank, breakHigher) {
        const results = calculateAll(mode, targetRank, breakHigher);
        
        const rankNames = {2: '2⭐', 3: '3⭐', 4: '4⭐'};
        const rankEmoji = {2: '⭐', 3: '⭐⭐', 4: '⭐⭐⭐'};
        
        const title = mode === 'min' 
            ? `🔨 МИНИМАЛЬНАЯ ОЧИСТКА → ${rankNames[targetRank]} (быстрая конвертация)`
            : `⚡ МАКСИМАЛЬНАЯ ОЧИСТКА → ${rankNames[targetRank]} (полная конвертация)`;
        
        const breakText = breakHigher ? ' 💥 (слом частей следующего ранга)' : '';
        
        const description = mode === 'min'
            ? `🎯 Цель: получить максимум ${rankNames[targetRank]} с минимальными вложениями (покупаем только если нужно ≤8 шт. 1⭐)<br>🔴 "-" означает, что покупка нецелесообразна${breakText}`
            : `🎯 Цель: ПОЛНОСТЬЮ избавиться от 1⭐, 2⭐, 3⭐ и получить ${rankNames[targetRank]} (покупаем всегда, сколько нужно)${breakText}`;
        
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
                            ${breakHigher && (targetRank === 2 || targetRank === 3) ? '<th>После ломки (1⭐/2⭐/3⭐/4⭐)</th>' : ''}
                            <th>Нужно докупить 1⭐</th>
                            <th>Итого ${rankNames[targetRank]}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        results.forEach((item) => {
            const imgNumber = String(item.id).padStart(2, '0');
            const imgPath = `img/${imgNumber}.png`;
            const orig = item.original;
            const res = item.result;
            
            let brokenRow = '';
            if (res.wasBroken && res.brokenRanks) {
                const br = res.brokenRanks;
                brokenRow = `<td class="craft-orig">${br.rank1} / ${br.rank2} / ${br.rank3} / ${br.rank4}</td>`;
            }
            
            html += `
                <tr class="${res.alertClass}">
                    <td class="craft-img"><img src="${imgPath}" alt="${item.name}" class="item-icon" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%221%22%3E%3Crect x=%222%22 y=%222%22 width=%2220%22 height=%2220%22 rx=%222.18%22%3E%3C/rect%3E%3C/svg%3E'"></td>
                    <td class="craft-name">${item.name}${res.need === -1 ? ' ⚠️' : ''}</td>
                    <td class="craft-orig">${orig.rank1} / ${orig.rank2} / ${orig.rank3} / ${orig.rank4}</td>
                    ${brokenRow}
                    <td class="craft-need">${res.needText}</td>
                    <td class="craft-gain">${res.finalTarget}</td>
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
        const totalTarget = results.reduce((sum, item) => sum + item.result.finalTarget, 0);
        
        html += `
            <div class="result-card">
                <h3>📊 ИТОГО</h3>
                <div class="monster-item">
                    <div>💰 Всего нужно докупить 1⭐:</div>
                    <div class="craft-need">${totalNeeded} шт.</div>
                </div>
                <div class="monster-item">
                    <div>🎯 Всего получено ${rankNames[targetRank]}:</div>
                    <div class="craft-total">${totalTarget} шт.</div>
                </div>
            </div>
        `;
        
        document.getElementById('craftResults').innerHTML = html;
    }

    // Сохраняем текущий режим
    let currentMode = 'min';
    let currentTargetRank = 4;
    let currentBreakHigher = false;
    
    window.loadDataMin = async function(targetRank = 4, breakHigher = false) {
        currentMode = 'min';
        currentTargetRank = targetRank;
        currentBreakHigher = breakHigher;
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
        displayCraft(currentMode, currentTargetRank, currentBreakHigher);
        return true;
    };
    
    window.loadDataFull = async function(targetRank = 4, breakHigher = false) {
        currentMode = 'full';
        currentTargetRank = targetRank;
        currentBreakHigher = breakHigher;
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
        displayCraft(currentMode, currentTargetRank, currentBreakHigher);
        return true;
    };
})();