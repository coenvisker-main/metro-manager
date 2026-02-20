// --- GAME ENGINE ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Performance: Offscreen canvas for static map elements
let mapCanvas = document.createElement('canvas');
let mapCtx = mapCanvas.getContext('2d');
let mapDirty = true; // Flag to redraw map

// state is now defined in data.js as window.state

// Configuration Lists for Labels
// Configuration Lists for Labels
const LABEL_CFG = {
    top: [
        'vlaardingen_west', 'vlaardingen_oost', 'schiedam_c', 'delfshaven', 'dijkzigt', 'oostplein',
        'voorschoter', 'capelse', 'capelle_c', 'hesseplaats', 'ambachtsland', 'nesselande', 'romeynshof'
    ],
    bottom: [
        'vlaardingen_c', 'schiedam_nieuw', 'marconi', 'coolhaven', 'eendracht', 'blaak', 'gerdesia',
        'kralingse', 'slotlaan', 'de_terp', 'nieuw_verlaat', 'de_tochten', 'binnenhof'
    ],
    right: [
        'cs', 'stadhuis', 'leuvehaven', 'wilhelmina', 'rijnhaven', 'maashaven',
        'zuidplein', 'slinge', 'rhoon', 'poortugaal', 'tussenwater', 'hoogvliet',
        'zalmplaat', 'spijkenisse_c', 'heemraad', 'de_akkers',
        'blijdorp', 'melanchthon', 'meijersplein', 'rodenrijs', 'berkel',
        'pijnacker_z', 'pijnacker_c', 'nootdorp', 'leidschenveen', 'forepark',
        'leidschendam', 'voorburg_loo', 'laan_noi', 'den_haag',
        'parkweg', 'troelstra', 'vijfsluizen', 'pernis',
        'schenkel', 'prinsenlaan', 'oosterflank', 'alexander'
    ],
    left: ['beurs']
};

const GAME_CONFIG = {
    MAX_STATION_CAPACITY: 40, // Max passengers per station before meltdown
    OVERLOAD_GRACE_PERIOD: 10000, // ms before Game Over when overloaded
    REP_WARNING_THRESHOLD: 20, // %
    CRITICAL_REP_THRESHOLD: 0 // %
};

function resetState() {
    window.state = {
        startTime: Date.now(), // New: Track survival time
        paused: false,
        gameOver: false,
        money: 600,
        passengersTransported: 0,
        reputation: 100,
        baseTicketPrice: 8.00,
        globalSpeed: 0.012, // Polished: Increased from 0.006 (x2 Speed)
        trainCapacity: 20,
        passengerPatience: 60000, // Balanced: Increased from 45s to 60s
        trains: [],
        waitingPassengers: [],
        lastSpawnTime: 0,
        lastSubsidyTime: 0, // New: Periodic income
        trainCounts: [0, 0, 0, 0, 0],
        overloadedStations: {}, // Map of stationID -> timestamp (when overload started)
        costs: {
            baseTrain: 500,
            speed: 300,
            capacity: 400,
            marketing: 150,
            comfort: 600
        }
    };
}

function init() {
    console.log("Initializing Game...");

    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    if (typeof STATIONS === 'undefined' || typeof ROUTES_DEF === 'undefined' || typeof ZONES === 'undefined') {
        console.error("Data files not loaded correctly!");
        alert("Error: Data files not loaded. Check console.");
        return;
    }

    resetState();

    // Initial trains start randomly
    try {
        state.trains.push(new Train(3)); state.trainCounts[3]++;
        state.trains.push(new Train(0)); state.trainCounts[0]++;
    } catch (e) {
        console.error("Error creating initial trains:", e);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (typeof updateUI === 'function') {
        updateUI();
    } else {
        console.warn("updateUI function not found!");
    }

    requestAnimationFrame(gameLoop);
    console.log("Game Initialized Successfully.");
}

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (container && canvas) {
        canvas.width = container.clientWidth || 800; // Fallback width
        canvas.height = container.clientHeight || 600; // Fallback height

        mapCanvas.width = canvas.width;
        mapCanvas.height = canvas.height;
        mapDirty = true;
        console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
    }
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
        spawnTime: Date.now(),
        isTransfer: false
    });
}

function addMoney(amount) {
    state.money += amount;
    if (typeof updateUI === 'function') updateUI();
}

// --- DRAWING & LOGIC LOOP ---

