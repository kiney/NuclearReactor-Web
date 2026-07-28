# Produkt- und Architekturentwurf für NuclearReactor Web

Stand: 28. Juli 2026

Status: Arbeitsentwurf 0.1 zur iterativen Schärfung

Grundlage: [`ANALYSE_NUCLEARREACTOR_1_2.md`](./ANALYSE_NUCLEARREACTOR_1_2.md)

## 1. Zweck dieses Dokuments

Dieses Dokument ist die umsetzungsnahe Spezifikation für eine vollständig
clientseitige Browser-Neuimplementierung von `NuclearReactor_1_2.exe`.

Es soll zwei Anforderungen gleichzeitig erfüllen:

1. Der Simulationsalgorithmus und die Bedienlogik bleiben so nah wie sinnvoll
   am rekonstruierten Original.
2. Darstellung, Bedienbarkeit, Barrierefreiheit und technische Struktur
   entsprechen einer modernen Webanwendung.

Der Entwurf ist bewusst genauer als ein übliches Produktkonzept. Ein Coding
Agent soll daraus Komponenten, Zustände, Befehle, Tests und Abnahmekriterien
weitgehend ohne eigene Produktentscheidungen ableiten können.

Dieses Dokument enthält noch keinen Anwendungscode.

### 1.1 Verbindlichkeit

Die Begriffe werden normativ verwendet:

- **MUSS:** für die erste vollständige Version zwingend;
- **SOLL:** nur mit dokumentierter Begründung abweichbar;
- **KANN:** optionale Erweiterung;
- **bewusste Abweichung:** unterscheidet sich absichtlich vom Original;
- **Kompatibilitätsregel:** wird auch dann erhalten, wenn das Modell
  physikalisch vereinfachend oder ungewöhnlich wirkt.

Bei einem Widerspruch gilt folgende Reihenfolge:

1. die fachlichen Regeln und bewussten Entscheidungen dieses Dokuments;
2. die detaillierte Binäranalyse;
3. die Referenzbilder;
4. eine plausible eigene Annahme.

Neue Annahmen müssen im Code als solche kommentiert und in der Analyse oder
diesem Entwurf nachgetragen werden.

## 2. Produktvision

Die Anwendung ist ein interaktives, didaktisches Reaktormodell. Nutzer können
eine vereinfachte neutronenphysikalische Kettenreaktion beobachten, über
Steuer- und Sicherheitsstäbe beeinflussen und Schutzreaktionen auslösen.

Die Neuimplementierung soll sich wie ein modernes wissenschaftliches
Instrument anfühlen:

- die Reaktoransicht steht visuell im Mittelpunkt;
- die wichtigsten Messwerte sind ohne Fensterwechsel gleichzeitig sichtbar;
- sicherheitsrelevante Bedienelemente sind klar priorisiert;
- Ursache und Zustand einer Abschaltung sind eindeutig;
- Diagramme laufen dauerhaft mit, sofern die Leistung des Geräts dies
  zulässt;
- die Simulation ist durch einen sichtbaren Seed reproduzierbar;
- die Oberfläche erklärt sich durch Beschriftungen, Legende und kurze
  Hilfetexte, ohne den Bildschirm zu überladen.

Die Anwendung ist kein realistischer Reaktorsimulator und darf nicht als
Auslegungs-, Betriebs- oder Sicherheitssoftware für reale Anlagen dargestellt
werden.

## 3. Leitprinzipien

### 3.1 Fachliche Nähe vor physikalischer Verbesserung

Die bekannten Wahrscheinlichkeiten, Rastergrenzen, Schrittfolgen und
Schutzschwellen werden nicht „realistischer“ gemacht. Das Ziel ist eine
Reimplementierung des vorhandenen Modells, kein neues Kernphysikmodell.

### 3.2 Simulationskern und Oberfläche sind strikt getrennt

Der Kern kennt weder React noch Canvas, DOM, Sprache oder CSS. Er erhält
Befehle, führt diskrete Schritte aus und liefert Zustände sowie Ereignisse.

### 3.3 Ein Simulationsschritt ist die fachliche Zeiteinheit

Normalbetrieb bedeutet nominal ein Schritt alle 20 ms, Zeitlupe ein Schritt
alle 100 ms. Wahrscheinlichkeiten werden pro Schritt und nicht pro real
vergangener Sekunde ausgewertet.

### 3.4 Reproduzierbarkeit ist ein Produktmerkmal

Jeder Lauf besitzt einen 32-Bit-Seed. Reset mit demselben Seed und derselben
Befehlsfolge muss denselben fachlichen Zustand erzeugen.

### 3.5 Moderne Darstellung darf die Physik nicht verändern

Hochauflösende Canvas-Ausgabe, permanente Histogramme, zusätzliche
Beschriftungen und abgeleitete Kennzahlen sind Beobachter. Sie dürfen keine
zusätzlichen Zufallszahlen verbrauchen und den Simulationszustand nicht
beeinflussen.

### 3.6 Bedienbarkeit unter Last

Die Simulation läuft in einem Web Worker. Selbst bei vielen Neutronen müssen
SCRAM, Pause und andere Eingaben auf der Oberfläche direkt reagieren. Wird
die Rechenlast zu hoch, darf die fachliche Simulationszeit wie beim Original
langsamer laufen; die UI darf nicht blockieren.

## 4. Umfang der ersten vollständigen Version

### 4.1 Pflichtumfang

| Bereich | Funktionsumfang |
|---|---|
| Simulation | 525 × 525 Raster, Kerngeometrie, Moderator, Spaltstoff, Absorber, Umgebung und Quelle |
| Neutronen | schnelle und langsame Neutronen, Bewegung, Streuung, Moderation, Absorption und Spaltung |
| Zufall | kompatibler Delphi-LCG, frei angebbarer 32-Bit-Seed |
| Reaktorsteuerung | Steuerstäbe in Originalschritten, Sicherheitsstäbe, manueller und automatischer SCRAM |
| Optionen | Quelle, Reflektor, Moderatorablass, Abbrand, Normalbetrieb und Zeitlupe |
| Instrumente | Neutronendetektor mit vier Messbereichen, Leistungsanzeige und Spaltungsanzeigen |
| Diagramme | horizontale und vertikale Dichteverteilung, schnelle und langsame Neutronen, Vergleich zweier Messfenster |
| Laufsteuerung | Start/Fortsetzen, Pause, Einzelschritt und Reset |
| Sprache | vollständige deutsche und englische Oberfläche |
| Darstellung | hochauflösendes, responsives Canvas mit Legende und klaren Statusanzeigen |
| Qualität | automatisierte Unit-, Integrations-, Browser- und Barrierefreiheitstests |
| Auslieferung | statische Dateien ohne Serverlogik, Konten, Tracking oder Netzwerkpflicht |

### 4.2 Moderne Ergänzungen gegenüber dem Original

Diese Funktionen sind Teil der ersten Version, obwohl sie das Original nicht
oder nicht in dieser Form besitzt:

- Pause und Einzelschritt;
- Reset mit gleichem oder neuem Seed;
- sichtbarer und kopierbarer Seed;
- automatische, dauerhaft sichtbare Dichteverteilungen;
- numerische Messwerte zusätzlich zu Balkenanzeigen;
- getrennte Anzeige von „Spaltungen in diesem Schritt“ und „Spaltungen seit
  Start“;
- Ereignis-/Alarmleiste mit letzter Abschaltursache;
- responsive Anordnung ohne separate Diagrammfenster;
- Browser-Sprachauswahl und Speicherung reiner UI-Präferenzen;
- hochauflösende Darstellung entsprechend `devicePixelRatio`;
- klarer Status für „läuft“, „pausiert“, „Zeitlupe“ und „ausgelöst“.

### 4.3 Bewusst nicht im ersten Umfang

- thermohydraulisches Modell, Temperaturen, Dampf oder Turbine;
- realistische Einheiten oder Kalibrierung auf eine reale Anlage;
- Änderung der Originalwahrscheinlichkeiten über die GUI;
- dreidimensionale Darstellung;
- Mehrbenutzerbetrieb, Konten, Cloudspeicherung oder Backend;
- Speicherung und Wiederaufnahme eines vollständigen Simulationszustands;
- frei editierbare Kerngeometrien;
- Telemetrie, Werbung oder externe Webdienste;
- pixelgenaue Nachbildung der alten Delphi/VCL-Oberfläche;
- zwingende PWA-/Offline-Installation; ein statisch ausgelieferter Build ist
  jedoch nach dem ersten Laden ohne Serverberechnungen funktionsfähig.

## 5. Kompatibilitätspolitik

### 5.1 Zu erhaltende Besonderheiten

Die folgenden Eigenschaften wirken teilweise ungewöhnlich, sind aber
Bestandteil des rekonstruierten Modells und MÜSSEN erhalten bleiben:

| Besonderheit | Entscheidung |
|---|---|
| Streuvektor schneller Neutronen im Material wird nicht normiert | exakt erhalten |
| Reflektor verwendet denselben Zelltyp und dieselbe Physik wie Moderator | exakt erhalten |
| Abbrand-Option schaltet zugleich Brennstofferschöpfung und Darstellung ein | exakt erhalten |
| Leistung ist ein geglätteter Aktivitätsindikator, keine thermische Leistung | exakt erhalten |
| Detektor zählt den Bestand zu Beginn eines Schritts | exakt erhalten |
| Schutzgrenzen verwenden `> 90`, `< 3` und `> 120`, nicht inklusive Grenzen | exakt erhalten |
| Unterbereichs-SCRAM ist im Messbereich 100 deaktiviert | exakt erhalten |
| Histogramme sammeln in einem 99 Zellen breiten Mittelband | exakt erhalten |
| Hintergrundquelle wird mit 1 % Wahrscheinlichkeit pro Schritt ausgewertet | exakt erhalten |
| maximal 100.000 Neutronen | exakt erhalten |

### 5.2 Nicht nachzubauende Altfehler

