# Abnahmenachweis Version 1

Stand: 30. Juli 2026

Dieses Dokument ordnet die 13 Abnahmekriterien aus
[`ENTWURF_BROWSERANWENDUNG.md`](./ENTWURF_BROWSERANWENDUNG.md#12-abnahmekriterien-der-ersten-vollständigen-version)
dem implementierten Nachweis zu.

| Nr. | Kriterium | Implementierung und Nachweis |
|---:|---|---|
| 1 | Pflichtfunktionen aus 4.1 | Modell, Worker-App, Instrumente, Optionen, zwei Diagramme, DE/EN und statischer Build; Browserabläufe in `tests/e2e/app.spec.ts` |
| 2 | Regeln aus Abschnitt 6 automatisiert | 98 Unit-/Integrations-/Performanceprüfungen unter `tests/`; erzwungene Zufallszweige, Grenzwerte und Reihenfolge sind getrennt geprüft |
| 3 | Reproduzierbarkeit | LCG-Referenzfolge sowie bitgleiche Seeds/Befehlsfolgen in `rng.test.ts`, `model.test.ts` und `options-and-invariants.test.ts` |
| 4 | RNG nur im Modell | `DelphiLcg`/`RandomSource` liegen ausschließlich unter `models/original12`; UI nutzt `crypto.getRandomValues` nur zur Erzeugung eines neuen Startseeds |
| 5 | UI bei 100.000 Neutronen bedienbar | Workertrennung, adaptive Scheduler-/Punktdrosselung, dokumentierte lokale Referenzwerte in [`PERFORMANCE_V1.md`](./PERFORMANCE_V1.md) und echter Chromium-Stresstest; die UI-Rückmeldung bleibt unter einer Sekunde, SCRAM wird browserintern gegen das 100-ms-Ziel geprüft |
| 6 | vollständiges DE/EN | zentral typisierte Übersetzungen und Vollständigkeitstest `i18n.test.ts`; Browsertest wechselt Sprache |
| 7 | zwei dauerhafte Dichtediagramme | horizontale/vertikale 525-Bin-Renderer, zwei 100-Schritt-Fenster; Unit- und 205-Schritt-Browsertest |
| 8 | SCRAM-Ursachen/Verriegelungen sichtbar | persistente Alarmleiste, Live-Region, übersetzte Ursachen und Ablehnungen; Unit-, Maus- und Tastaturabläufe |
| 9 | statischer Build ohne Netzwerk | `npm run build` erzeugt nur `dist/`; Browsertest prüft alle geladenen Ressourcen auf lokale Herkunft |
| 10 | alle Suiten grün | 98 Vitest- und 24 Playwright-Prüfungen; `npm test`, `npm run build` und `npm run test:e2e`; axe-core prüft Normal- und SCRAM-Zustand einschließlich Kontrast |
| 11 | keine unkommentierten Abweichungen | bekannte Kompatibilitätsbesonderheiten sind direkt implementiert und getestet; reine Renderdrosselung verändert weder Zustand noch Zähler |
| 12 | abweichendes Testmodell | `modelHost.test.ts` nutzt andere Laufzeitsemantik; `renderContract.test.ts` rendert ein 3×2-Raster mit Zellcodes 42/7 |
| 13 | Originalkonstanten/-befehle gekapselt | Fachkonstanten und Befehlsunion liegen in `models/original12`; gemeinsame Runtime liest Raster und Laufperioden aus Metadaten, Renderer aus dem Rendervertrag |

## Dokumentierte technische Abweichungen

Die folgenden Abweichungen verändern keine Fachregel:

- Das Workerprotokoll bündelt Telemetrie, Punktdaten und nur bei geänderter
  Revision auch Raster-/Seriendaten in versionierten `model-state`-Nachrichten,
  statt dafür getrennte Nachrichtentypen zu senden. Der Client verwirft keine
  Versionen und übernimmt unveränderte Ebenen aus dem letzten konsistenten
  Snapshot.
- Transferierte Typed Arrays sind jeweils eigenständige Snapshotkopien. Sie
  beschädigen den Modellpool nicht, werden jedoch nicht über einen
  Rückgabekanal zwischen UI und Worker wiederverwendet. Publikationsrate und
  Arraygrößen sind fest begrenzt; es existiert kein wachsendes Archiv.
- Bei mehr als 2.000 sichtbaren Neutronen zeichnet der Original-UI-Adapter eine
  deterministische gleichmäßige Punktstichprobe. Der Worker berechnet weiterhin
  jedes der bis zu 100.000 Neutronen; Detektor, Histogramme, Reaktionen und
  angezeigte Gesamtzahl verwenden den vollständigen Bestand.
- Wegen der gebündelten `model-state`-Nachricht aktualisiert React in Version 1
  auch Telemetriekomponenten bei einem neuen Partikelbild. Die Rate ist auf
  höchstens 20 Hz und unter Last weiter begrenzt; der echte 100.000er
  Chromium-Test belegt die geforderte Bedienbarkeit. Eine spätere Aufteilung
  kann erfolgen, ohne Modellvertrag oder Physik zu ändern.

## Verifikationsbefehle

```sh
npm test
npm run build
npm run test:e2e
```

Die visuelle Suite vergleicht sechs feste Chromium-Golden-Master:

1. Initialzustand Desktop;
2. teilweise ausgefahrene Steuerstäbe;
3. SCRAM-Alarm;
4. Reflektor und Abbrand;
5. zwei abgeschlossene Diagrammfenster;
6. schmales Mobil-Layout.