function gameLoop() {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!state.paused) {
            const now = Date.now();

            // Speed Scaling:
            // - Speed increased -> Trains faster -> Capacity increased
            // - To keep balance: Spawn Rate must increase (Interval decrease)
            // - To keep pace: Patience must decrease (Time dilation)
            const speedFactor = state.globalSpeed / 0.006;

            // Balanced Spawn Rate: Slower scaling with network size
            const networkSize = STATIONS.filter(s => ZONES[s.zone].unlocked).length;
            const baseSpawnRate = 1000 / (1 + (networkSize * 0.05)); // Was 600 / (1 + 0.1*N)
            const spawnRate = baseSpawnRate / speedFactor;

            if (now - state.lastSpawnTime > spawnRate) {
                if (Math.random() > 0.3) spawnPassenger();
                state.lastSpawnTime = now;
            }

            // New: Government Subsidy (Prevents soft-lock)
            // Every 10 seconds, receive money based on reputation
            if (!state.lastSubsidyTime) state.lastSubsidyTime = now;
            if (now - state.lastSubsidyTime > 10000) {
                const subsidy = Math.floor(state.reputation * 1.5); // Max €150 per 10s
                if (subsidy > 0) {
                    addMoney(subsidy);
                    if (typeof showFloatingPopup === 'function') {
                        showFloatingPopup(`+€${subsidy} Subsidie`, canvas.width / 2, 50, 'subsidy');
                    }
                }
                state.lastSubsidyTime = now;
            }

            for (let i = state.waitingPassengers.length - 1; i >= 0; i--) {
                const p = state.waitingPassengers[i];
                // Scaled Patience: If time goes 2x faster, patience runs out 2x faster (realtime)
                const effectivePatience = state.passengerPatience / speedFactor;

                if (now - p.spawnTime > effectivePatience) {
                    state.waitingPassengers.splice(i, 1);
                    state.reputation = Math.max(0, state.reputation - 1);
                    if (Math.random() > 0.8) {
                        const pos = getStationPos(p.from);
                        // showFloatingPopup("🤬", pos.baseX, pos.baseY, 'error'); // Optional: clutter reduction
                    }
                }
            }

            state.trains.forEach(t => t.update());
        }

        if (typeof checkSurvivalRules === 'function') checkSurvivalRules();

        // Always update UI counts even if paused
        const waitingCountEl = document.getElementById('waiting-count');
        if (waitingCountEl) waitingCountEl.innerText = state.waitingPassengers.length;

        if (mapDirty) {
            prerenderMap();
            mapDirty = false;
        }
        ctx.drawImage(mapCanvas, 0, 0);

        drawTrains();
        drawStationsDynamic();
        // drawEffects(); // Removed old canvas text support

        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("Error in gameLoop:", e);
        // Don't request next frame to avoid infinite error loop
    }
}

function checkSurvivalRules() {
    if (state.gameOver) return;

    // 1. Reputation Check
    if (state.reputation <= GAME_CONFIG.CRITICAL_REP_THRESHOLD) {
        triggerGameOver("De RET is failliet verklaard wegens ontevreden reizigers.");
        return;
    }

    // 2. Overcrowding Check
    const counts = {};
    state.waitingPassengers.forEach(p => {
        counts[p.from] = (counts[p.from] || 0) + 1;
    });

    const now = Date.now();
    let anyOverloaded = false;

    for (const [stationId, count] of Object.entries(counts)) {
        if (count >= GAME_CONFIG.MAX_STATION_CAPACITY) {
            anyOverloaded = true;
            if (!state.overloadedStations[stationId]) {
                state.overloadedStations[stationId] = now; // Start timer
            } else {
                // Check timer
                const elapsed = now - state.overloadedStations[stationId];
                if (elapsed > GAME_CONFIG.OVERLOAD_GRACE_PERIOD) {
                    const s = STATIONS.find(st => st.id === stationId);
                    triggerGameOver(`Station ${s ? s.name : stationId} is gesloten door de politie wegens verdrukking.`);
                    return;
                }
            }
        } else {
            // Clear timer if dropped below limit
            if (state.overloadedStations[stationId]) {
                delete state.overloadedStations[stationId];
            }
        }
    }
}

function triggerGameOver(reason) {
    state.gameOver = true;
    state.paused = true;
    console.log("GAME OVER:", reason);
    if (typeof showGameOverModal === 'function') {
        showGameOverModal(reason, state.passengersTransported);
    } else {
        alert("GAME OVER\n" + reason);
    }
}