| Altverhalten | Neues Verhalten |
|---|---|
| „Spaltungen gesamt“ zeigt tatsächlich nur den aktuellen Schritt | klare getrennte Werte für aktuellen Schritt und gesamten Lauf |
| Quelle wird nach einer Stabaktion teilweise nur als 5 × 5 statt 8 × 8 gezeichnet | Quelle bleibt konsistent 8 × 8 |
| internes, anschließend unbenutztes Laststufenfeld 1/4/20 | entfällt |
| unerreichbarer Zweig für Detektormaximum unter 100 | entfällt |
| Diagramme benötigen separate alte Fenster und manuelles erneutes Starten | permanent integrierte automatische Messfenster |
| Sprachknopf zeigt nur die Zielsprache | üblicher Sprachwähler mit sichtbarer aktueller Sprache |

### 5.3 Noch nicht dynamisch bestätigte Detailfälle

Für die erste Implementierung gelten die folgenden Festlegungen. Ergibt eine
spätere dynamische Analyse des Originals etwas anderes, wird bewusst
entschieden, ob die Kompatibilität den Mehraufwand rechtfertigt.

- Koordinaten positiver Neutronen werden für den Zellzugriff nach unten
  abgerundet. Das entspricht bei positiven Werten Delphis Abschneiden in
  Richtung null.
- Neue Neutronen werden bei fast vollem Pool einzeln angelegt. Sind nur noch
  ein oder zwei Plätze frei, kann eine Spaltung entsprechend nur ein oder zwei
  neue Neutronen eintragen. Das auslösende Neutron bleibt deaktiviert.
- Die sichtbare Quellenfläche ist bei eingeschalteter Quelle immer Typ 5 und
  überlagert die darunterliegende Materialdarstellung. Beim Ausschalten wird
  die zu diesem Zeitpunkt fachlich gültige Stab-/Moderatorgeometrie
  wiederhergestellt.
- Moderatorablass setzt vorhandenen Moderator einschließlich eines aktiven
  Reflektors auf leer und setzt den Reflektor-Schalter auf aus. Ein später
  erneut aktivierter Reflektor darf wieder Moderator im Rand eintragen.
- Bereits vorhandene Abbrandzähler bleiben beim Ausschalten der
  Abbrand-Option erhalten. Solange die Option aus ist, steigen sie nicht und
  Brennstoff wird in seiner Grundfarbe dargestellt. Beim Wiedereinschalten
  werden die vorhandenen Werte wieder wirksam und sichtbar.

## 6. Fachliches Modell

### 6.1 Zentrale Konstanten

Alle Konstanten stehen in genau einem fachlichen Modul und werden von
Produktion und Tests importiert. Zahlenliterale mit derselben Bedeutung dürfen
nicht über den Code verteilt werden.

| Konstante | Wert |
|---|---:|
| Rasterbreite/-höhe | 525 |
| sichtbare Rasterkoordinaten | 0 … 524 |
| zulässige Bewegungskoordinaten | 0 ≤ x < 524 und 0 ≤ y < 524 |
| Kernkoordinaten | 64 … 460 einschließlich |
| Kernbreite/-höhe | 397 |
| maximale Neutronenzahl | 100.000 |
| Geschwindigkeit neu erzeugter Neutronen | 5 |
| normale Schrittperiode | 20 ms |
| Zeitlupenperiode | 100 ms |
| Steuerstabende vollständig eingefahren | 461 |
| Steuerstabende vollständig ausgefahren | 64 |
| reguläre Stabbewegung | 5 Zellen, am Ende geklemmt |
| Quelle | x 260 … 267, y 438 … 445 |
| Quellenemission | 50 % pro Schritt, wenn eingeschaltet |
| Hintergrundemission | 1 % pro Schritt |
| Quellstartpunkt | (263, 441) |
| Histogramm-Mittelband | 213 … 311 einschließlich |
| Histogrammlänge | 525 Bins |
| Histogramm-Messfenster | 100 Schritte |
| kleinster Diagrammnormalisierer | 1 |

### 6.2 Zelltypen

Die Materialmatrix ist ein `Uint8Array` mit `525 × 525` Einträgen in
zeilenweiser Reihenfolge:

```text
index = y × 525 + x
```

| Code | Bedeutung | Verhalten |
|---:|---|---|
| 0 | leere Umgebung | keine Reaktion |
| 1 | Moderator | Moderation und geringe Absorption |
| 2 | Spaltstoff | Spaltung/Absorption langsamer Neutronen |
| 3 | Absorberstab | vollständige Absorption langsam, teilweise schnell |
| 4 | nur historischer Abbrand-Farbzielwert | kein eigener Materialzustand im neuen Kern |
| 5 | Neutronenquelle | keine Materialreaktion, Emission separat |

Typ 4 wird nicht als Materialzelle benötigt. Der lokale Abbrand bleibt ein
separater Zähler; die Farbe wird daraus berechnet.

### 6.3 Ausgangsgeometrie

Außerhalb des Kerns ist das Raster leer. Innerhalb `64 … 460` hängt der
Ausgangstyp von `x mod 32` ab:

| Rest | Typ |
|---|---|
| 0 … 5 | Moderator |
| 6 … 9 | Absorber |
| 10 … 15 | Moderator |
| 16 … 31 | Spaltstoff |

Der vollständig eingefahrene Ausgangszustand enthält:

- 192 Spaltstoffspalten;
- 153 Moderatorspalten;
- 52 Absorberspalten.

### 6.4 Stabgruppen

Die 13 je vier Zellen breiten Absorberstreifen wechseln sich ab:

| Gruppe | Start-x der Streifen |
|---|---|
| Sicherheitsstäbe, 7 Streifen | 70, 134, 198, 262, 326, 390, 454 |
| Steuerstäbe, 6 Streifen | 102, 166, 230, 294, 358, 422 |

Jeder Startwert umfasst vier Spalten, beispielsweise 70 … 73.

Für Steuerstäbe gilt:

```text
Absorber in 64 ≤ y < Stabende
Ersatzmaterial in Stabende ≤ y ≤ 460
Ausfahrposition = (461 - Stabende) / 397 × 100 %
```

Zulässige, durch Bedienung erreichbare Stabenden beginnen bei 461 und laufen
in Fünferschritten nach oben bis 66; der letzte Schritt wird auf 64 geklemmt.
Die Gegenrichtung verhält sich symmetrisch und wird bei 461 geklemmt.

Das Ersatzmaterial ist anfangs Moderator. Nach Moderatorablass ist es leer.

Sicherheitsstäbe besitzen nur die Zustände `eingefahren` und `ausgefahren`.
Beim Ausfahren wird ihre gesamte Kernfläche durch das aktuelle Ersatzmaterial
ersetzt. Beim Einfahren wird sie vollständig zu Absorber.

### 6.5 Initialzustand

| Feld | Startwert |
|---|---|
| Lebenszyklus | läuft nach abgeschlossener Initialisierung automatisch |
| Seed | zufällig erzeugter, in der UI sichtbarer 32-Bit-Wert |
| Simulationsschritt | 0 |
| Neutronen | 2 aktive schnelle Neutronen |
| Steuerstabende | 461 |
| Sicherheitsstäbe | eingefahren |
| Sicherheitskreis | nicht scharf, nicht ausgelöst |
| Quelle | aus |
| Reflektor | aus |
| Moderator | vorhanden |
| Ersatzmaterial in Stabkanälen | Moderator |
| Abbrand | aus |
| Abbrandzähler | überall 0 |
| Detektormessbereich | Index 2, Maximum 100 |
| Detektorfortschritt | Zahl der zwei Startneutronen beim ersten Schritt |
| Leistung | 0 |
| Spaltungen aktueller Schritt | 0 |
| Spaltungen gesamter Lauf | 0 |
| Geschwindigkeit | normal, 20 ms |
| Histogramme | leer, erste 100-Schritt-Messung aktiv |

Die Sprache ist reine UI-Präferenz. Beim ersten Besuch wird Deutsch gewählt,
wenn die Browsersprache mit `de` beginnt, sonst Englisch. Danach gilt die
lokal gespeicherte Auswahl.

### 6.6 Zufallszahlengenerator

Der Produktivkern MUSS den 32-Bit-LCG des Originals verwenden:

```text
seed_neu = (seed_alt × 0x08088405 + 1) mod 2³²
random   = seed_neu / 2³²
```

Anforderungen:

- Multiplikation und Addition verwenden expliziten 32-Bit-Überlauf.
- `random` liegt in `[0, 1)`.
- Der Simulationskern erhält den Generator über eine kleine Schnittstelle.
- Produktion verwendet den LCG; Unit-Tests dürfen einen Generator mit
  vorgegebener Zahlenfolge injizieren.
- Rendering, Übersetzungen und UI dürfen niemals Zufallszahlen aus diesem
  Generator anfordern.

Referenzfolge ab Seed 1:

| Aufruf | neuer Zustand hex | Zufallswert ungefähr |
|---:|---:|---:|
| 1 | `0x08088406` | 0,031379939522594213 |
| 2 | `0xDC6DAC1F` | 0,8610484672244638 |
| 3 | `0x33DC589C` | 0,20258096512407064 |
| 4 | `0x45DE2B0D` | 0,2729212671983987 |
| 5 | `0xABF18B42` | 0,6716544185765088 |

### 6.7 Neutronenspeicher

Ein Neutron besitzt fachlich:

- Position `x`, `y` als 32-Bit-Fließkommazahl;
- Richtung/Geschwindigkeit `dx`, `dy` als 32-Bit-Fließkommazahl;
- Kennzeichen `schnell`;
- Kennzeichen `aktiv` während eines Schritts.

Die Implementierung SOLL vorallokierte strukturparallele Typed Arrays
verwenden:

- vier `Float32Array` für Position und Richtung;
- je ein `Uint8Array` für schnell/aktiv;
- ein ganzzahliges Feld `count`.

Nach jedem Schritt werden aktive Einträge stabil nach vorn komprimiert. Stabil
bedeutet, dass ihre relative Reihenfolge erhalten bleibt. Das ist für die
reproduzierbare Reihenfolge späterer Zufallsaufrufe relevant.

