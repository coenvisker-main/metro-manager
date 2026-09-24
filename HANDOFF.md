[AI-TO-AI HANDOFF PAYLOAD]

Kernopdracht/Doel: Samen met Coen de mogelijke doorontwikkelingen en speltoevoegingen voor Metro Manager verkennen en in kaart brengen (collaboratief, human-in-the-loop).

Overdrachtstype: Volledig — de voorafgaande sessie was een code review + bugfix/polish ronde; die is afgerond en gecommit. Jouw taak is de vervolgfase: features/doorontwikkeling verkennen.

Context & Achtergrond:
Metro Manager is een standalone HTML-simulatiespel (RET-thema, Rotterdamse metro). Geen build, geen dependencies — klassieke `<script>`-bestanden + Tailwind via CDN. De speler koopt metro's (lijnen A–E), zet ze in op zelfgekozen startstations, doet upgrades (frequentie/capaciteit/faciliteiten/marketing) en opent zones om het netwerk uit te breiden. Passagiers spawnen op ontgrendelde stations en willen naar een bestemming; treinen vervoeren ze (met overstappen) en leveren geld op. Reputatie ("Tevredenheid") daalt als passagiers te lang wachten.

De vorige sessie vond dat de "actieve" `Metro_Manager_v2.html` kapot was (verwees naar niet-bestaande js/css) en heeft de modularisatie afgemaakt + een reeks correctheids- en perf-bugs opgelost. De basis is nu solide en werkt. Zie ook het volledige reviewplan: `C:\Users\chvis\.claude\plans\je-bent-een-senior-validated-allen.md` (bevat de complete geprioriteerde backlog met statusmarkeringen).

Belangrijke werkafspraken uit de sessie:
- `Metro_Manager_v2_Backup.html` is de oude self-contained referentie; wijzig voortaan de losse bestanden in `js/` en `css/`.
- Live browser-testen in headless/Playwright is onbetrouwbaar: `requestAnimationFrame` wordt gethrottled waardoor treinen "stilvallen". Verifieer sim-logica met **deterministisch tikken** (handmatig `state.gameTime += dt` + `state.trains.forEach(t => t.update(frameScale))` in een lus), niet met wall-clock wachten.
- Testen kan via een lokale statische server: `python -m http.server 8971` in de projectroot, dan `http://127.0.0.1:8971/Metro_Manager_v2.html`.

Tot nu toe bereikt (gecommit als 81feb5c):
- Modularisatie afgemaakt: `css/style.css` + `js/{data,utils,Train,ui,game}.js`. Game draait weer.
- #1 Treinen teleporteren niet meer bij zone-unlock (index-hermapping in `Train.updatePathCache`).
- #4 Passagier-routing volgt de daadwerkelijk bereden lijnen (`buildFleetGraph` + `bfsNextHop`).
- #5/#6 Delta-tijd (`frameScale`, 60fps baseline) + game-klok (`state.gameTime`, stilstaand bij pauze). Bonus: pauze-bug (massaal verloop na lange pauze) opgelost.
- #7 Ontbrekende `@keyframes fadeIn` toegevoegd.
- Perf/UX polish: global+fleet-graaf caching (`invalidateGraphCaches`), `STATION_BY_ID` map + pixelpositie-cache, `updateUI` gesplitst in `updateStats()`/`renderExpansionList()`, spawn/restart-modals full-screen.
- CLAUDE.md + PROJECT_CONTEXT.md bijgewerkt naar de nieuwe structuur.

Wat werkte:
- Deterministisch tikken als verificatiemethode (framerate-onafhankelijkheid bewezen: 60/30/10 fps → identieke treinbeweging).

Wat niet werkte (niet herhalen):
- `file://` openen werkt niet met de losse JS-bestanden — gebruik een statische server.
- Live meten door seconden te wachten in Playwright geeft valse "0 instappers" (rAF-throttle), niet de code.

Stijl & Afspraken:
- Taal: Nederlands, professioneel maar direct. Kritisch-opbouwend.
- Human-in-the-loop: dit is een VERKENNENDE fase. Stel voor, laat Coen kiezen. Niet zelfstandig grote features bouwen zonder afstemming.
- Werk in kleine, testbare iteraties; verifieer voordat je doorgaat.
- Eerst correctheid dan features — die correctheidsronde is nu klaar.
- Commit alleen op verzoek. Branch: `claude/ecstatic-williams-7cbd73` (niet main).

Essentiële Data — reeds besliste richtingen (respecteren):
- #2 "Onbediende zones → reputatieverlies" is BEWUST gedrag (terecht straffen), GEEN bug. Spawn-logica NIET beperken.
- Coens eigen feature-idee: een difficulty/easy-mode die een GRATIS trein geeft bij het openen van een nog-onbediende lijn (staat in de backlog als #11b).

Openstaande doorontwikkel-kandidaten (backlog P2/P3 — te bespreken met Coen):
- [ ] #3/#8 Win/verlies-condities + reputatie betekenis geven (nu puur cosmetisch; spel is oneindig zonder spanning).
- [ ] #9 Opslaan/laden via localStorage.
- [ ] #10 Faal-feedback: laten zien wélke lijn/zone onbediend is.
- [ ] #11b Spelmodi/difficulty + gratis trein bij onbediende lijn (Coens idee).
- [ ] #11 Materieel verkopen/herplaatsen.
- [ ] #14 devicePixelRatio voor scherpe canvas op HiDPI (klein, P3).
- [ ] Balancing-restpunt: bij aankomst wordt `progress`-overschot afgekapt (`=0`) → verwaarloosbaar tijdverlies bij zeer lage fps.

Directe vervolgstap: Vraag Coen welke van de backlog-kandidaten hem het meest aanspreken en verken samen 2–3 daarvan qua spelontwerp voordat er code geschreven wordt.
