// --- TRAIN ---

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
        // Onthoud waar de trein staat vóór de rebuild, zodat hij niet "teleporteert"
        // wanneer activePath groeit (bij het openen van een zone). We bewaren het
        // station-id (niet de index), want de index verschuift als er stations vóór
        // het huidige station worden ingevoegd.
        const prevPath = this.activePath;
        const prevCurrentId = (prevPath && typeof this.currentStationIndex === 'number')
            ? prevPath[this.currentStationIndex]
            : null;

        this.activePath = this.routeDef.path.filter(stId => ZONES[getStation(stId).zone].unlocked);

        // Herstel de positie op de nieuwe (mogelijk langere) activePath.
        if (prevCurrentId !== null && this.activePath.length > 1) {
            let idx = this.activePath.indexOf(prevCurrentId);
            if (idx === -1) {
                // Fallback: klem de oude index binnen de nieuwe grenzen.
                idx = Math.min(this.currentStationIndex, this.activePath.length - 1);
            }
            this.currentStationIndex = idx;

            if (this.direction !== 1 && this.direction !== -1) this.direction = 1;

            // Richt op de directe buur in de rijrichting; kaats bij een eindpunt.
            let target = idx + this.direction;
            if (target < 0 || target >= this.activePath.length) {
                this.direction *= -1;
                target = idx + this.direction;
            }
            this.targetStationIndex = Math.max(0, Math.min(this.activePath.length - 1, target));
        }
    }

    update(frameScale = 1) {
        if (!this.activePath || this.activePath.length < 2) return;

        if (this.state === 'BOARDING') {
            this.boardingTimer -= frameScale;
            if (this.boardingTimer <= 0) this.depart();
            return;
        }

        this.progress += state.globalSpeed * frameScale;
        if (this.progress >= 1) this.arrive();
    }

    arrive() {
        this.state = 'BOARDING';
        this.boardingTimer = 30;
        this.currentStationIndex = this.targetStationIndex;
        this.progress = 0;

        const currentStationId = this.activePath[this.currentStationIndex];

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
                    const travelTime = state.gameTime - p.spawnTime;
                    let tip = 0;
                    if (travelTime < state.passengerPatience * 0.7) tip = 5;

                    totalEarnings += state.baseTicketPrice + tip;
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
            if (totalEarnings > 0) {
                showFloatText(`+€${Math.floor(totalEarnings)}`, getStationPos(currentStationId));
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

        // Route langs verbindingen die de vloot echt bedient, niet de globaal-kortste hop.
        // Zo stappen passagiers in op een lijn die hen daadwerkelijk verder brengt.
        const fleetGraph = buildFleetGraph();

        const peopleAtStation = state.waitingPassengers.filter(p => p.from === currentStationId);
        const others = state.waitingPassengers.filter(p => p.from !== currentStationId);

        let boarding = [];
        let leftBehind = [];

        peopleAtStation.forEach(p => {
            const nextHop = bfsNextHop(fleetGraph, currentStationId, p.to);

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