Neu erzeugte Neutronen werden am Ende des aktuell belegten Bereichs angefügt.
Sie werden im laufenden Schritt nicht noch einmal bewegt oder einer weiteren
Materialreaktion unterzogen.

### 6.8 Erzeugung und Richtung

Beim Start werden zwei schnelle Neutronen angelegt:

- `x = random × 524`;
- `y = random × 524`;
- zwei weitere Zufallswerte erzeugen `rx = random - 0,5` und
  `ry = random - 0,5`;
- der Vektor wird auf Länge 5 normiert.

Jedes durch Spaltung oder Quelle neu erzeugte schnelle Neutron erhält auf
dieselbe Weise eine unabhängig gezogene, auf Länge 5 normierte Richtung.

Die sichtbare Quelle erzeugt bei Erfolg am festen Punkt `(263, 441)`, die
Hintergrundquelle an einer neuen gleichverteilten Position im Bereich
`[0, 524) × [0, 524)`.

### 6.9 Reihenfolge eines Simulationsschritts

Diese Reihenfolge ist verbindlich, weil eine andere Reihenfolge sichtbare und
deterministische Ergebnisse verändert:

1. Befehle, die seit dem letzten Schritt eingegangen sind, werden in
   Eingangsreihenfolge angewendet.
2. `fissionsThisStep` und der Leistungsaktivitätszähler `K` werden auf 0
   gesetzt.
3. `countAtStepStart` wird festgehalten. Nur diese Neutronen werden in diesem
   Schritt durchlaufen.
4. Für jedes dieser Neutronen in stabiler Indexreihenfolge:
   1. wird es für horizontale und vertikale Dichtehistogramme gezählt;
   2. erhält ein schnelles Neutron in einer nichtleeren aktuellen Zelle einen
      neuen, **nicht normierten** Streuvektor mit beiden Komponenten in
      `[-2, 2)`;
   3. wird die Position um `dx`, `dy` verschoben;
   4. wird es beim Verlassen des zulässigen Bewegungsbereichs deaktiviert.
5. Der Detektor wird aus `countAtStepStart` aktualisiert.
6. Detektorschutzgrenzen werden geprüft; ein Treffer kann SCRAM auslösen.
7. Für jedes der unter Punkt 3 vorhandenen und noch aktiven Neutronen werden
   die Materialreaktionen an der neuen Position ausgeführt.
8. Die eingeschaltete Quelle wird mit 50 % Wahrscheinlichkeit geprüft.
9. Unabhängig davon wird die Hintergrundquelle mit 1 % Wahrscheinlichkeit
   geprüft.
10. Inaktive Neutronen werden stabil komprimiert.
11. Die Leistung wird aus `K` geglättet.
12. Die Leistungsgrenze wird geprüft; sofern der Sicherheitskreis noch scharf
    ist, kann sie SCRAM auslösen.
13. Histogrammfenster und abgeleitete, rein beobachtende Kennzahlen werden
    aktualisiert.
14. Der Schrittzähler wird um 1 erhöht und ein konsistenter Snapshot kann
    veröffentlicht werden.

Ein bereits in diesem Schritt erfolgter SCRAM gewinnt. Eine spätere Prüfung
darf die zuerst erfasste Abschaltursache nicht überschreiben.

### 6.10 Bewegung und Streuung

Position:

```text
x_neu = x_alt + dx
y_neu = y_alt + dy
```

Verlässt ein Neutron den Bereich `0 ≤ x < 524` oder `0 ≤ y < 524`, wird es
deaktiviert und erhält in diesem Schritt keine Materialreaktion mehr.

Schnelle Neutronen in einer nichtleeren Zelle werden vor der Bewegung
gestreut:

```text
dx = 4 × random - 2
dy = 4 × random - 2
```

Der Streuvektor wird absichtlich nicht normalisiert.

### 6.11 Materialreaktionen

Alle Vergleiche verwenden einen neuen gleichverteilten Zufallswert je
angegebener Prüfung.

#### Moderator, Typ 1

1. Ist das Neutron beim Eintritt in die Reaktion schnell, wird es mit
   `random < 0,05` langsam. Für ein bereits langsames Neutron entfällt dieser
   erste Zufallsaufruf.
2. Danach wird jedes Neutron unabhängig von seiner Geschwindigkeit mit
   `random < 0,003` absorbiert.

Die Absorptionsprüfung findet damit auch für bereits langsame Neutronen und
nach einer gerade erfolgreichen Moderation statt.

#### Spaltstoff, Typ 2

Nur langsame Neutronen reagieren. Der lokale Abbrandzähler `b` liegt in
`0 … 10`.

```text
p_spaltung  = 0,002 × (10 - b)
p_absorption = 0,0005 × b
```

Bei erfolgreicher Spaltung:

- wird das eintreffende Neutron deaktiviert;
- werden bis zu drei schnelle Neutronen am gleichen Ort angelegt;
- erhält jedes eine eigene normierte Zufallsrichtung der Länge 5;
- steigen `fissionsThisStep` und `fissionsTotal` um 1;
- wird der Spaltort in den zutreffenden Histogramm-Hilfsarrays gezählt;
- steigt `b` genau dann um 1, wenn Abbrand eingeschaltet und `b < 10` ist.

Nur wenn keine Spaltung stattgefunden hat, folgt die
Absorptionswahrscheinlichkeit. Bei erfolgreicher Absorption wird das Neutron
deaktiviert.

`K` steigt für jedes langsame Neutron, das in diesem Schritt eine
Spaltstoffzelle zur Reaktion erreicht, unabhängig davon, ob anschließend eine
Spaltung oder Absorption erfolgt.

#### Absorber, Typ 3

- langsame Neutronen werden immer absorbiert;
- schnelle Neutronen werden mit `random < 0,2` absorbiert.

#### Leer und Quelle, Typ 0/5

Keine Materialreaktion.

### 6.12 Quelle und Hintergrundstrahlung

Ist die Quelle eingeschaltet, wird pro Schritt genau ein Erfolgstest
`random < 0,5` ausgeführt. Bei Erfolg und freiem Poolplatz entsteht ein
schnelles Neutron an `(263, 441)`.

Danach wird immer und unabhängig ein Test `random < 0,01` für ein
Hintergrundneutron ausgeführt. Nur bei Erfolg werden dessen Position und
Richtung ausgewürfelt.

Ist der Pool voll, wird kein Eintrag über das Limit hinaus geschrieben. Der
Versuch wird als Sättigungszähler in der Diagnostik erfasst, verändert aber
keine fachliche Anzeige des Originals.

### 6.13 Leistungsmodell

Nach den Reaktionen gilt:

```text
powerNew = 0,9 × powerOld + 0,01 × K
```

Die UI zeigt:

- den numerischen Wert mit einer Nachkommastelle;
- den Normalbereich 0 … 100;
- einen deutlich markierten Überlastbereich 100 … 120;
- Werte über 120 weiterhin numerisch, auch wenn der Balken visuell am Ende
  geklemmt wird.

Die Anzeige nennt den Wert „Leistungsindikator“, im knappen Instrumentenlabel
darf weiterhin „Leistung“ stehen. Es wird keine physikalische Einheit
erfunden.

### 6.14 Detektor

Messbereichsindex und Maximum:

| Index | Maximum | Anzeige |
|---:|---:|---|
| 2 | 100 | 10² |
| 3 | 1.000 | 10³ |
| 4 | 10.000 | 10⁴ |
| 5 | 100.000 | 10⁵ |

Der Nutzer kann nur zum jeweils benachbarten Bereich wechseln. An den Grenzen
ist die entsprechende Schaltfläche deaktiviert.

```text
clampedCount = min(countAtStepStart, rangeMaximum)
detectorPercent = trunc(100 × clampedCount / rangeMaximum)
```

Farbzustand:

- bei `detectorPercent > 80` wird der Instrumentzustand rot;
- bei `detectorPercent < 80` wird er neutral;
- bei exakt 80 bleibt der vorherige Farbenzustand bestehen.

Dieser ungewöhnliche Zustand bei exakt 80 wird getestet und erhalten.

### 6.15 Sicherheitskreis und SCRAM

#### Zustände

| Zustand | Bedeutung |
|---|---|
| `inserted` | Sicherheitsstäbe eingefahren, Schutzkreis nicht scharf |
| `armed` | Sicherheitsstäbe ausgefahren, automatische Schutzlogik aktiv |
| `tripped` | SCRAM ausgelöst, alle Stäbe eingefahren, Ursache gespeichert |

Ein erfolgreiches erneutes Ausfahren der Sicherheitsstäbe wechselt von
`inserted` oder `tripped` nach `armed` und quittiert die alte rote
Auslöseanzeige. Die letzte Ursache bleibt im Ereignisprotokoll erhalten.

#### Sicherheitsstäbe ausfahren

Zulässig nur, wenn:

- der Messbereich 100 beträgt;
- die Stäbe noch nicht ausgefahren sind.

Bei Ablehnung bleibt der Zustand unverändert. Die UI erklärt:
„Sicherheitsstäbe können nur im Messbereich 10² ausgefahren werden.“

#### Steuerstäbe

- Ausfahren ist nur in Zustand `armed` erlaubt.
- Einfahren ist jederzeit erlaubt.
- Jede einzelne Aktion verschiebt das Stabende um 5 Zellen mit Klemmung an
  64/461.
- Die UI darf Tastendruck-Wiederholung anbieten, muss aber intern dieselben
  diskreten Befehle senden.

#### Manuelles SCRAM

Der SCRAM-Befehl ist immer verfügbar und:

- setzt das Steuerstabende sofort auf 461;
- fährt die Sicherheitsstäbe vollständig ein;
- schreibt alle Stabgruppen als Absorber in den Kern;
- setzt den Sicherheitskreis auf `tripped`;
- speichert die Ursache `manual`.

#### Automatisches SCRAM

Nur im Zustand `armed` wird ausgelöst, wenn eine der Bedingungen exakt gilt:

