// --- UI & CONTROLS ---

// --- SPAWN / BUY TRAIN ---

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
    const startName = getStation(startId).name;
    const endName = getStation(endId).name;

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
        invalidateGraphCaches(); // nieuwe trein → vloot-graaf opnieuw opbouwen
        updateUI();
        notify(`${ROUTES_DEF[routeIdx].id} Metro ingezet!`);
        closeSpawnModal();
    } else {
        notify("Transactie mislukt!");
        closeSpawnModal();
    }
}

// --- CONTROLS ---

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

    // Re-init initial trains
    state.trains.push(new Train(3)); state.trainCounts[3]++;
    state.trains.push(new Train(0)); state.trainCounts[0]++;

    mapDirty = true;
    updateUI();
    notify("Spel opnieuw gestart!");
}

// --- RENDER SIDEBAR / STATS ---

// Goedkope, veilige-voor-hot-path update: alleen cijfers + knop-affordability.
// Herbouwt GEEN DOM (behoud van scrollpositie/hover in de Uitbreiding-lijst).
function updateStats() {
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

    // Houd de BOUW-knoppen live zonder de lijst te herbouwen.
    document.querySelectorAll('#expansion-list button[data-zone]').forEach(btn => {
        const zone = ZONES[btn.dataset.zone];
        if (zone) btn.disabled = state.money < zone.cost;
    });
}

// Zware herbouw van de Uitbreiding-lijst; alleen aanroepen als de zone-status wijzigt
// (init, zone-unlock, aankoop, reset) — niet in de hot path.
function renderExpansionList() {
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
                <button onclick="unlockZone('${key}')" data-zone="${key}" class="btn-ret px-3 py-1 text-[10px] font-bold text-[#003D86] hover:bg-blue-50" ${state.money < zone.cost ? 'disabled' : ''}>
                    BOUW
                </button>
            ` : '<span class="text-green-600 text-sm">✔</span>'}
        `;
        list.appendChild(div);
    });
}

// Volledige refresh (stats + lijst).
function updateUI() {
    updateStats();
    renderExpansionList();
}

window.switchTab = (tab) => {
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
};

// --- UPGRADE LISTENERS ---
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
        state.baseTicketPrice += 3.00;
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
