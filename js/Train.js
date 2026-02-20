class Train {
    constructor(routeDefIndex, spawnStationId = null) {
        this.routeDefIndex = routeDefIndex;
        this.routeDef = ROUTES_DEF[routeDefIndex];
        this.updatePathCache();

        if (this.activePath.length > 1) {
            if (spawnStationId) {
                const idx = this.activePath.indexOf(spawnStationId);
                if (idx !== -1) {
                    this.currentStationIndex = idx;
                    if (idx >= this.activePath.length - 1) {
                        this.targetStationIndex = idx - 1;
                        this.direction = -1;
                    } else {
                        this.targetStationIndex = idx + 1;
                        this.direction = 1;
                    }
                } else {
                    this.currentStationIndex = 0;
                    this.targetStationIndex = 1;
                    this.direction = 1;
                }
            } else {
                this.currentStationIndex = Math.floor(Math.random() * (this.activePath.length - 1));
                this.targetStationIndex = this.currentStationIndex + 1;
                this.direction = 1;
            }
        } else {
            this.currentStationIndex = 0;
            this.targetStationIndex = 0;
        }

        this.progress = 0;
        this.passengers = [];
        this.state = 'MOVING';
        this.boardingTimer = 0;
    }

    updatePathCache() {
        // Filter out locked stations
        let path = this.routeDef.path.filter(stId => {
            const st = STATIONS.find(s => s.id === stId);
            return ZONES[st.zone].unlocked;
        });

        // Trim waypoints from the start
        while (path.length > 0) {
            const st = STATIONS.find(s => s.id === path[0]);
            if (st.type === 'waypoint') {
                path.shift();
            } else {
                break;
            }
        }

        // Trim waypoints from the end
        while (path.length > 0) {
            const st = STATIONS.find(s => s.id === path[path.length - 1]);
            if (st.type === 'waypoint') {
                path.pop();
            } else {
                break;
            }
        }

        this.activePath = path;

        // EMERGENCY FIX: If path shrank, ensure train isn't out of bounds
        if (this.currentStationIndex >= this.activePath.length) {
            this.currentStationIndex = this.activePath.length - 1;
            this.progress = 0;
            this.state = 'BOARDING';
        }

        if (this.targetStationIndex >= this.activePath.length) {
            // Train was moving towards a node that no longer exists (e.g. waypoint removed)
            // Snap back to current and force re-evaluation
            this.targetStationIndex = this.currentStationIndex;
            this.progress = 0;
            this.state = 'BOARDING';
        }

    }

    update() {
        if (!this.activePath || this.activePath.length < 2) return;

        if (this.state === 'BOARDING') {
            this.boardingTimer--;
            if (this.boardingTimer <= 0) this.depart();
            return;
        }

        // Physics: Distance-based movement
        const currentStationId = this.activePath[this.currentStationIndex];
        const targetStationId = this.activePath[this.targetStationIndex];

        // Safety check
        if (!currentStationId || !targetStationId) return;

        const p1 = getStationPos(currentStationId);
        const p2 = getStationPos(targetStationId);

        // Euclidian distance (approximate pixels)
        const dx = p2.baseX - p1.baseX;
        const dy = p2.baseY - p1.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Speed Factor: Standard distance is e.g., 100px.
        // If distance is 200px, it should take 2x longer -> speed/2.
        // We normalize against a "unit distance" of say 80px to keep speed similar to before.
        const normalizedSpeed = state.globalSpeed * (80 / Math.max(20, distance));

        this.progress += normalizedSpeed;
        if (this.progress >= 1) this.arrive();
    }

    arrive() {
        // Update current position to where we just arrived
        this.currentStationIndex = this.targetStationIndex;

        const currentStationId = this.activePath[this.currentStationIndex];
        const station = STATIONS.find(s => s.id === currentStationId);

        // Skip boarding for waypoints
        if (station && station.type === 'waypoint') {
            this.state = 'MOVING';
            this.progress = 0;

            if (this.direction === 1) {
                if (this.currentStationIndex >= this.activePath.length - 1) {
                    this.direction = -1;
                    this.targetStationIndex = this.currentStationIndex - 1;
                } else {
                    this.targetStationIndex = this.currentStationIndex + 1;
                }
            } else {
                if (this.currentStationIndex <= 0) {
                    this.direction = 1;
                    this.targetStationIndex = this.currentStationIndex + 1;
                } else {
                    this.targetStationIndex = this.currentStationIndex - 1;
                }
            }
            return;
        }

        this.state = 'BOARDING';
        this.boardingTimer = 30;
        this.progress = 0;

        const offloading = [];
        const staying = [];

        this.passengers.forEach(p => {
            if (p.nextDest === currentStationId) {
                offloading.push(p);
            } else {
                staying.push(p);
            }
        });

        if (offloading.length > 0) {
            let totalEarnings = 0;

            offloading.forEach(p => {
                if (currentStationId === p.finalDest) {
                    const travelTime = Date.now() - p.spawnTime;
                    let tip = 0;
                    if (travelTime < state.passengerPatience * 0.7) tip = 5;

                    // Distance Bonus
                    const startPos = getStationPos(p.from);
                    const endPos = getStationPos(currentStationId);
                    const dist = Math.sqrt(Math.pow(endPos.baseX - startPos.baseX, 2) + Math.pow(endPos.baseY - startPos.baseY, 2));
                    const distanceBonus = Math.floor(dist * 0.10); // €0.10 per pixel approx

                    totalEarnings += state.baseTicketPrice + distanceBonus + tip;
                    state.passengersTransported++;
                    state.reputation = Math.min(100, state.reputation + 0.2);
                } else {
                    totalEarnings += 2;
                    state.waitingPassengers.push({
                        from: currentStationId,
                        to: p.finalDest,
                        spawnTime: p.spawnTime,
                        isTransfer: true
                    });
                }
            });

            addMoney(totalEarnings);
            if (totalEarnings > 0 && typeof showFloatingPopup === 'function') {
                const pos = getStationPos(currentStationId);
                showFloatingPopup(`+€${Math.floor(totalEarnings)}`, pos.baseX, pos.baseY, 'success');
            }
        }

        this.passengers = staying;

        if (this.direction === 1) {
            if (this.currentStationIndex >= this.activePath.length - 1) {
                this.direction = -1;
                this.targetStationIndex = this.currentStationIndex - 1;
            } else {
                this.targetStationIndex = this.currentStationIndex + 1;
            }
        } else {
            if (this.currentStationIndex <= 0) {
                this.direction = 1;
                this.targetStationIndex = this.currentStationIndex + 1;
            } else {
                this.targetStationIndex = this.currentStationIndex - 1;
            }
        }
    }

    depart() {
        this.state = 'MOVING';
        const currentStationId = this.activePath[this.currentStationIndex];

        const peopleAtStation = state.waitingPassengers.filter(p => p.from === currentStationId);
        const others = state.waitingPassengers.filter(p => p.from !== currentStationId);

        let boarding = [];
        let leftBehind = [];

        peopleAtStation.forEach(p => {
            const nextHop = findNextStation(currentStationId, p.to);

            if (!nextHop) {
                leftBehind.push(p);
                return;
            }

            const destIndex = this.activePath.indexOf(nextHop);

            if (destIndex !== -1 && this.passengers.length + boarding.length < state.trainCapacity) {
                let canBoard = false;
                if (this.direction === 1 && destIndex > this.currentStationIndex) canBoard = true;
                if (this.direction === -1 && destIndex < this.currentStationIndex) canBoard = true;

                if (canBoard) {
                    p.nextDest = nextHop;
                    p.finalDest = p.to;
                    boarding.push(p);
                } else {
                    leftBehind.push(p);
                }
            } else {
                leftBehind.push(p);
            }
        });

        boarding.forEach(p => this.passengers.push(p));
        state.waitingPassengers = [...others, ...leftBehind];
    }
}