```text
detectorPercent > 90
oder
(detectorPercent < 3 und rangeMaximum > 100)
oder
power > 120
```

Ursachen:

- `detector-high`;
- `detector-low-range`;
- `power-high`.

Detektorursachen werden vor Materialreaktionen geprüft, die Leistungsursache
danach. Die zuerst auslösende Ursache eines Schritts bleibt erhalten.

### 6.16 Reflektor

Aktivieren füllt den 64 Zellen breiten Außenrand um den Kern mit Typ 1.
Deaktivieren setzt diesen Rand auf Typ 0. Der Kern selbst bleibt unberührt.
Der Außenrand umfasst exakt jede Rasterzelle, für die `x < 64`, `x > 460`,
`y < 64` oder `y > 460` gilt, einschließlich der vier Eckbereiche.

Der Reflektor verwendet damit absichtlich dieselbe Reaktion wie Moderator.
Die UI darf ihn didaktisch als „moderierenden Reflektor“ erläutern, aber keine
abweichende Physik vortäuschen.

### 6.17 Moderatorablass

Moderatorablass ist innerhalb eines Laufs irreversibel:

- alle aktuell vorhandenen Typ-1-Zellen werden zu Typ 0;
- das Ersatzmaterial freigelegter Stabkanäle wird Typ 0;
- ein eingeschalteter Reflektor wird ausgeschaltet;
- Spaltstoff, Absorber, Quelle und Neutronen bleiben unverändert.

Nur Reset stellt den ursprünglichen Moderator wieder her. Weil die Aktion
folgenreich ist, verlangt die UI eine kurze Bestätigung. Die Bestätigung ist
eine UI-Funktion und verändert nicht die fachliche Befehlssemantik.

### 6.18 Abbrand

Das Abbrandraster ist ein `Uint8Array(525 × 525)`. Nur Brennstoffzellen
verwenden seine Werte.

- Wertebereich 0 … 10;
- Erhöhung nur bei erfolgreicher Spaltung und eingeschalteter Option;
- keine automatische Erholung;
- Reset setzt alle Werte auf 0;
- Ausschalten pausiert die Entwicklung, löscht aber nichts.

Die sichtbare Brennstofffarbe interpoliert in zehn diskreten Stufen von der
Grundfarbe bis Dunkelgrün. Die Berechnung der Farbe beeinflusst die Simulation
nicht.

### 6.19 Dichteverteilungen

Beide Diagramme werden dauerhaft und ohne zusätzliche Zufallsaufrufe
gesammelt.

#### Horizontale Verteilung

Neutronen mit `213 ≤ y ≤ 311` werden vor ihrer Bewegung nach ihrer
x-Koordinate in 525 Bins gezählt.

#### Vertikale Verteilung

Neutronen mit `213 ≤ x ≤ 311` werden vor ihrer Bewegung nach ihrer
y-Koordinate in 525 Bins gezählt.

Für beide Richtungen existieren getrennte Arrays:

- schnelle Neutronen;
- langsame Neutronen;
- Spaltorte.

Ein Messfenster umfasst exakt 100 Simulationsschritte. Danach:

1. wird das gemeinsame Maximum der schnellen und langsamen Neutronenarrays
   ermittelt, Startwert 1;
2. werden beide Neutronenkurven durch dieses Maximum normalisiert;
3. wird das zuletzt abgeschlossene Fenster zum Vergleichsfenster;
4. wird das neue Fenster als aktuelle abgeschlossene Messung gespeichert;
5. beginnen leere Arbeitsarrays für die nächsten 100 Schritte.

Jedes abgeschlossene Fenster behält seine beim Abschluss berechnete
Normierung. Die blasse Vergleichskurve wird nicht nachträglich mit dem Maximum
des neueren Fensters umskaliert. Das entspricht dem Überzeichnen der bereits
normalisierten Vorgängerkurve im Original.

Die Diagramme zeigen:

- die zuletzt abgeschlossene Messung kräftig;
- die davor abgeschlossene Messung blass;
- den Fortschritt des laufenden Fensters als „n/100 Schritte“.

Das noch nicht abgeschlossene Arbeitsfenster wird nicht als Kurve gezeichnet.
So springen die Kurven nur alle 100 Schritte und bleiben ruhig lesbar.

Schnelle und langsame Neutronen sind standardmäßig sichtbar. Die bereits
gesammelten Spaltorte KÖNNEN über eine Legendenoption als dritte Kurve
eingeblendet werden. Diese Einblendung ist eine moderne Ergänzung und
standardmäßig aus.

„Messung zurücksetzen“ leert ausschließlich Arbeits-, aktuelle und vorherige
Histogramme. Es verändert weder Neutronen noch RNG, Leistung oder
Simulationsschritt.

## 7. Befehlsmodell

Alle fachlichen Änderungen erfolgen über benannte Befehle. UI-Komponenten
schreiben niemals direkt in den Simulationszustand.

| Befehl | Parameter | Wirkung |
|---|---|---|
| `start` | – | Scheduler starten |
| `pause` | – | Scheduler stoppen, Zustand erhalten |
| `step-once` | – | genau einen Schritt im pausierten Zustand ausführen |
| `reset` | Seed | vollständigen Initialzustand mit Seed erzeugen |
| `set-speed` | normal/slow | Sollperiode 20/100 ms |
| `move-control-rods` | in/out | einen diskreten Stabschritt ausführen |
| `withdraw-safety-rods` | – | nach Vorbedingung auf `armed` wechseln |
| `scram` | – | manuellen SCRAM auslösen |
| `set-source` | an/aus | Quellenfläche und Emissionsmechanismus schalten |
| `set-reflector` | an/aus | Randmaterial schalten |
| `drain-moderator` | – | Moderator dauerhaft für diesen Lauf entfernen |
| `set-burnout` | an/aus | Abbrandentwicklung/-anzeige schalten |
| `change-range` | higher/lower | benachbarten Messbereich wählen |
| `reset-histograms` | – | nur Diagrammmessungen löschen |

Jeder Befehl erhält eine vom UI erzeugte laufende `commandId`. Der Worker
antwortet mit:

- `accepted`, optional mit aktualisiertem Zustand;
- oder `rejected` mit einem stabilen maschinenlesbaren Grund.

Ablehnungsgründe werden zentral übersetzt. Erwartete Ablehnungen sind keine
JavaScript-Fehler.

## 8. GUI-Konzept

### 8.1 Informationshierarchie

Die Oberfläche besteht aus fünf Ebenen:

1. Laufstatus und globale Aktionen;
2. Reaktoransicht;
3. Detektor, Leistung und Schutzstatus;
4. Bedienung von Stäben, Quelle und Reaktoroptionen;
5. dauerhaft sichtbare Messdiagramme und Diagnostik.

SCRAM, Alarmursache und Schutzstatus müssen unabhängig von Scrollposition und
Fensterbreite schnell erreichbar beziehungsweise sichtbar sein.

### 8.2 Desktop-Layout