function prerenderMap() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.lineCap = 'round';
    mapCtx.lineJoin = 'round';

    // Draw Lines Background (Subtle shadow for depth)
    mapCtx.lineWidth = 14;
    ROUTES_DEF.forEach(route => {
        mapCtx.strokeStyle = 'rgba(0,0,0,0.05)';
        mapCtx.beginPath();
        for (let i = 0; i < route.path.length - 1; i++) {
            const p1 = getStationPos(route.path[i]).baseX;
            const p1y = getStationPos(route.path[i]).baseY;
            const p2 = getStationPos(route.path[i + 1]).baseX;
            const p2y = getStationPos(route.path[i + 1]).baseY;
            mapCtx.moveTo(p1, p1y + 2);
            mapCtx.lineTo(p2, p2y + 2);
        }
        mapCtx.stroke();
    });

    // Draw Colored Lines
    ROUTES_DEF.forEach(route => {
        mapCtx.lineWidth = 6;
        mapCtx.strokeStyle = route.color;
        mapCtx.beginPath();
        let penDown = false;
        for (let i = 0; i < route.path.length - 1; i++) {
            const s1 = STATIONS.find(s => s.id === route.path[i]);
            const s2 = STATIONS.find(s => s.id === route.path[i + 1]);
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
        if (station.type === 'waypoint') return;
        const pos = getStationPos(station.id);

        // Base
        mapCtx.fillStyle = '#fff';
        mapCtx.strokeStyle = '#374151';
        mapCtx.lineWidth = 2.5;
        let radius = 5;
        if (['beurs', 'cs', 'schiedam_c', 'kralingse', 'zuidplein', 'spijkenisse_c'].includes(station.id)) {
            radius = 8; mapCtx.strokeStyle = '#000'; mapCtx.lineWidth = 3;
        }
        mapCtx.beginPath();
        mapCtx.arc(pos.baseX, pos.baseY, radius, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.stroke();

        // Name with Halo & Positioning
        mapCtx.fillStyle = '#1F2937';
        mapCtx.font = 'bold 11px Inter';

        // Default: Top Center
        let textAlign = 'center';
        let textBaseline = 'bottom';
        let xOff = 0;
        let yOff = -10;

        if (LABEL_CFG.bottom.includes(station.id)) {
            textBaseline = 'top';
            yOff = 10;
        } else if (LABEL_CFG.top && LABEL_CFG.top.includes(station.id)) {
            textBaseline = 'bottom';
            yOff = -10;
        } else if (LABEL_CFG.right.includes(station.id)) {
            textAlign = 'left';
            textBaseline = 'middle';
            xOff = 12;
            yOff = 0;
        } else if (LABEL_CFG.left.includes(station.id)) {
            textAlign = 'right';
            textBaseline = 'middle';
            xOff = -12;
            yOff = 0;
        }

        mapCtx.textAlign = textAlign;
        mapCtx.textBaseline = textBaseline;

        // Halo
        mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        mapCtx.lineWidth = 3;
        mapCtx.strokeText(station.name, pos.baseX + xOff, pos.baseY + yOff);
        mapCtx.fillText(station.name, pos.baseX + xOff, pos.baseY + yOff);
    });
}

function drawStationsDynamic() {
    const now = Date.now();
    STATIONS.forEach(station => {
        if (!ZONES[station.zone].unlocked) return;
        if (station.type === 'waypoint') return;
        const pos = getStationPos(station.id);

        // Passengers Waiting - Visualization
        const waitingHere = state.waitingPassengers.filter(p => p.from === station.id);
        const count = waitingHere.length;

        if (count > 0) {
            const usage = count / GAME_CONFIG.MAX_STATION_CAPACITY;

            // Default Green
            let color = '#10B981';
            let pulse = false;

            if (usage > 1.0) {
                // Critical (Overloaded)
                color = '#DC2626'; // Red
                pulse = true;
            } else if (usage > 0.75) {
                // Danger
                color = '#EF4444'; // Red-Orange
            } else if (usage > 0.5) {
                // Warning
                color = '#F59E0B'; // Orange
            }

            // Flashing effect for overloaded stations
            if (pulse && Math.floor(now / 200) % 2 === 0) {
                color = '#7F1D1D'; // Darker red pulse
            }

            ctx.fillStyle = color;
            ctx.beginPath();

            // Size grows with dampening
            const size = Math.min(16, 6 + (Math.sqrt(count) * 2));
            ctx.arc(pos.baseX + 8, pos.baseY - 8, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Text: Exclamation mark or Count if high
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (usage > 0.5) {
                ctx.fillText(count, pos.baseX + 8, pos.baseY - 8);
            } else {
                // Subtle dot for small crowds
            }

            // Timer Ring for Overloaded Stations
            if (state.overloadedStations[station.id]) {
                const elapsed = now - state.overloadedStations[station.id];
                const remaining = Math.max(0, GAME_CONFIG.OVERLOAD_GRACE_PERIOD - elapsed);
                const pct = remaining / GAME_CONFIG.OVERLOAD_GRACE_PERIOD;

                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pos.baseX + 8, pos.baseY - 8, (size / 2) + 2, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * pct));
                ctx.stroke();
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

        // Modern Train Shape (Simple Rect for stability)
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.fillRect(-12, -5, 24, 10);

        // Line Color Stripe
        ctx.fillStyle = train.routeDef.color;
        ctx.fillRect(-12, -5, 6, 10);

        // Capacity Indicator (Dot)
        const load = train.passengers.length / state.trainCapacity;
        ctx.fillStyle = load > 0.9 ? '#EF4444' : (load > 0.5 ? '#F59E0B' : '#10B981');
        ctx.beginPath(); ctx.arc(4, 0, 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    });
}

// function showFloatText(text, pos) { ... } // Deprecated
// function drawEffects() { ... } // Deprecated

// Start the game
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 1);
} else {
    window.addEventListener('load', init);
}
