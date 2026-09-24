// --- HELPERS & PATHFINDING ---

// Snelle station-lookup: vervangt herhaalde lineaire `STATIONS.find(...)`-scans in hot loops.
const STATION_BY_ID = new Map(STATIONS.map(s => [s.id, s]));
function getStation(id) { return STATION_BY_ID.get(id); }

// --- GRAAF-CACHE ---
// De global- en fleet-graaf veranderen alleen bij een zone-unlock, aankoop van een trein of reset.
// We cachen ze en herbouwen alleen na zo'n mutatie (invalidateGraphCaches()).
let _globalGraphCache = null;
let _fleetGraphCache = null;
function invalidateGraphCaches() {
    _globalGraphCache = null;
    _fleetGraphCache = null;
}

// --- PATHFINDING (BFS) ---

// Generieke BFS: geeft de eerste hop op het kortste pad van start naar eind in `graph`.
function bfsNextHop(graph, startId, endId) {
    if (startId === endId) return null;

    let queue = [[startId]];
    let visited = new Set();
    visited.add(startId);

    while (queue.length > 0) {
        let path = queue.shift();
        let node = path[path.length - 1];

        if (node === endId) {
            return path.length > 1 ? path[1] : null;
        }

        const neighbors = graph[node];
        if (neighbors) {
            for (let neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }
    }
    return null;
}

// Graaf van álle spoorverbindingen tussen ontgrendelde stations (of er nu een trein rijdt of niet).
// Wordt gebruikt om te bepalen of een reis in principe mogelijk is (spawn-selectie).
function buildGlobalGraph() {
    if (_globalGraphCache) return _globalGraphCache;

    const graph = {};
    STATIONS.forEach(s => {
        if (ZONES[s.zone].unlocked) graph[s.id] = [];
    });

    ROUTES_DEF.forEach(route => {
        for (let i = 0; i < route.path.length - 1; i++) {
            const s1 = route.path[i];
            const s2 = route.path[i + 1];
            const z1 = getStation(s1).zone;
            const z2 = getStation(s2).zone;

            if (ZONES[z1].unlocked && ZONES[z2].unlocked) {
                if (graph[s1]) graph[s1].push(s2);
                if (graph[s2]) graph[s2].push(s1);
            }
        }
    });
    _globalGraphCache = graph;
    return graph;
}

// Graaf van alleen de verbindingen die op dit moment door minstens één trein bereden worden.
// Wordt gebruikt bij het instappen, zodat passagiers de route volgen die de vloot echt bedient.
function buildFleetGraph() {
    if (_fleetGraphCache) return _fleetGraphCache;

    const graph = {};
    state.trains.forEach(t => {
        const p = t.activePath;
        if (!p || p.length < 2) return;
        for (let i = 0; i < p.length - 1; i++) {
            const a = p[i];
            const b = p[i + 1];
            (graph[a] = graph[a] || []).push(b);
            (graph[b] = graph[b] || []).push(a);
        }
    });
    _fleetGraphCache = graph;
    return graph;
}

// Eerste hop over het volledige (ontgrendelde) spoornet — gebruikt voor spawn-connectiviteit.
function findNextStation(startId, endId) {
    return bfsNextHop(buildGlobalGraph(), startId, endId);
}

function areStationsConnected(startId, endId) {
    return findNextStation(startId, endId) !== null;
}

// Pixelposities per station worden gecached en alleen bij resize herbouwd
// (rebuildStationPosCache), zodat de teken-loops niet elke frame opnieuw rekenen.
let _stationPosCache = null;
function rebuildStationPosCache() {
    _stationPosCache = {};
    STATIONS.forEach(s => {
        _stationPosCache[s.id] = { baseX: s.x * canvas.width, baseY: s.y * canvas.height };
    });
}

function getStationPos(id, offset = 0) {
    let c = _stationPosCache && _stationPosCache[id];
    if (!c) {
        // Fallback als de cache nog niet gebouwd is (bv. vóór de eerste resize).
        const s = getStation(id);
        c = { baseX: s.x * canvas.width, baseY: s.y * canvas.height };
    }
    return {
        x: c.baseX + offset,
        y: c.baseY + offset,
        baseX: c.baseX,
        baseY: c.baseY
    };
}

function getTrainCost(routeIdx) {
    return Math.floor(state.costs.baseTrain * Math.pow(1.3, state.trainCounts[routeIdx]));
}

function getUnlockedPath(routeIdx) {
    const route = ROUTES_DEF[routeIdx];
    return route.path.filter(stId => ZONES[getStation(stId).zone].unlocked);
}

function addMoney(amount) {
    state.money += amount;
    // Alleen de goedkope stats verversen; de zware Uitbreiding-lijst niet elke aflevering herbouwen.
    updateStats();
}

// --- FLOATING TEXT EFFECTS ---
let floatTexts = [];
function showFloatText(text, pos) {
    floatTexts.push({ text: text, x: pos.x, y: pos.y, life: 40 });
}

function notify(msg) {
    const area = document.getElementById('notification-area');
    const el = document.createElement('div');
    el.className = 'bg-white border-l-4 border-[#003D86] text-gray-800 text-xs p-3 shadow-lg rounded-r animate-[fadeIn_0.3s_ease-out] flex items-center';
    el.innerHTML = `<span class="font-bold mr-2 text-[#003D86]">INFO</span> ${msg}`;
    area.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}