Zielgröße ist ein Laptop-/Desktopfenster ab etwa 1200 CSS-Pixel Breite:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ NuclearReactor Web   ● Läuft · Schritt 12 450   Pause  Reset   DE ▾     │
├──────────────────────────────────────────────────────────────────────────┤
│ Alarm-/Hinweisleiste: Sicherheitskreis scharf / letzte Ursache           │
├────────────────────────────────────────────┬─────────────────────────────┤
│                                            │ Detektor       Leistung     │
│              Reaktor-Canvas                │ [  34 %  ]     [  87,2 ]   │
│              quadratisch                   ├─────────────────────────────┤
│                                            │ Sicherheitskreis   [SCRAM]  │
│  Legende und optionale Messbandanzeige     │ Steuerstäbe  44,1 %  ↑ ↓   │
│                                            │ Sicherheitsstäbe [Ausfahren]│
│                                            │ Quelle [Aus]  Reflektor [ ] │
│                                            │ Abbrand [ ]   Moderator ... │
├────────────────────────────────────────────┴─────────────────────────────┤
│ Dichteverteilung horizontal        │ Dichteverteilung vertikal           │
│ [525 Bins, schnell/langsam]         │ [525 Bins, schnell/langsam]         │
├────────────────────────────────────┴─────────────────────────────────────┤
│ Spaltungen/Schritt · Gesamt · Seed · Rechenzeit · Histogrammfortschritt  │
└──────────────────────────────────────────────────────────────────────────┘
```

Die rechte Bedienkonsole darf beim Scrollen innerhalb eines großen
Desktopfensters kleben bleiben. Die Reaktoransicht und Diagramme dürfen nicht
von schwebenden Dialogen verdeckt werden.

### 8.3 Mittlere und kleine Fenster

| Breite | Anordnung |
|---|---|
| ≥ 1200 px | Reaktor links, Instrumente/Bedienung rechts, Diagramme darunter |
| 760 … 1199 px | Reaktor oben, Instrumente als zweispaltiges Raster darunter, Diagramme untereinander |
| < 760 px | einspaltig; kompakte Kopfzeile; SCRAM als dauerhaft sichtbare Aktion; Diagramme horizontal scrollbar oder mit voller Breite untereinander |

Die Anwendung bleibt auf einem Smartphone bedienbar, wird aber für
Laptop/Tablet optimiert. Das Reaktor-Canvas darf nie breiter als sein
Container werden und behält ein Seitenverhältnis von 1:1.

### 8.4 Kopfzeile

Enthält:

- Produktname;
- Laufstatus mit Text und Symbol;
- Start/Pause als umschaltende Primäraktion;
- Einzelschritt nur im pausierten Zustand;
- Reset-Menü:
  - „Mit gleichem Seed neu starten“;
  - „Mit neuem Seed starten“;
  - „Mit vorgegebenem Seed starten“;
- Geschwindigkeitswahl normal/Zeitlupe;
- Sprachwahl Deutsch/English;
- kompakte Hilfe/Info.

Reset erfordert nur dann eine Bestätigung, wenn der Lauf bereits sichtbar
fortgeschritten ist. Der aktuell gewählte Seed steht in der
Diagnostik-/Statuszeile und kann kopiert werden. Ein vorgegebener Seed darf
dezimal von 0 bis 4.294.967.295 oder hexadezimal mit `0x` eingegeben werden.
Ungültige Werte werden erklärt und nicht still geklemmt. „Neuer Seed“
verwendet `crypto.getRandomValues` für einen neuen 32-Bit-Ausgangswert; danach
arbeitet ausschließlich der kompatible LCG.

Jede Reset-Variante erzeugt den vollständigen Initialzustand und startet den
Lauf anschließend automatisch. Wer vor dem ersten Schritt prüfen möchte,
pausiert direkt danach; Tests initialisieren den reinen Kern ohne Scheduler.

### 8.5 Alarm- und Hinweisleiste

Statusfarben werden zusätzlich immer durch Text und Symbol erklärt.

| Zustand | Darstellung |
|---|---|
| Sicherheitsstäbe eingefahren | neutral: „Sicherheitskreis nicht scharf“ |
| Sicherheitsstäbe ausgefahren | blau/grün: „Sicherheitskreis scharf“ |
| Warnbereich > 80 % | orange/rot: „Detektor im Warnbereich“ |
| SCRAM | rote persistente Leiste mit Ursache und Schrittzahl |
| Befehl abgelehnt | kurz sichtbarer Hinweis direkt beim Bedienelement und in der Leiste |

Eine SCRAM-Meldung verschwindet nicht automatisch. Sie wird beim erneuten
erfolgreichen Scharfschalten in einen historischen Eintrag überführt.

### 8.6 Reaktoransicht

Die Karte enthält:

- hochauflösendes quadratisches Canvas;
- eine vollständige Legende;
- optional einblendbare 99-Zellen-Messbänder;
- kleine Statuschips für Quelle, Reflektor und Abbrand;
- keine Beschriftungen direkt über den physikalischen Zellen, die Neutronen
  verdecken könnten.

Beim Zeigen mit Maus oder Stift KANN eine nicht modale Inspektionsanzeige
erscheinen:

- Rasterkoordinate;
- Materialtyp;
- Abbrand 0 … 10.

Sie ist rein beobachtend und kein Zell-Editor.

### 8.7 Instrumentenkarten

#### Neutronendetektor

- vertikaler oder kompakter horizontaler Füllbalken;
- großer Prozentwert;
- aktive Bereichsanzeige als `10²` bis `10⁵`;
- Tasten „Bereich niedriger/höher“;
- absolute Neutronenzahl;
- Markierungen bei 3 %, 80 % und 90 %;
- rote Warnfarbe strikt entsprechend dem fachlichen Farbzustand.

#### Leistung

- numerischer Wert;
- Balken 0 … 120 mit Zonen 0 … 100 und 100 … 120;
- Markierung an 100;
- Abschaltmarkierung bei strikt über 120;
- Bezeichnung „Leistungsindikator“ im Hilfetext.

#### Spaltungen

- „dieser Schritt“;
- „seit Start“;
- optional gleitende rein abgeleitete Rate nur später, nicht im
  Pflichtumfang.

### 8.8 Bedienkonsole

#### Sicherheitskreis

- große, klar beschriftete SCRAM-Schaltfläche in Rot;
- SCRAM ist niemals deaktiviert;
- Schaltfläche „Sicherheitsstäbe ausfahren“;
- aktueller Zustand ausgeschrieben;
- bei falschem Messbereich ist die Schaltfläche deaktiviert und erklärt den
  benötigten Bereich 10².

#### Steuerstäbe

- große Prozentanzeige mit einer Nachkommastelle;
- kleiner vertikaler Stabindikator;
- zwei Tasten „Einfahren“ und „Ausfahren“ mit eindeutigen Pfeilen;
- Ausfahren deaktiviert, solange der Sicherheitskreis nicht `armed` ist;
- Anschläge deaktivieren nur die jeweils unmögliche Richtung;
- Tastatur- und Gedrückthalten-Bedienung erzeugen weiterhin einzelne
  5-Zellen-Befehle.

Ein frei kontinuierlicher Slider wird nicht verwendet, weil er leicht
Stabpositionen erzeugen würde, die das Original nie erreicht.

#### Quelle und Optionen

- Quelle als klarer An/Aus-Schalter;
- Reflektor als An/Aus-Schalter;
- Abbrand als An/Aus-Schalter mit Kurzinfo, dass er die Brennstoffreaktion
  verändert;
- Moderatorablass als separate Warnaktion, nicht als reversibler Toggle.

### 8.9 Diagrammkarten

Jede Karte enthält:

- Titel und geometrische Messrichtung;
- Legende mit schaltbaren Kurven;
- Fortschritt des laufenden 100-Schritt-Fensters;
- aktuelle und vorherige abgeschlossene Messung;
- gemeinsame Normierung der schnellen/langsamen aktuellen Messung;
- Schaltfläche „Messungen zurücksetzen“ für beide Karten gemeinsam;
- Textzusammenfassung für Screenreader.

Farben:

- langsame Neutronen: nahezu Schwarz auf heller Diagrammfläche;
- schnelle Neutronen: Rot;
- vorherige Messung: dieselben Farbtöne mit reduzierter Deckkraft;
- optionale Spaltorte: violett oder gestrichelt, damit sie nicht mit dem
  Materialfarbschema verwechselt werden.

Die vertikale Kurve wird als echte vertikale Verteilung dargestellt:
Raster-y läuft von oben nach unten, die Amplitude wächst nach rechts. Sie wird
nicht lediglich als gedreht beschriftetes horizontales Diagramm gerendert.

### 8.10 Visuelles System

Die Oberfläche verwendet kein nachgebautes Windows-Grau. Empfohlene
Grundrichtung:

- dunkelblauer Anwendungsrahmen;
- helle Reaktor- und Diagrammflächen;
- leicht abgesetzte Karten;
- klare serifenlose Systemschrift;
- 8-Pixel-Abstandsraster;
- Kartenradius 10–14 px;
- Bedienelemente mindestens 44 × 44 CSS-Pixel;
- sparsame Schatten, sichtbare Fokusrahmen.

Empfohlene Startpalette:

| Element | Farbe |
|---|---|
| Anwendungsgrund | `#0B1220` |
| dunkle Karte | `#111B2E` |
| helle Messfläche | `#F8FAFC` |
| Moderator | `#F2C94C` |
| Spaltstoff frisch | `#2EAD62` |
| Spaltstoff maximal abgebrannt | `#0B552F` |
| Absorber | `#2864C7` |
| Quelle | `#80663B` |
| schnelles Neutron | `#E5484D` |
| langsames Neutron | `#101828` |
| Gefahr/SCRAM | `#D92D20` |
| Warnung | `#F79009` |

Die finalen Werte müssen mit Kontrasttests geprüft werden. Die
Materialbedeutung darf nie nur durch die Farbe vermittelt werden; die Legende
nennt Text und Farbmuster. Ein späterer Hochkontrastmodus ist möglich.

### 8.11 Hochauflösende Darstellung

Die fachliche Auflösung bleibt exakt 525 × 525. „Höhere Auflösung“ bedeutet
nicht mehr Simulationszellen, sondern:

- Canvas-Backing-Store entsprechend CSS-Größe × `devicePixelRatio`;
- scharfes Skalieren ohne verwaschene Materialkanten;
- hochauflösende Beschriftungen, Linien und Fokusrahmen;
- Diagramme mit allen 525 Bins;
- sinnvolle Partikelsichtbarkeit auf großen und kleinen Displays.

Der Standardmodus zeichnet Neutronen an ihrer abgerundeten logischen
Rasterposition als einen logischen Pixel. Ein optionaler rein visueller Modus
„Neutronen hervorheben“ darf größere Marker verwenden, verändert aber weder
Zählung noch Kollisionen.

### 8.12 Barrierefreiheit

Die erste Version MUSS:

- vollständig per Tastatur bedienbar sein;
- eine logisch fortlaufende Fokusreihenfolge besitzen;
- sichtbare Fokusrahmen anzeigen;
- Bedienelemente mit ausgeschriebenen Namen versehen;
- Status nicht ausschließlich über Farbe vermitteln;
- bei SCRAM eine höfliche, aber sofortige Live-Region aktualisieren;
- Canvas-Inhalte durch Legende und Textzusammenfassung ergänzen;
- Bewegungs- und Übergangseffekte bei `prefers-reduced-motion` reduzieren;
- mindestens WCAG 2.2 AA für Text und Bedienelemente anstreben.

Für Diagramme reicht keine Ansage aller 525 Werte. Die Textalternative nennt
Messfortschritt, Maximum, Richtung und die Lage der stärksten Bins.

### 8.13 Internationalisierung

Alle sichtbaren Texte liegen in zentralen Übersetzungsdateien `de` und `en`.
Keine UI-Komponente enthält fest eingebaute Satztexte.

Zu übersetzen sind insbesondere:

- Bedienelemente und Hilfetexte;
- Materiallegende;
- Status- und Ablehnungsgründe;
- sämtliche SCRAM-Ursachen;
- Diagrammtitel und Kurvennamen;
- Zahlenformatierung und Prozentwerte.

Maschinenlesbare Zustände und Tests verwenden sprachneutrale Schlüssel.

### 8.14 Hilfe und Herkunft

Ein kompakter Info-Bereich nennt:

- dass es sich um eine browserbasierte Reimplementierung des vereinfachten
  Modells `NuclearReactor 1.2` handelt;
- den im Original genannten Autor H.-M. Prasser;
- den historischen Programmtitel und Verweis auf `www.ktg-sachsen.de`;
- die Abgrenzung zu realer Reaktorberechnung;
- die Bedeutung von schnellen/langsamen Neutronen, Materialien, Abbrand und
  Schutzgrenzen in kurzer Form;
- den Seed und die Version der Webanwendung für reproduzierbare
  Fehlermeldungen.

