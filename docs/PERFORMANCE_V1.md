# Performance-Referenz Version 1

Stand: 28. Juli 2026

Die Werte sind lokale Referenzen und keine physikalischen Zeitangaben. Ein
Modellschritt bleibt unabhängig von seiner realen Laufzeit eine atomare
fachliche Zeiteinheit.

## Umgebung

- Debian 13, x86-64
- AMD Ryzen AI 9 HX 370, 12 Kerne / 24 Threads
- Node.js 20.19.2
- Chromium 150.0.7871.181

## Reiner Modellkern

Aufruf:

```sh
npm run benchmark
```

Je Größe wurden sieben frisch initialisierte Schritte ausgeführt. Angegeben
ist der Median sowie Minimum/Maximum:

| aktive Neutronen | Median | Minimum | Maximum |
|---:|---:|---:|---:|
| 1.000 | 0,800 ms | 0,114 ms | 2,191 ms |
| 10.000 | 1,118 ms | 1,035 ms | 1,718 ms |
| 100.000 | 8,569 ms | 8,011 ms | 9,163 ms |

Der Benchmark verwendet für reproduzierbare Reaktionspfade einen
`SequenceRandom`. Die reguläre Vitest-Suite prüft zusätzlich Snapshotgröße und
-transfer, In-Place-Kompaktierung, Material-/Punktrasterung sowie 10.000
Histogrammschritte.

## Browser und UI

Die Playwright-Suite startet das echte Originalmodell im Web Worker mit
100.000 aktiven Neutronen. Sie prüft:

- sichtbare Gesamtzahl 100.000;
- laufende vollständige Modellschritte;
- Sprachwechsel und Pause während der Last;
- UI-Rückmeldung innerhalb einer Sekunde;
- browserinterne SCRAM-Rückmeldung innerhalb des 100-ms-Ziels.

Ab 50.000 Neutronen werden neue atomare Schritte und Renderpublikationen mit
mindestens 250 ms Abstand begonnen. Zusätzlich zeigt das Canvas höchstens
2.000 deterministisch gleichmäßig ausgewählte Partikelpunkte. Weder
Modellbestand noch Detektor, Reaktionen oder Histogramme werden ausgedünnt.
