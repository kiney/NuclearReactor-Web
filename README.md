# NuclearReactor Web

> This README starts in English. [Deutsche Fassung weiter unten](#deutsch).

NuclearReactor Web is an interactive, simplified nuclear reactor simulator
that runs entirely in a web browser. Its two-dimensional model visualizes
neutron movement, moderation, fission, power development, and the behavior of
a simplified protection system.

It includes:

- safety rods, control rods, and manual and automatic SCRAM;
- a switchable neutron source, moderating reflector, and burnup;
- moderator drain and multiple detector ranges;
- horizontal and vertical neutron-density plots;
- reproducible runs using explicit random seeds;
- complete English and German user interfaces.

The simulation runs locally in a Web Worker. It has no backend, user accounts,
or telemetry. This is an educational and demonstration model, not a realistic
reactor calculation and not design, operating, or safety software for real
facilities.

## Quick start

Node.js and npm are required to build and serve the application. It has been
tested with Node.js 20.19.

```sh
cd /home/kiney/download/reaktorsimulator/ng
npm install
npm run build
npm run preview
```

Open the address printed in the terminal, normally:

```text
http://localhost:4173/
```

Stop the server with `Ctrl+C`.

Do not open `index.html` directly through a `file://` URL. JavaScript modules
and the simulation worker require an HTTP server.

### Development mode

For source-code development with automatic browser updates:

```sh
npm run dev
```

The development address is normally `http://localhost:5173/`.

React's development build instruments the large simulation arrays and can
therefore be noticeably slow. Always use `npm run build` followed by
`npm run preview` for normal use and performance evaluation.

## Deploying to a web server

The production build consists only of static files. Node.js and an application
server are not required on the destination system.

### Deployment at the domain root

1. Create the build:

   ```sh
   npm ci
   npm run build
   ```

2. Copy the **contents** of `dist/` into a dedicated web root:

   ```sh
   rsync -a --delete dist/ /var/www/nuclear-reactor/
   ```

3. Configure the web server to serve that directory. A minimal nginx
   configuration is:

   ```nginx
   server {
       listen 80;
       server_name reactor.example.org;
       root /var/www/nuclear-reactor;
       index index.html;

       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

4. This minimal configuration serves
   `http://reactor.example.org/`. A public deployment should additionally
   enable TLS in the web server or a reverse proxy and use HTTPS.

Apache, Caddy, nginx, GitHub Pages, and other static hosting services are all
suitable. The server must return `.js` files as JavaScript and `.css` files as
CSS; standard web-server configurations already do so. No single-page
application fallback is needed because the application has no router.

Plain HTTP remains sufficient for local access through `localhost`.

### Deployment below a URL path

If the application is to be served at
`https://example.org/reactor/` instead of the domain root, include that base
path when building:

```sh
npm run build -- --base=/reactor/
rsync -a --delete dist/ /var/www/html/reactor/
```

The leading and trailing slashes in `/reactor/` are significant. Rebuild after
changing the deployment path. A build created without `--base` expects to be
served at `/`.

### Updates and caching

To update a deployment, rebuild and replace the complete contents of `dist/`.
Files in `dist/assets/` have content hashes in their names and may be cached
for a long time. `index.html` should not be cached permanently because each
release points it at the current asset files.

## Tests

```sh
npm test
npm run test:e2e
npm run test:all
npm run benchmark
```

- Vitest covers model rules, boundary values, invariants, the generic model
  host, and the shared rendering contract in 88 tests.
- Playwright covers the real Chromium application, Web Worker operation,
  interaction flows, responsive layouts, and axe-core in 23 tests.
- Six golden-master screenshots cover the specified visual states.

On Debian, the Playwright configuration uses `/usr/bin/chromium`.

## History and provenance

This web model reimplements `NuclearReactor_1_2.exe`, a 32-bit Borland Delphi
educational program written by **Prof. Horst-Michael Prasser** and published
around 2004 by the former **KTG e. V., Sektion Sachsen** at
`www.ktg-sachsen.de`. No source repository or explicit license for the
original program is known.

- [Product and architecture specification](docs/ENTWURF_BROWSERANWENDUNG.md)
- [Analysis of the original executable](docs/ANALYSE_NUCLEARREACTOR_1_2.md)

## License

The original code and documentation of NuclearReactor Web are released under
the [WTFPL](LICENSE).

That license explicitly does **not** cover the committed original executable,
historical screenshots, or any other third-party material. In particular,
`NuclearReactor_1_2.exe` remains under an unknown original license. See
[LICENSE](LICENSE) for the exact scope.

## Architecture

- `src/simulation/models/original12/`: compatible `original-1.2` simulation
  model
- `src/runtime/`: worker, scheduler, model host, and versioned protocol
- `src/rendering/`: model-neutral raster, point, and plot renderers
- `src/components/original12/`: adapter for the model visualization
- `src/app/`: React application shell and worker client
- `src/i18n/`: English and German user-interface texts

---

<a id="deutsch"></a>

# Deutsche Fassung

NuclearReactor Web ist ein interaktiver, vereinfachter Reaktorsimulator, der
vollständig im Browser läuft. In einem zweidimensionalen Modell lassen sich
Neutronenbewegung, Moderation, Spaltungen, Leistungsentwicklung und das
Verhalten eines vereinfachten Schutzsystems beobachten.

Die Anwendung bietet:

- Sicherheits- und Steuerstäbe sowie manuellen und automatischen SCRAM;
- umschaltbare Neutronenquelle, moderierenden Reflektor und Abbrand;
- Moderatorablass und mehrere Detektormessbereiche;
- horizontale und vertikale Neutronendichteverteilungen;
- reproduzierbare Läufe durch vorgebbare Zufalls-Seeds;
- eine vollständige deutsche und englische Oberfläche.

Die Simulation läuft lokal in einem Web Worker. Es gibt kein Backend, keine
Benutzerkonten und keine Telemetrie. Die Anwendung ist ein Lehr- und
Demonstrationsmodell, keine realistische Reaktorberechnung und keine
Auslegungs-, Betriebs- oder Sicherheitssoftware für reale Anlagen.

## Schnellstart

Zum Bauen und Starten werden Node.js und npm benötigt. Getestet wurde mit
Node.js 20.19.

```sh
cd /home/kiney/download/reaktorsimulator/ng
npm install
npm run build
npm run preview
```

Anschließend die im Terminal genannte Adresse öffnen, normalerweise:

```text
http://localhost:4173/
```

Der Server wird mit `Ctrl+C` beendet.

`index.html` darf nicht direkt als `file://` geöffnet werden. JavaScript-Module
und der Simulations-Worker benötigen einen HTTP-Server.

### Entwicklungsmodus

Für Quellcodeänderungen mit automatischer Aktualisierung:

```sh
npm run dev
```

Die Entwicklungsadresse ist normalerweise `http://localhost:5173/`.

Der React-Entwicklungsmodus instrumentiert die großen Simulationsarrays und
kann deshalb deutlich ruckeln. Zur normalen Benutzung und für
Performancebeurteilungen immer `npm run build` und anschließend
`npm run preview` verwenden.

## Deployment auf einem Webserver

Der Produktionsbuild besteht ausschließlich aus statischen Dateien. Auf dem
Zielsystem werden weder Node.js noch ein Anwendungsserver benötigt.

### Bereitstellung im Webroot

1. Den Build erzeugen:

   ```sh
   npm ci
   npm run build
   ```

2. Den **Inhalt** von `dist/` in ein dafür reserviertes Webroot kopieren:

   ```sh
   rsync -a --delete dist/ /var/www/nuclear-reactor/
   ```

3. Den Webserver so konfigurieren, dass dieses Verzeichnis ausgeliefert wird.
   Ein minimales nginx-Beispiel:

   ```nginx
   server {
       listen 80;
       server_name reactor.example.org;
       root /var/www/nuclear-reactor;
       index index.html;

       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

4. Diese Minimal-Konfiguration liefert
   `http://reactor.example.org/` aus. Für eine öffentliche Installation
   sollte zusätzlich TLS im Webserver oder einem vorgeschalteten Reverse Proxy
   eingerichtet und HTTPS verwendet werden.

Apache, Caddy, nginx, GitHub Pages und andere statische Hoster sind
gleichermaßen geeignet. Der Server muss `.js` als JavaScript und `.css` als
CSS ausliefern; bei üblichen Webservern ist das bereits voreingestellt. Eine
SPA-Fallback-Regel ist nicht erforderlich, da die Anwendung keinen Router
verwendet.

Für lokalen Zugriff über `localhost` genügt weiterhin HTTP.

### Bereitstellung in einem Unterverzeichnis

Soll die Anwendung beispielsweise unter
`https://example.org/reaktor/` statt im Webroot liegen, muss dieser Basispfad
beim Build angegeben werden:

```sh
npm run build -- --base=/reaktor/
rsync -a --delete dist/ /var/www/html/reaktor/
```

Der führende und der abschließende Schrägstrich in `/reaktor/` sind wichtig.
Nach einer Änderung des Zielpfads muss neu gebaut werden. Ein ohne `--base`
erzeugter Build erwartet die Anwendung im Webroot `/`.

### Aktualisierung und Caching

Für ein Update erneut bauen und den Inhalt von `dist/` vollständig ersetzen.
Die Dateien unter `dist/assets/` tragen Inhalts-Hashes im Namen und dürfen
langfristig gecacht werden. `index.html` sollte dagegen nicht dauerhaft
gecacht werden, damit es nach einem Update auf die aktuellen Asset-Dateien
verweist.

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

Unter Debian verwendet die Playwright-Konfiguration `/usr/bin/chromium`.

## Geschichte und Herkunft

Dieses Webmodell implementiert `NuclearReactor_1_2.exe` neu, ein
32-Bit-Windows-Lernprogramm in Borland Delphi. Es wurde von
**Prof. Horst-Michael Prasser** geschrieben und um 2004 von der damaligen
**KTG e. V., Sektion Sachsen** unter `www.ktg-sachsen.de` veröffentlicht. Ein
Quellcode-Repository oder eine ausdrückliche Lizenz des Originalprogramms ist
nicht bekannt.

- [Produkt- und Architekturentwurf](docs/ENTWURF_BROWSERANWENDUNG.md)
- [Analyse der ursprünglichen Anwendung](docs/ANALYSE_NUCLEARREACTOR_1_2.md)

## Lizenz

Der eigenständige Code und die Dokumentation von NuclearReactor Web stehen
unter der [WTFPL](LICENSE).

Diese Lizenz gilt ausdrücklich **nicht** für die eingecheckte
Originalprogrammdatei, historische Screenshots oder anderes Material Dritter.
Insbesondere bleibt die Originallizenz von `NuclearReactor_1_2.exe` unbekannt.
Der genaue Geltungsbereich steht in [LICENSE](LICENSE).

## Architektur

- `src/simulation/models/original12/`: kompatibles Simulationsmodell
  `original-1.2`
- `src/runtime/`: Worker, Scheduler, Model Host und versioniertes Protokoll
- `src/rendering/`: modellneutrale Raster-, Punkt- und Diagrammrenderer
- `src/components/original12/`: Adapter der Modelldarstellung
- `src/app/`: React-App-Shell und Worker-Client
- `src/i18n/`: deutsche und englische Texte