Diese Inhalte werden lokal mit ausgeliefert. Das Öffnen der Hilfe erfordert
keinen Netzwerkzugriff.

## 9. Technische Architektur

### 9.1 Vorgesehener Stack

| Aufgabe | Technik |
|---|---|
| Sprache | TypeScript im strikten Modus |
| Build/Entwicklung | Vite |
| Oberfläche | React mit funktionalen Komponenten |
| Simulation | frameworkfreie TypeScript-Module |
| Nebenläufigkeit | standardmäßiger Web Worker |
| Reaktor/Diagramme | Canvas 2D, keine schwere Chart-Bibliothek |
| Styling | normales CSS mit Custom Properties, Grid und Container Queries |
| Unit/Integration | Vitest |
| Browser-E2E | Playwright |
| Barrierefreiheit | axe-core im Playwright-Test |

Zusätzliche globale State- oder UI-Frameworks werden anfangs nicht benötigt.
Abhängigkeiten sind klein zu halten und bei Projektinitialisierung exakt zu
pinnden.

### 9.2 Systemübersicht

```text
React UI
  │  Benutzerbefehle
  ▼
UI Store / Worker Client ───────────────┐
  │ versionierte Nachrichten           │ Snapshots/Ereignisse
  ▼                                    │
Simulation Web Worker ─────────────────┘
  │
  ├── Scheduler (20/100 ms, kein Catch-up)
  ├── reiner Simulationskern
  │     ├── Geometrie und Material
  │     ├── Neutronenpool
  │     ├── LCG
  │     ├── Reaktionen
  │     ├── Instrumente/Schutzlogik
  │     └── Histogramme
  └── Snapshot-Aufbereitung

React UI
  ├── Reactor Renderer
  ├── Histogram Renderer
  ├── Instrumente
  └── Bedien- und Alarmkomponenten
```

### 9.3 Schichtentrennung

#### Domain/Simulation

Verantwortlich für alle fachlichen Zahlen und Zustandsübergänge. Keine
Browser-Globals außer Typed Arrays; dadurch direkt in Unit-Tests ausführbar.

#### Worker Runtime

Verantwortlich für Timer, Nachrichten, Publikationsraten und Fehlergrenze.
Keine fachliche Logik duplizieren.

#### UI Application

Verantwortlich für Befehle, Layout, Sprache, Bestätigungen und Anzeige des
letzten konsistenten Snapshots.

#### Rendering

Verantwortlich für Material-, Partikel- und Diagrammpixel. Erhält nur Daten,
ändert nie den Domainzustand.

### 9.4 Empfohlene Projektstruktur

```text
src/
  app/
    App
    workerClient
    uiStore
  simulation/
    constants
    types
    rng
    geometry
    neutronPool
    interactions
    detector
    protection
    histograms
    engine
  worker/
    protocol
    simulationWorker
    scheduler
    snapshots
  rendering/
    palette
    materialImage
    reactorRenderer
    histogramRenderer
  components/
    AppHeader
    AlarmBanner
    ReactorView
    DetectorGauge
    PowerGauge
    SafetyControls
    ControlRodControls
    ReactorOptions
    HistogramPanel
    DiagnosticsBar
  i18n/
    de
    en
  styles/
    tokens
    layout
    components
tests/
  unit/
  integration/
  e2e/
  performance/
```

Dateiendungen und kleinere Gruppierungen darf die Implementierung an die
Werkzeuge anpassen. Die fachlichen Modulgrenzen sollen erhalten bleiben.

### 9.5 Domainzustand

Der Worker ist alleiniger Eigentümer des veränderlichen Domainzustands:

| Gruppe | Felder |
|---|---|
| Lauf | Seed, RNG-Zustand, Schritt, Laufstatus, Geschwindigkeit |
| Raster | Material, Abbrand, Material-/Abbrandrevision |
| Neutronen | Pool, aktive Zahl, verworfene Erzeugungsversuche |
| Stäbe | Steuerstabende, Sicherheitskreiszustand, Ersatzmaterial |
| Optionen | Quelle, Reflektor, Moderator abgelassen, Abbrand |
| Detektor | Bereichsindex, Maximum, Prozent, Farbzustand |
| Leistung | geglätteter Wert, Aktivitätszähler des letzten Schritts |
| Spaltung | aktueller Schritt, kumulativ |
| Schutz | letzte Auslösung mit Ursache und Schritt |
| Histogramme | Arbeitsfenster, letzte und vorherige Messung, Fortschritt |

React hält nur eine unveränderliche Sichtkopie publizierter Werte sowie
kurzlebige UI-Zustände wie geöffnetes Bestätigungsfenster oder ausgewählte
Sprache.

### 9.6 Worker-Protokoll

Alle Nachrichten tragen eine Protokollversion.

#### UI an Worker

- Initialisierung mit Seed und Startoption;
- die in Abschnitt 7 definierten Befehle;
- Anforderung eines vollständigen Snapshots nach Wiederverbindung;
- Einstellung der maximalen reinen Darstellungs-Publikationsrate.

#### Worker an UI

| Nachricht | Inhalt | Rate |
|---|---|---|
| `ready` | Initialzustand und Fähigkeiten | einmal |
| `command-result` | commandId, accepted/rejected, Grund | sofort |
| `telemetry` | konsistenter Instrumenten-/Stabzustand | höchstens 10–20 Hz und sofort bei Alarm |
| `particles` | x/y und schnell/langsam für sichtbaren Snapshot | Ziel 25–30 Hz, unter Last reduzierbar |
| `material` | Materialraster und Revision | nur bei Geometrieänderung |
| `burnout` | Abbrandraster und Revision | nur wenn geändert, gebündelt höchstens 10 Hz |
| `histograms` | abgeschlossene normalisierte Fenster | alle 100 Schritte bzw. Reset |
| `fatal-error` | stabiler Fehlercode und Diagnose | bei nicht behebbarer Worker-Ausnahme |

Große Typed Arrays werden als Transferables übertragen. Der Worker darf nicht
den eigentlichen Simulationsspeicher transferieren und dadurch verlieren,
sondern verwendet wiederverwendbare Snapshot-Puffer.

Jede Telemetrie trägt die Schrittzahl. Die UI kombiniert keine Teilnachrichten
verschiedener Materialrevisionen, ohne dies zu erkennen.

### 9.7 Scheduler

Der Worker-Scheduler führt pro Timerereignis genau einen Simulationsschritt
aus. Er holt keine ausgefallenen Schritte in einer Schleife nach.

Begründung:

- entspricht dem Verhalten des Originals bei Überlastung;
- vermeidet Eingabestau und lange Worker-Blockaden;
- erhält Wahrscheinlichkeiten pro Schritt;
- macht Zeitlupe eindeutig.

Die nächste Ausführung wird nach Abschluss des aktuellen Schritts geplant.
Gemessene reale Dauer und effektive Schritte pro Sekunde dürfen in der
Diagnostik erscheinen, beeinflussen aber nicht die Physik.

Im pausierten Zustand läuft kein Scheduler. `step-once` ruft dieselbe
Schrittfunktion genau einmal auf.

### 9.8 Befehle und Schrittgrenzen

Eingehende Fachbefehle werden in einer FIFO-Warteschlange gesammelt und am
Anfang des nächsten Schritts ausgeführt. Damit hängt das Ergebnis nicht davon
ab, an welcher Stelle einer Neutronenschleife ein Klick eintraf.

Ausnahmen:

- `pause` stoppt die Planung des nächsten Schritts sofort nach dem aktuell
  laufenden Schritt;
- `scram` wird mit höchster Priorität als erster Fachbefehl der nächsten
  sicheren Schrittgrenze angewendet;
- im pausierten Zustand werden Fachbefehle sofort über denselben
  Befehls-Dispatcher angewendet und anschließend als Snapshot veröffentlicht,
  ohne einen Simulationsschritt oder RNG-Aufruf auszulösen.

### 9.9 Rendering-Pipeline

#### Material

Aus Material- und Abbrandraster wird ein 525 × 525 großes logisches
Offscreen-Bild erzeugt. Es wird nur bei einer Revision neu aufgebaut.

#### Partikel

Ein transparentes logisches Partikelbild wird für jeden Render-Snapshot
geleert und in stabiler Poolreihenfolge befüllt:

- schnell rot;
- langsam nahezu schwarz;
- Position durch Abrunden von x/y.

Material- und Partikelbild werden anschließend auf das hochauflösende sichtbare
Canvas skaliert. Kanten der Materialzellen bleiben scharf.

#### Overlays

Legende, Fokus, optionale Messbänder und Inspektionshinweise werden als eigene
Vektorebene gezeichnet oder als DOM über/unter dem Canvas angeordnet. Sie
werden nicht in das Materialbild eingebrannt.

#### Diagramme

Diagramm-Canvas verwendet CSS-Größe × `devicePixelRatio`, rendert alle 525
Bins und beschriftet Achsen im DOM. Dadurch bleiben Text und
Screenreaderstruktur unabhängig von Canvas-Pixeln.

### 9.10 UI-State und Aktualisierung

Ein kleiner externer Store oder React-kompatibler Subscription-Store hält den
letzten Snapshot. Häufige Partikelbilder sollen nicht die gesamte
Komponentenhierarchie neu rendern:

- Canvas-Renderer erhält Partikelnachrichten direkt;
- React-Komponenten abonnieren nur die benötigten Telemetriefelder;
- Materialrevisionen aktualisieren nur die Reaktoransicht;
- Histogrammrevisionen aktualisieren nur Diagramme.

Ein allgemeines Redux-ähnliches Framework ist dafür nicht erforderlich.

### 9.11 Speicherung und Datenschutz

`localStorage` darf ausschließlich speichern:

- Sprache;
- visuelle Präferenzen;
- zuletzt gewählte Geschwindigkeit;
- optional den zuletzt verwendeten Seed.

Der vollständige Simulationszustand wird nicht automatisch gespeichert.
Es gibt keine Netzwerkübertragung, Cookies, Analyse- oder Trackingdienste.

### 9.12 Fehlerverhalten

