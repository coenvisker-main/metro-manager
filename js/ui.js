// --- UI FUNCTIONS ---

function notify(msg) {
    const area = document.getElementById('notification-area');
    const el = document.createElement('div');
    el.className = 'bg-white border-l-4 border-[#003D86] text-gray-800 text-xs p-3 shadow-lg rounded-r animate-[fadeIn_0.3s_ease-out] flex items-center';
    el.innerHTML = `<span class="font-bold mr-2 text-[#003D86]">INFO</span> ${msg}`;
    area.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function showFloatingPopup(text, x, y, type = 'success') {
    const container = document.getElementById('canvas-container');
    const el = document.createElement('div');
    el.className = `floating-popup popup-${type}`;
    el.innerText = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

function updateUI() {
    document.getElementById('money-display').innerText = Math.floor(state.money);
    document.getElementById('passengers-display').innerText = state.passengersTransported;
    document.getElementById('reputation-display').innerText = Math.floor(state.reputation);
    document.getElementById('fleet-size').innerText = state.trains.length;
    document.getElementById('ticket-price').innerText = state.baseTicketPrice.toFixed(2);
    document.getElementById('cost-speed').innerText = state.costs.speed;
    document.getElementById('cost-capacity').innerText = state.costs.capacity;
    document.getElementById('cost-comfort').innerText = state.costs.comfort;
    document.getElementById('cost-marketing').innerText = state.costs.marketing;

    const btns = ['btn-speed', 'btn-capacity', 'btn-comfort', 'btn-marketing'];
    btns.forEach(id => {
        const type = id.split('-')[1];
        document.getElementById(id).disabled = state.money < state.costs[type];
    });

    for (let i = 0; i < 5; i++) {
        const btn = document.getElementById(`btn-train-${i}`);
        const cost = getTrainCost(i);

        const label = btn.querySelector('.cost-label');
        if (label) label.innerText = `€${cost}`;

        btn.title = `${ROUTES_DEF[i].name}\nKosten: €${cost}`;
        if (state.money < cost) {
            btn.classList.add('opacity-50');
        } else {
            btn.classList.remove('opacity-50');
        }
    }

    const list = document.getElementById('expansion-list');
    list.innerHTML = '';
    Object.keys(ZONES).forEach(key => {
        if (key === 'centrum') return;
        const zone = ZONES[key];
        const div = document.createElement('div');
        div.className = `flex justify-between items-center p-3 rounded-lg border ${zone.unlocked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`;
        div.innerHTML = `
            <div>
                <div class="font-bold text-xs ${zone.unlocked ? 'text-green-700' : 'text-gray-700'}">${zone.name}</div>
                <div class="text-[10px] text-gray-400">${zone.unlocked ? 'Operationeel' : 'Kosten: €' + zone.cost}</div>
            </div>
            ${!zone.unlocked ? `
                <button onclick="unlockZone('${key}')" class="btn-ret px-3 py-1 text-[10px] font-bold text-[#003D86] hover:bg-blue-50" ${state.money < zone.cost ? 'disabled' : ''}>
                    BOUW
                </button>
            ` : '<span class="text-green-600 text-sm">✔</span>'}
        `;
        list.appendChild(div);
    });

    // Check Reputation Warning
    const repWarning = document.getElementById('reputation-warning');
    if (state.reputation < GAME_CONFIG.REP_WARNING_THRESHOLD && !state.gameOver) {
        repWarning.classList.remove('hidden');
    } else {
        repWarning.classList.add('hidden');
    }
}

function switchTab(tab) {
    document.getElementById('panel-manage').style.display = tab === 'manage' ? 'flex' : 'none';
    document.getElementById('panel-expand').style.display = tab === 'expand' ? 'flex' : 'none';
    const tM = document.getElementById('tab-manage');
    const tE = document.getElementById('tab-expand');

    // Active/Inactive styles handled by class replacement
    if (tab === 'manage') {
        tM.classList.add('text-[#003D86]', 'border-[#003D86]');
        tM.classList.remove('text-gray-400', 'border-transparent');
        tE.classList.add('text-gray-400', 'border-transparent');
        tE.classList.remove('text-[#003D86]', 'border-[#003D86]');
    } else {
        tE.classList.add('text-[#003D86]', 'border-[#003D86]');
        tE.classList.remove('text-gray-400', 'border-transparent');
        tM.classList.add('text-gray-400', 'border-transparent');
        tM.classList.remove('text-[#003D86]', 'border-[#003D86]');
    }
}

function initiateBuyTrain(routeIdx) {
    const cost = getTrainCost(routeIdx);
    if (state.money < cost) {
        notify("Onvoldoende saldo voor deze lijn!");
        return;
    }

    const path = getUnlockedPath(routeIdx);
    if (path.length < 2) {
        notify("Lijn te kort om te rijden!");
        return;
    }

    const startId = path[0];
    const endId = path[path.length - 1];
    const startName = STATIONS.find(s => s.id === startId).name;
    const endName = STATIONS.find(s => s.id === endId).name;

    const modal = document.getElementById('spawn-modal');
    const choicesDiv = document.getElementById('spawn-choices');

    choicesDiv.innerHTML = `
        <button onclick="confirmBuyTrain(${routeIdx}, '${startId}')" class="btn-ret py-4 px-4 w-full rounded-lg text-left border-l-4 border-[#009E4D] hover:bg-gray-50 flex justify-between items-center group">
            <div>
                <span class="text-xs text-gray-400 block uppercase tracking-wider">Startpunt</span>
                <span class="font-bold text-gray-800">${startName}</span>
            </div>
            <span class="text-[#009E4D] opacity-0 group-hover:opacity-100 transition">Selecteer &rarr;</span>
        </button>
        <button onclick="confirmBuyTrain(${routeIdx}, '${endId}')" class="btn-ret py-4 px-4 w-full rounded-lg text-left border-l-4 border-[#E30613] hover:bg-gray-50 flex justify-between items-center group">
            <div>
                <span class="text-xs text-gray-400 block uppercase tracking-wider">Startpunt</span>
                <span class="font-bold text-gray-800">${endName}</span>
            </div>
            <span class="text-[#E30613] opacity-0 group-hover:opacity-100 transition">Selecteer &rarr;</span>
        </button>
        <div class="mt-4 text-center text-sm text-gray-500 font-medium border-t border-gray-100 pt-3">
            Kosten: <span class="text-[#003D86] font-bold">€${cost}</span>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeSpawnModal() {
    document.getElementById('spawn-modal').classList.add('hidden');
}

function confirmBuyTrain(routeIdx, spawnId) {
    const cost = getTrainCost(routeIdx);
    if (state.money >= cost) {
        state.money -= cost;
        state.trains.push(new Train(routeIdx, spawnId));
        state.trainCounts[routeIdx]++;
        updateUI();
        notify(`${ROUTES_DEF[routeIdx].id} Metro ingezet!`);
        closeSpawnModal();
    } else {
        notify("Transactie mislukt!");
        closeSpawnModal();
    }
}

function unlockZone(zoneKey) {
    const zone = ZONES[zoneKey];
    if (state.money >= zone.cost && !zone.unlocked) {
        state.money -= zone.cost;
        zone.unlocked = true;
        state.trains.forEach(t => t.updatePathCache());
        mapDirty = true;
        notify(`${zone.name} Geopend!`);
        updateUI();
    }
}

function togglePause() {
    state.paused = !state.paused;
    const overlay = document.getElementById('pause-overlay');
    const btn = document.getElementById('btn-pause');

    if (state.paused) {
        overlay.classList.remove('hidden');
        btn.innerHTML = '<span>▶</span> Hervat';
        btn.classList.add('bg-green-600', 'border-green-500');
    } else {
        overlay.classList.add('hidden');
        btn.innerHTML = '<span>⏸</span> Pauze';
        btn.classList.remove('bg-green-600', 'border-green-500');
    }
}

function confirmRestart() {
    document.getElementById('restart-modal').classList.remove('hidden');
}

function closeRestartModal() {
    document.getElementById('restart-modal').classList.add('hidden');
}

function resetGame() {
    ZONES = JSON.parse(JSON.stringify(ZONES_DEF));
    resetState();
    closeRestartModal();
    document.getElementById('game-over-modal').classList.add('hidden');

    // Re-init initial trains
    state.trains.push(new Train(3)); state.trainCounts[3]++;
    state.trains.push(new Train(0)); state.trainCounts[0]++;

    mapDirty = true;
    updateUI();
    notify("Spel opnieuw gestart!");
}

function showGameOverModal(reason, score) {
    document.getElementById('game-over-reason').innerText = reason;
    document.getElementById('final-score').innerText = score;

    // Calculate Time
    const duration = Date.now() - state.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('final-time').innerText = timeStr;

    document.getElementById('game-over-modal').classList.remove('hidden');
    document.getElementById('reputation-warning').classList.add('hidden'); // Clear warning
}

// --- EVENT LISTENERS ---
// Attached to window for inline onclick handlers to work
window.switchTab = switchTab;
window.initiateBuyTrain = initiateBuyTrain;
window.confirmBuyTrain = confirmBuyTrain;
window.closeSpawnModal = closeSpawnModal;
window.unlockZone = unlockZone;
window.togglePause = togglePause;
window.confirmRestart = confirmRestart;
window.closeRestartModal = closeRestartModal;
window.resetGame = resetGame;

function debugUnlockAll() {
    Object.keys(ZONES).forEach(key => {
        ZONES[key].unlocked = true;
    });
    state.trains.forEach(t => t.updatePathCache());
    mapDirty = true;
    updateUI();
    notify("DEBUG: Alle zones ontgrendeld!");
}

window.debugUnlockAll = debugUnlockAll;

function debugGhostTrain() {
    // 1. Reset
    resetGame();

    // 2. Unlock Binnenhof Path (but KEEP Nesselande locked)
    ['centrum', 'oost_1', 'binnenhof'].forEach(z => ZONES[z].unlocked = true);

    // 3. Give money
    state.money = 5000;

    // 4. Spawn Line B train (Yellow) starting at Alexander (near split)
    setTimeout(() => {
        const train = new Train(1, 'alexander'); // 1 = Line B
        state.trains.push(train);
        state.trainCounts[1]++;
        notify("DEBUG: Scenario Start - Binnenhof OPEN, Nesselande DICHT. Metro B onderweg.");
    }, 500);

    mapDirty = true;
    updateUI();
}

window.debugGhostTrain = debugGhostTrain;

function debugGreenLineStuck() {
    resetGame();
    ['centrum', 'oost_1', 'binnenhof'].forEach(z => ZONES[z].unlocked = true);
    state.money = 5000;

    setTimeout(() => {
        const train = new Train(0, 'binnenhof'); // 0 = Line A (Green)
        state.trains.push(train);
        state.trainCounts[0]++;
        notify("DEBUG: Scenario Start - Groene Lijn (A) start te Binnenhof.");
    }, 500);

    mapDirty = true;
    updateUI();
}
window.debugGreenLineStuck = debugGreenLineStuck;

function toggleDebugMenu() {
    const menu = document.getElementById('debug-menu');
    menu.classList.toggle('hidden');
}
window.toggleDebugMenu = toggleDebugMenu;

// Upgrade Buttons
document.getElementById('btn-speed').onclick = () => {
    if (state.money >= state.costs.speed) {
        state.money -= state.costs.speed;
        state.costs.speed = Math.floor(state.costs.speed * 1.5);
        state.globalSpeed *= 1.15;
        updateUI();
        notify("Systeem update: 15% sneller");
    }
};
document.getElementById('btn-capacity').onclick = () => {
    if (state.money >= state.costs.capacity) {
        state.money -= state.costs.capacity;
        state.costs.capacity = Math.floor(state.costs.capacity * 1.5);
        state.trainCapacity += 10;
        updateUI();
        notify("Vloot uitgebreid: +10 pax/trein");
    }
};
document.getElementById('btn-comfort').onclick = () => {
    if (state.money >= state.costs.comfort) {
        state.money -= state.costs.comfort;
        state.costs.comfort = Math.floor(state.costs.comfort * 1.5);
        state.baseTicketPrice += 2.00;
        state.passengerPatience += 5000;
        updateUI();
        notify("Upgrade: Prijs +€3.00 & Geduld +5s");
    }
};
document.getElementById('btn-marketing').onclick = () => {
    if (state.money >= state.costs.marketing) {
        state.money -= state.costs.marketing;
        state.costs.marketing = Math.floor(state.costs.marketing * 1.3);
        state.reputation = Math.min(100, state.reputation + 25);
        updateUI();
        notify("Campagne geslaagd!");
    }
};
