// --- GAME ENGINE ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Performance: Offscreen canvas for static map elements
let mapCanvas = document.createElement('canvas');
let mapCtx = mapCanvas.getContext('2d');
let mapDirty = true; // Flag to redraw map

let state = {};

function resetState() {
    state = {
        paused: false,
        money: 600,
        passengersTransported: 0,
        reputation: 100,
        baseTicketPrice: 15.00,
        globalSpeed: 0.006,
        trainCapacity: 20,
        passengerPatience: 45000,
        trains: [],
        waitingPassengers: [],
        gameTime: 0,        // verstreken speeltijd (ms); loopt alleen als het spel niet gepauzeerd is
        lastSpawnTime: 0,   // in gameTime-eenheden
        trainCounts: [0, 0, 0, 0, 0],
        costs: {
            baseTrain: 500,
            speed: 300,
            capacity: 400,
            marketing: 150,
            comfort: 600
        }
    };
    invalidateGraphCaches(); // verse start → graaf-caches wissen
}

// --- CORE FUNCTIONS ---

function init() {
    resetState();
    // Initial trains start randomly
    state.trains.push(new Train(3)); state.trainCounts[3]++;
    state.trains.push(new Train(0)); state.trainCounts[0]++;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    updateUI();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    mapCanvas.width = canvas.width;
    mapCanvas.height = canvas.height;
    rebuildStationPosCache(); // pixelposities hangen af van de canvasgrootte
    mapDirty = true;
}

function spawnPassenger() {
    const unlockedStations = STATIONS.filter(s => ZONES[s.zone].unlocked);
    if (unlockedStations.length < 2) return;

    const startNode = unlockedStations[Math.floor(Math.random() * unlockedStations.length)];
    let endNode = startNode;
    let attempts = 0;

    while (attempts < 15) {
        const candidate = unlockedStations[Math.floor(Math.random() * unlockedStations.length)];
        if (candidate.id !== startNode.id) {
            if (areStationsConnected(startNode.id, candidate.id)) {
                endNode = candidate;
                break;
            }
        }
        attempts++;
    }

    if (endNode.id === startNode.id) return;

    state.waitingPassengers.push({
        from: startNode.id,
        to: endNode.id,
        spawnTime: state.gameTime,
        isTransfer: false
    });
}

function unlockZone(zoneKey) {
    const zone = ZONES[zoneKey];
    if (state.money >= zone.cost && !zone.unlocked) {
        state.money -= zone.cost;
        zone.unlocked = true;
        state.trains.forEach(t => t.updatePathCache());
        invalidateGraphCaches(); // ontgrendelde stations + gewijzigde routes → grafen opnieuw
        mapDirty = true;
        notify(`${zone.name} Geopend!`);
        updateUI();
    }
}

// --- DRAWING & LOGIC LOOP ---

let lastFrameTime = 0;

function gameLoop(timestamp) {
    // Delta-tijd: schaal de simulatie op verstreken tijd i.p.v. per frame, zodat het spel
    // niet versnelt op snelle monitors en niet stilvalt bij lage framerate.
    let dt = lastFrameTime ? (timestamp - lastFrameTime) : (1000 / 60);
    lastFrameTime = timestamp;
    if (dt > 100) dt = 100; // klem grote sprongen (bv. tab is op de achtergrond geweest)
    const frameScale = dt / (1000 / 60); // 1.0 bij 60fps → bestaande balancing blijft gelijk

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.paused) {
        state.gameTime += dt;
        const now = state.gameTime;

        const networkSize = STATIONS.filter(s => ZONES[s.zone].unlocked).length;
        const spawnRate = 600 / (1 + (networkSize * 0.1));

        if (now - state.lastSpawnTime > spawnRate) {
            if (Math.random() > 0.3) spawnPassenger();
            state.lastSpawnTime = now;
        }

        for (let i = state.waitingPassengers.length - 1; i >= 0; i--) {
            const p = state.waitingPassengers[i];
            if (now - p.spawnTime > state.passengerPatience) {
                state.waitingPassengers.splice(i, 1);
                state.reputation = Math.max(0, state.reputation - 1);
                if (Math.random() > 0.8) {
                    const pos = getStationPos(p.from);
                    showFloatText("🤬", { x: pos.baseX, y: pos.baseY - 10 });
                }
            }
        }

        state.trains.forEach(t => t.update(frameScale));
    }

    // Always update UI counts even if paused (though they won't change)
    document.getElementById('waiting-count').innerText = state.waitingPassengers.length;

    if (mapDirty) {
        prerenderMap();
        mapDirty = false;
    }
    ctx.drawImage(mapCanvas, 0, 0);

    drawTrains();
    drawStationsDynamic();
    drawEffects(frameScale);

    requestAnimationFrame(gameLoop);
}