- Erwartete ungültige Bedienhandlungen führen zu `rejected`, nicht zu
  Exceptions.
- Zahlenzustände werden in Entwicklungs- und Testbuilds auf `NaN`/Unendlich
  geprüft.
- Ein voller Neutronenpool beschädigt keine Arrays und zeigt optional eine
  nicht blockierende Diagnosewarnung.
- Stürzt der Worker unerwartet ab, pausiert die UI, zeigt einen klaren Fehler
  und bietet Reset mit demselben Seed an.
- Ein Canvas-Fehler darf die Simulationsdaten nicht verändern.

## 10. Performancekonzept

### 10.1 Ziele

Auf einem üblichen aktuellen Laptop:

- 50 fachliche Schritte/s im Normalmodus bei typischen Läufen bis mindestens
  10.000 aktive Neutronen;
- bestmögliche Abarbeitung bis 100.000 Neutronen ohne UI-Blockade;
- 25–30 sichtbare Partikelbilder/s bei moderater Last;
- Eingaberückmeldung in der UI innerhalb 100 ms;
- permanente Histogrammsammlung ohne zusätzlichen Durchlauf über den
  Neutronenpool;
- keine unbeschränkt wachsenden Arrays oder Ereignislisten.

Bei 100.000 Neutronen darf die Simulationsrate sinken. Es werden aber keine
fachlichen Neutronen übersprungen und keine Wahrscheinlichkeiten angepasst.
Zuerst wird nur die Publikations-/Renderfrequenz reduziert.

### 10.2 Maßnahmen

- vorallokierte Typed Arrays;
- In-Place-Kompaktierung;
- nur ein Neutronendurchlauf für Bewegung und Histogrammzähler;
- keine Objektallokation pro Neutron oder Schritt;
- Worker für alle Simulationsschritte;
- Materialbild-Caching nach Revision;
- getrennte, gedrosselte Telemetrie- und Render-Snapshots;
- keine `SharedArrayBuffer`-Abhängigkeit und damit keine speziellen
  Cross-Origin-Header;
- Diagramme nur bei abgeschlossenem Messfenster neu zeichnen;
- Performance-Messung außerhalb fachlicher Formeln.

### 10.3 Degradationsreihenfolge

Wenn ein Gerät überlastet ist:

1. Diagnostik-Publikationsrate reduzieren;
2. Partikel-Render-Snapshots bis auf 10 Hz reduzieren;
3. UI-Animationen deaktivieren;
4. fachliche Schrittfolge langsamer werden lassen.

Material, Reaktionen, Detektor, Schutzlogik und Histogrammzähler werden niemals
approximiert.

## 11. Teststrategie

### 11.1 Grundsatz

Die Tests prüfen nicht nur einzelne Formeln, sondern besonders Reihenfolge,
Grenzwerte und Zustandsübergänge. Zufallsabhängige Verzweigungen verwenden
entweder einen festen LCG-Seed oder einen injizierten Sequenzgenerator.

Der reine Simulationskern wird ohne Worker und ohne reale Timer getestet.

### 11.2 Unit-Tests

#### Zufall

1. LCG liefert für Seed 1 exakt die fünf Referenzzustände aus Abschnitt 6.6.
2. Überlauf bleibt 32 Bit unsigned.
3. Werte liegen stets in `[0,1)`.
4. Reset mit Seed setzt Zustand und Aufrufreihenfolge zurück.

#### Geometrie

5. Beide Raster besitzen exakt 275.625 Einträge.
6. Kern umfasst exakt x/y 64 … 460.
7. Materialzählung im Ausgangszustand entspricht 192/153/52 Spalten.
8. Sicherheits- und Steuerstreifen liegen an den aufgelisteten x-Werten.
9. Reflektor verändert nur den Außenrand.
10. Moderatorablass entfernt jeden vorhandenen Typ 1.
11. Quellenfläche umfasst exakt 64 Zellen.

#### Stäbe

12. Steuerstabfolge erreicht von 461 über Fünferschritte schließlich 66 und
    dann 64.
13. Kein Befehl überschreitet 64 oder 461.
14. Prozentwerte sind bei 461 genau 0 und bei 64 genau 100.
15. Ausfahren wird ohne `armed` abgelehnt.
16. Einfahren bleibt ohne `armed` zulässig.
17. SCRAM setzt beide Gruppen vollständig auf Absorber.
18. Sicherheitsstäbe lassen sich nur bei Maximum 100 ausfahren.
19. Nach Ausfahren nur der Sicherheitsstäbe entsprechen 181 Moderator-,
    192 Brennstoff- und 24 Absorberspalten der Kernfläche.
20. Nach vollständigem Ausfahren beider Gruppen entsprechen 205 Moderator-,
    192 Brennstoff- und 0 Absorberspalten der Kernfläche.
21. Eine teilweise eingefahrene Steuerstabgruppe belegt exakt
    `24 × (Stabende - 64)` Absorberzellen.

#### Materialreaktionen

22. Moderator moderiert bei erzwungenem Zufallswert unter 0,05.
23. Moderator führt für jedes Neutron unabhängig die 0,003-Prüfung aus.
24. Frischer Brennstoff spaltet mit Grenze 0,02.
25. Abbrand 10 besitzt Spaltwahrscheinlichkeit 0 und
    Absorptionswahrscheinlichkeit 0,005.
26. Eine Spaltung deaktiviert den Ursprung und versucht genau drei
    Neutronenerzeugungen.
27. Neu erzeugte Neutronen werden nicht im selben Schritt erneut verarbeitet.
28. Abbrand bleibt in 0 … 10.
29. Deaktivierter Abbrand lässt den Zähler unverändert.
30. Langsame Neutronen werden im Absorber sicher deaktiviert.
31. Schnelle Neutronen verwenden im Absorber exakt die Grenze 0,2.
32. Typ 0 und 5 lösen keine Materialreaktion aus.
33. Streuung verwendet zwei Komponenten in `[-2, 2)` und normiert sie nicht.
34. Eingeschaltete Quelle prüft 0,5 vor der unabhängigen
    Hintergrundprüfung 0,01.
35. Ausgeschaltete Quelle überspringt ihren Erfolgstest, die
    Hintergrundprüfung findet trotzdem statt.

#### Instrumente und Schutz

36. Leistung erfüllt exakt `0,9 × alt + 0,01 × K`.
37. Messbereiche lauten ausschließlich 100/1.000/10.000/100.000.
38. Detektorwert wird geklemmt und abgeschnitten, nicht gerundet.
39. 80 % erhält den vorherigen Farbzustand.
40. Genau 90 % löst nicht aus, 91 % löst aus.
41. Genau 3 % löst nicht aus, 2 % löst im hohen Bereich aus.
42. Unterbereich löst bei Maximum 100 nicht aus.
43. Genau 120 Leistung löst nicht aus, ein Wert darüber löst aus.
44. Automatische Prüfungen lösen nur bei `armed` aus.
45. Erste Ursache eines Schritts wird nicht überschrieben.

#### Histogramme

46. Bins verwenden nur die inklusive Bandgrenze 213 … 311.
47. Zählung erfolgt vor Bewegung.
48. Ein Fenster umfasst exakt 100 Schritte.
49. Gemeinsames Maximum für schnell/langsam startet bei 1.
50. Beide Kurven werden mit demselben Fenstermaximum normiert.
51. Aktuelles und vorheriges abgeschlossenes Fenster werden korrekt rotiert.
52. Histogrammreset verbraucht keine Zufallszahl und ändert keinen
    Simulationszustand außerhalb der Diagramme.

### 11.3 Invarianten-/Property-Tests

Nach beliebigen gültigen Befehls- und Schrittfolgen gilt:

- `0 ≤ neutronCount ≤ 100000`;
- kein aktives Neutron hat eine Position außerhalb des zulässigen Bereichs;
- `64 ≤ controlRodEnd ≤ 461`;
- jeder Abbrandwert liegt in 0 … 10;
- Messbereichsindex liegt in 2 … 5;
- Materialcodes liegen in 0 … 5;
- Histogrammfortschritt liegt in 0 … 99;
- ein `tripped`-Zustand besitzt vollständig eingefahrene Stäbe;
- gleiche Startzustände, Seeds und Befehle ergeben bitgleich dieselben
  fachlichen Typed Arrays und Zahlenwerte.

### 11.4 Integrations-Tests

1. Worker initialisiert und liefert einen vollständigen `ready`-Snapshot.
2. Befehle werden in FIFO-Reihenfolge an Schrittgrenzen angewendet.
3. Pause verhindert weitere Schritte, nicht aber erlaubte Zustandsbefehle.
4. Einzelschritt erhöht die Schrittzahl exakt einmal.
5. Normal/Zeitlupe verändert nur den Scheduler, nicht die Schrittberechnung.
6. Materialnachricht erscheint nur bei passender Revision.
7. Alarmtelemetrie wird unabhängig von regulärer Drosselung sofort geliefert.
8. Transferierte Snapshot-Puffer beschädigen den Neutronenpool nicht.
9. Worker-Reset mit gleichem Seed ist reproduzierbar.

### 11.5 End-to-End-Szenarien

#### Start und Grundbedienung

- Anwendung lädt ohne Netzwerk-API.
- Reaktor, zwei Startneutronen, Bereich 10² und eingefahrene Stäbe erscheinen.
- Pause, Einzelschritt, Fortsetzen und Reset funktionieren.
- Ein dezimaler und ein hexadezimaler Seed werden akzeptiert; ungültige und
  zu große Werte werden ohne Zustandsänderung abgelehnt.
- Reset mit demselben Seed und derselben aufgezeichneten Bedienfolge erzeugt
  denselben fachlichen Snapshot.

#### Kontrollierter Start

- Sicherheitsstäbe lassen sich im Bereich 10² ausfahren.
- Schutzstatus wird `armed`.
- Steuerstäbe lassen sich schrittweise ausfahren.
- Prozentanzeige und Canvas ändern sich konsistent.

#### Messbereichsverriegelung

