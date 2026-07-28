# NuclearReactor Web

Vollständig clientseitige, browserbasierte Reimplementierung des vereinfachten
Modells aus `NuclearReactor_1_2.exe`. Die fachliche Spezifikation steht in
[`docs/ENTWURF_BROWSERANWENDUNG.md`](docs/ENTWURF_BROWSERANWENDUNG.md), die
Binäranalyse in
[`docs/ANALYSE_NUCLEARREACTOR_1_2.md`](docs/ANALYSE_NUCLEARREACTOR_1_2.md).
Der Nachweis der vollständigen Version 1 steht in
[`docs/V1_ABNAHME.md`](docs/V1_ABNAHME.md).
Lokale Referenzmessungen stehen in
[`docs/PERFORMANCE_V1.md`](docs/PERFORMANCE_V1.md).

Die Anwendung ist kein realistischer Reaktorsimulator und keine Auslegungs-,
Betriebs- oder Sicherheitssoftware für reale Anlagen.

## Entwicklung

Voraussetzungen sind Node.js und npm. Alle JavaScript-Abhängigkeiten werden
lokal im Projekt installiert:

```sh
npm install
npm run dev
```

Der Produktionsbuild besteht ausschließlich aus statischen Dateien:

```sh
npm run build
npm run preview
```

Die Dateien unter `dist/` können von jedem statischen Webserver ausgeliefert
werden. Es gibt keine Serverlogik, Konten, Telemetrie oder Netzwerkzugriffe der
Anwendung.

## Tests

```sh
npm test
npm run test:e2e
npm run test:all
npm run benchmark
```

- Vitest prüft Modellregeln, Grenzwerte, Invarianten, den generischen Model
  Host und den gemeinsamen Rendervertrag in 88 Prüfungen.
- Playwright prüft die Anwendung im echten Chromium einschließlich
  Workerbetrieb, Bedienabläufen, Responsivität und axe-core in 23 Prüfungen.
- Sechs Golden-Master sichern die spezifizierten visuellen Hauptzustände ab.

Die Playwright-Konfiguration verwendet unter Debian das vorhandene
`/usr/bin/chromium`.

## Architektur

- `src/simulation/models/original12/`: eingefrorenes kompatibles Modell
  `original-1.2`
- `src/runtime/`: Worker, Scheduler, Model Host und versioniertes Protokoll
- `src/rendering/`: modellneutrale Raster-, Punkt- und Diagrammrenderer
- `src/components/original12/`: Adapter der Originaldarstellung
- `src/app/`: React-App-Shell und Worker-Client
- `src/i18n/`: vollständige deutsche und englische Texte