function prerenderMap() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.lineCap = 'round';
    mapCtx.lineJoin = 'round';

    // Draw Lines Background (Subtle shadow for depth)
    mapCtx.lineWidth = 12;
    ROUTES_DEF.forEach(route => {
        mapCtx.strokeStyle = 'rgba(0,0,0,0.05)'; // Very subtle shadow
        mapCtx.beginPath();
        for (let i = 0; i < route.path.length - 1; i++) {
            const a = getStationPos(route.path[i]);
            const b = getStationPos(route.path[i + 1]);
            mapCtx.moveTo(a.baseX, a.baseY + 2); // Slight offset for shadow
            mapCtx.lineTo(b.baseX, b.baseY + 2);
        }
        mapCtx.stroke();
    });

    // Draw Colored Lines
    ROUTES_DEF.forEach(route => {
        mapCtx.lineWidth = 4; // Slightly thicker for visibility
        mapCtx.strokeStyle = route.color;
        mapCtx.beginPath();
        let penDown = false;
        for (let i = 0; i < route.path.length - 1; i++) {
            const s1 = getStation(route.path[i]);
            const s2 = getStation(route.path[i + 1]);
            const p1 = getStationPos(s1.id, route.offset);
            const p2 = getStationPos(s2.id, route.offset);
            if (ZONES[s1.zone].unlocked && ZONES[s2.zone].unlocked) {
                if (!penDown) { mapCtx.moveTo(p1.x, p1.y); penDown = true; }
                mapCtx.lineTo(p2.x, p2.y);
            } else { penDown = false; }
        }
        mapCtx.stroke();
    });

    // Draw Static Stations
    STATIONS.forEach(station => {
        if (!ZONES[station.zone].unlocked) return;
        const pos = getStationPos(station.id);

        // Base
        mapCtx.fillStyle = '#fff';
        mapCtx.strokeStyle = '#374151'; // Dark gray stroke
        mapCtx.lineWidth = 2;
        let radius = 4;
        if (['beurs', 'cs', 'schiedam', 'kralingse', 'zuidplein'].includes(station.id)) {
            radius = 6; mapCtx.strokeStyle = '#000'; mapCtx.lineWidth = 3;
        }
        mapCtx.beginPath();
        mapCtx.arc(pos.baseX, pos.baseY, radius, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.stroke();

        // Name
        mapCtx.fillStyle = '#4B5563'; // Gray-600
        mapCtx.font = '600 10px Inter'; // Inter font
        mapCtx.textAlign = 'center';
        let yOff = -12;
        if (['blaak', 'eendracht', 'stadhuis'].includes(station.id)) yOff = 18;
        mapCtx.fillText(station.name, pos.baseX, pos.baseY + yOff);
    });
}

function drawStationsDynamic() {
    const now = state.gameTime;
    STATIONS.forEach(station => {
        if (!ZONES[station.zone].unlocked) return;
        const pos = getStationPos(station.id);

        // Passengers Waiting
        const waitingHere = state.waitingPassengers.filter(p => p.from === station.id);
        if (waitingHere.length > 0) {
            const oldest = waitingHere.reduce((min, p) => p.spawnTime < min ? p.spawnTime : min, now);
            const waitTime = now - oldest;

            let color = '#10B981'; // Green-500
            if (waitTime > state.passengerPatience * 0.5) color = '#F59E0B'; // Amber-500
            if (waitTime > state.passengerPatience * 0.8) color = '#EF4444'; // Red-500

            ctx.fillStyle = color;
            ctx.beginPath();
            const size = Math.min(12, 6 + (waitingHere.length / 2));
            // Circle instead of square for cleaner look
            ctx.arc(pos.baseX + 8, pos.baseY - 8, size / 2, 0, Math.PI * 2);
            ctx.fill();

            if (waitTime > state.passengerPatience * 0.8) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 8px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('!', pos.baseX + 8, pos.baseY - 8);
            }
        }
    });
}

function drawTrains() {
    state.trains.forEach(train => {
        if (!train.activePath || train.activePath.length < 2) return;
        const fromId = train.activePath[train.currentStationIndex];
        const toId = train.activePath[train.targetStationIndex];
        const fromPos = getStationPos(fromId, train.routeDef.offset);
        const toPos = getStationPos(toId, train.routeDef.offset);
        const x = fromPos.x + (toPos.x - fromPos.x) * train.progress;
        const y = fromPos.y + (toPos.y - fromPos.y) * train.progress;
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Modern Train Shape
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 2;
        ctx.fillRect(-10, -4, 20, 8);

        // Line Color Stripe
        ctx.fillStyle = train.routeDef.color;
        ctx.fillRect(-10, -4, 4, 8); // Front/Back stripe

        // Capacity Indicator (Dot)
        const load = train.passengers.length / state.trainCapacity;
        ctx.fillStyle = load > 0.9 ? '#EF4444' : (load > 0.5 ? '#F59E0B' : '#10B981');
        ctx.beginPath(); ctx.arc(4, 0, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    });
}

function drawEffects(frameScale = 1) {
    ctx.font = 'bold 11px Inter';
    for (let i = floatTexts.length - 1; i >= 0; i--) {
        const ft = floatTexts[i];
        if (ft.text === '🤬') ctx.fillStyle = '#EF4444';
        else ctx.fillStyle = '#10B981';

        ctx.fillText(ft.text, ft.x, ft.y - (40 - ft.life));
        ft.life -= frameScale;
        if (ft.life <= 0) floatTexts.splice(i, 1);
    }
}

init();