- Im Bereich 10³ ist „Sicherheitsstäbe ausfahren“ deaktiviert.
- Hilfetext nennt 10².
- Nach Rückkehr zu 10² ist die Aktion verfügbar.

#### Manueller SCRAM

- Ein Klick fährt alle Stäbe sofort an der nächsten sicheren Grenze ein.
- Rote Alarmleiste nennt manuelle Auslösung.
- SCRAM bleibt erreichbar, auch wenn die Simulation pausiert ist.

#### Automatische Abschaltung

- Mit kontrolliertem Testzustand lösen Detektor hoch, Detektor
  Unterbereich und Leistung jeweils die richtige Ursache aus.
- Grenzwerte exakt auf 90/3/120 lösen nicht aus.

#### Moderator und Reflektor

- Reflektor erscheint im Außenrand.
- Moderatorablass verlangt Bestätigung und entfernt Kernmoderator sowie
  Reflektor.
- Reset stellt Ausgangsgeometrie wieder her.

#### Abbrand

- Bei aktiviertem Abbrand dunkeln betroffene Brennstoffzellen stufenweise ab.
- Ausschalten stoppt Änderungen und zeigt Grundfarbe.
- Wiedereinschalten zeigt erhaltene Zähler.

#### Diagramme

- Beide Diagramme sind ohne Öffnen eines Fensters sichtbar.
- Nach 100 Schritten erscheint die erste abgeschlossene Kurve.
- Nach weiteren 100 Schritten sind aktuelle und blasse vorherige Kurve
  sichtbar.
- Reset der Messungen setzt die Simulation nicht zurück.

#### Sprache und Responsivität

- Deutsch/Englisch übersetzt alle Bedienelemente und Alarmursachen.
- Bei Desktop-, Tablet- und schmaler Mobilbreite bleiben alle Pflichtaktionen
  erreichbar.

### 11.6 Visuelle Regression

Playwright-Screenshots werden für die neue Oberfläche bei festem Viewport,
festem Seed, pausiertem Zustand und festem `devicePixelRatio` geführt:

- Initialzustand Desktop;
- teilweise ausgefahrene Steuerstäbe;
- SCRAM-Alarm;
- Reflektor plus Abbrand;
- zwei gefüllte Diagrammfenster;
- schmales responsives Layout.

Diese Tests vergleichen die neue UI mit ihren eigenen freigegebenen
Golden-Mastern, nicht pixelgenau mit der alten VCL-Oberfläche.

Zusätzlich prüfen gezielte Canvas-Tests logische Pixelpositionen und
Materialfarben unabhängig von Schrift- und Browser-Antialiasing.

### 11.7 Barrierefreiheits-Tests

- axe-core ohne kritische oder schwere Befunde in den Hauptzuständen;
- Tastaturablauf für Start/Pause, Stäbe, Bereich und SCRAM;
- Fokus bleibt nach Zustandsänderungen sinnvoll;
- SCRAM-Ursache wird über Live-Region angesagt;
- deaktivierte Aktionen besitzen eine maschinenlesbare Erklärung;
- Kontrast der finalen Palette wird automatisiert geprüft.

### 11.8 Performance-Tests

Nicht jeder Performancewert muss als harter CI-Grenzwert laufen. Es gibt
reproduzierbare Benchmarks für:

- 1.000, 10.000 und 100.000 aktive Neutronen;
- Schrittzeit ohne Rendering;
- In-Place-Kompaktierung bei 0 %, 50 % und 90 % inaktiven Einträgen;
- Snapshot-Erzeugung und Transfergröße;
- Materialbildaufbau;
- Partikelrendering bei fester Canvas-Größe;
- dauerhafte Histogrammsammlung.

CI prüft vor allem auf grobe Regressionen und Speicherwachstum. Lokale
Referenzwerte werden mit Browser, CPU und Datum dokumentiert.

## 12. Abnahmekriterien der ersten vollständigen Version

Die Version ist fachlich fertig, wenn:

1. alle Pflichtfunktionen aus Abschnitt 4.1 implementiert sind;
2. sämtliche Regeln aus Abschnitt 6 über automatisierte Tests abgesichert
   sind;
3. gleiche Seeds und Befehlsfolgen reproduzierbare Ergebnisse liefern;
4. kein fachlicher Zufallsaufruf aus Rendering oder UI stammt;
5. die UI bei 100.000 Neutronen bedienbar bleibt, auch wenn Schritte langsamer
   werden;
6. deutsche und englische Oberfläche vollständig sind;
7. die zwei Dichtediagramme dauerhaft funktionieren;
8. SCRAM-Ursachen und Verriegelungen eindeutig sichtbar sind;
9. der Produktionsbuild aus statischen Dateien besteht und keine
   Netzwerkverbindung benötigt;
10. Unit-, Integrations-, E2E- und Accessibility-Suite grün sind;
11. es keine bekannten unkommentierten Abweichungen von diesem Entwurf gibt.

## 13. Empfohlene Umsetzungsreihenfolge

### Phase 1: Fachliches Fundament

- Konstanten, Zelltypen und LCG;
- Geometrie und Stabgruppen;
- vorallokierter Neutronenpool;
- reiner `step()` ohne UI;
- erzwungene Zufallszweige und Unit-Tests.

Ergebnis: deterministischer Kern, der vollständig im Testprozess läuft.

### Phase 2: Instrumente und Schutzlogik

- Detektor und Messbereiche;
- Leistung;
- Sicherheitszustandsmaschine;
- manuelles und automatisches SCRAM;
- Histogrammfenster;
- Integrationsszenarien.

Ergebnis: fachlich vollständige Simulation ohne fertiges Design.

### Phase 3: Worker und Protokoll

- Scheduler;
- Befehlsqueue;
- versionierte Nachrichten;
- Snapshot-Puffer und Publikationsdrosselung;
- Worker-Integrationstests.

Ergebnis: Simulation läuft nebenläufig und bleibt per Tests direkt aufrufbar.

### Phase 4: Visuelle Basis

- App-Shell und responsives Raster;
- Material- und Partikel-Canvas;
- Instrumente, Stäbe und Optionen;
- Alarmleiste;
- deutsche/englische Texte.

Ergebnis: vollständige bedienbare Anwendung.

### Phase 5: Diagramme und Politur

- permanente horizontale/vertikale Diagramme;
- High-DPI-Ausgabe;
- Tastatur- und Screenreaderdetails;
- visuelle Regression;
- Performanceprofile und Drosselung.

Ergebnis: abnahmefähige erste Version.

## 14. Arbeitsregeln für einen Coding Agent

Ein implementierender Agent soll:

1. pro Phase kleine, testbare Änderungen erstellen;
2. zuerst fachliche Tests und dann die zugehörige Implementierung ergänzen;
3. keine Wahrscheinlichkeiten, Grenzwerte oder Schrittfolgen „vereinfachen“;
4. keine UI-Abhängigkeit in `simulation/` importieren;
5. keine Objektallokationen in der inneren Neutronenschleife einführen;
6. jeden UI-Befehl über das Befehlsmodell schicken;
7. neue Produktentscheidungen im Abschnitt 15 dokumentieren;
8. vor Abschluss mindestens Unit-, Integrations- und relevante E2E-Tests
   ausführen;
9. bei Unklarheiten zuerst Analyse und diese Spezifikation abgleichen;
10. keine Abweichung allein deshalb einbauen, weil eine Bibliothek ein anderes
    Standardverhalten besitzt.

## 15. Zu bestätigende Produktentscheidungen

Diese Punkte blockieren einen ersten Implementierungsdurchlauf nicht; die hier
genannte Vorgabe gilt, bis sie in einer Iteration geändert wird:

| Frage | Vorgabe dieses Entwurfs |
|---|---|
| Technologiestack | TypeScript, React, Vite, Canvas 2D, Web Worker |
| Startet die Simulation automatisch? | ja, wie das Original; Pause ist sofort verfügbar |
| Standardsprache | Browserpräferenz Deutsch/Englisch |
| Diagramme | immer sichtbar, automatische 100-Schritt-Fenster |
| Spaltortkurve | gesammelt, standardmäßig verborgen, optional einblendbar |
| Moderatorablass | Bestätigung, nur durch Reset rückgängig |
| Quellenfläche nach Stabaktionen | konsistent 8 × 8, Altfehler nicht übernehmen |
| „Spaltungen gesamt“-Altfehler | zwei korrekt benannte Anzeigen |
| Mobile Nutzung | vollständig bedienbar, aber Desktop/Tablet ist Primärlayout |
| Theme | dunkler Rahmen mit hellen wissenschaftlichen Messflächen |

## 16. Rückverfolgbarkeit zum Original

| Originalbereich | Umsetzung in diesem Entwurf |
|---|---|
| 525-Pixel-Reaktorbild | logisches 525²-Raster, High-DPI skaliert |
| Materialstreifen | identische Modulo-32-Geometrie |
| sechs Steuer-/sieben Sicherheitsstäbe | identische x-Positionen und Gruppen |
| alte Spinbuttons | moderne diskrete Ein-/Ausfahr-Tasten |
| Neutronendetektor | identische Bereiche, Prozentberechnung und Grenzen |
| zweigeteilter Leistungsbalken | moderner Balken mit Normal-/Überlastzone |
| RESA/SCRAM | prominente, immer verfügbare Sicherheitsaktion |
| Optionen | Quelle, Zeitlupe, Reflektor, Moderatorablass und Abbrand erhalten |
| zwei Zusatzfenster | zwei permanent integrierte Diagrammkarten |
| Deutsch/Englisch-Schaltfläche | konventioneller Sprachwähler |
| niedrige feste Fensterauflösung | responsives Layout und High-DPI-Canvas |
| zufälliger Start ohne Reproduzierbarkeit | kompatibler LCG plus sichtbarer Seed |

Damit bleibt das Verhalten des Simulationsmodells erkennbar und testbar das
von NuclearReactor 1.2, während die Anwendung visuell und ergonomisch als
heutige Browseranwendung auftritt.
