// --- PATHFINDING & UTILS ---

function findNextStation(startId, endId) {
    if (startId === endId) return null;

    const graph = {};
    STATIONS.forEach(s => {
        if (ZONES[s.zone].unlocked) graph[s.id] = [];
    });

    ROUTES_DEF.forEach(route => {
        for (let i = 0; i < route.path.length - 1; i++) {
            const s1 = route.path[i];
            const s2 = route.path[i + 1];
            const z1 = STATIONS.find(s => s.id === s1).zone;
            const z2 = STATIONS.find(s => s.id === s2).zone;

            if (ZONES[z1].unlocked && ZONES[z2].unlocked) {
                if (graph[s1]) graph[s1].push(s2);
                if (graph[s2]) graph[s2].push(s1);
            }
        }
    });

    let queue = [[startId]];
    let visited = new Set();
    visited.add(startId);

    while (queue.length > 0) {
        let path = queue.shift();
        let node = path[path.length - 1];

        if (node === endId) {
            return path.length > 1 ? path[1] : null;
        }

        if (graph[node]) {
            for (let neighbor of graph[node]) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    let newPath = [...path, neighbor];
                    queue.push(newPath);
                }
            }
        }
    }
    return null;
}

function areStationsConnected(startId, endId) {
    return findNextStation(startId, endId) !== null;
}

function getStationPos(id, offset = 0) {
    // Requires global 'canvas' and 'STATIONS'
    const s = STATIONS.find(s => s.id === id);
    const shiftX = offset;
    const shiftY = offset;

    return {
        x: (s.x * canvas.width) + shiftX,
        y: (s.y * canvas.height) + shiftY,
        baseX: s.x * canvas.width,
        baseY: s.y * canvas.height
    };
}

function getUnlockedPath(routeIdx) {
    const route = ROUTES_DEF[routeIdx];
    return route.path.filter(stId => {
        const st = STATIONS.find(s => s.id === stId);
        return ZONES[st.zone].unlocked;
    });
}

function getTrainCost(routeIdx) {
    // Requires global 'state'
    return Math.floor(state.costs.baseTrain * Math.pow(1.3, state.trainCounts[routeIdx]));
}
