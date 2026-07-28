# Statische Analyse von `NuclearReactor_1_2.exe`

Stand: 28. Juli 2026

## Ziel und Status

Dieses Dokument beschreibt die bisher statisch rekonstruierte Funktionsweise der
alten Windows-Anwendung. Es soll als technische Grundlage für eine
browserbasierte Neuimplementierung und deren automatische Tests dienen.

Die wichtigsten Ergebnisse sind direkt aus dem Maschinencode und den
eingebetteten Delphi-Formularressourcen abgeleitet. Das mitgelieferte JPEG
`NucReact_1_1.jpg` dient nur zum visuellen Abgleich. Die EXE wurde in diesem
Analyseschritt nicht ausgeführt.

Kennzeichnung der Sicherheit einer Aussage:

- **Bestätigt:** unmittelbar als Konstante, Schleifengrenze oder Ressource in
  der EXE vorhanden.
- **Rekonstruiert:** der Maschinencode ist eindeutig, die ursprünglichen
  Variablennamen fehlen jedoch.
- **Hypothese:** plausible semantische Deutung, die noch dynamisch geprüft
  werden sollte.

## Identifikation der Anwendung

| Eigenschaft | Wert |
|---|---:|
| Datei | `NuclearReactor_1_2.exe` |
| SHA-256 | `5565d19ac0cc633113e75d23ccd52f7d8ba55f80ee50e2e3b32198f26410900b` |
| Größe | 456.704 Byte |
| Format | PE32, Intel i386, Windows-GUI |
| Framework | Delphi/VCL |
| Formulare | `TForm1`, `TForm2`, `TForm3` |
| Programmtitel | `NuclearReactor 1.2 (www.ktg-sachsen.de)` |
| Autor laut Oberfläche | H.-M. Prasser |

Der PE-Zeitstempel lautet 20. Juni 1992. Er ist für diese Anwendung sehr
wahrscheinlich kein verlässliches Erstellungsdatum. Die importierten
VCL-/Windows-Funktionen und die eingebetteten Delphi-Klassennamen sind deutlich
aussagekräftiger.

Die Anwendung bindet ihre Delphi-Laufzeit statisch ein. Als externe
Windows-Bibliotheken erscheinen nur `kernel32`, `user32`, `gdi32`,
`advapi32`, `oleaut32`, `comctl32` und `version`. Es gibt keine Netzwerk-,
Datenbank- oder externe Physikbibliothek. Der gesamte Simulationsalgorithmus
liegt damit in der EXE.

Die VCL-Units `Themes` und `UxTheme` sowie Linkermerkmale sprechen für eine
Delphi-Version aus der Delphi-7-Generation. Eine eindeutige
Compiler-Versionsressource ist jedoch nicht vorhanden.

## Koordinatensystem und Reaktorgeometrie

### Simulationsraster

**Bestätigt:** Die Simulation benutzt zwei quadratische Raster mit jeweils
`525 × 525` Zellen. Eine Materialmatrix beginnt im Speicher bei `0x64A074`,
eine zweite Byte-Matrix für lokale Abbrand-/Ereigniszähler bei `0x68D520`.

Die gültigen Pixelkoordinaten sind `0 … 524`. Der eigentliche quadratische
Reaktorkern umfasst in beiden Richtungen:

```text
64 … 460 einschließlich
```

Damit ergeben sich:

- Kernbreite und -höhe: `397` Zellen
- Kernfläche: `397² = 157.609` Zellen
- linker/oberer Außenbereich: `64` Zellen
- rechter/unterer Außenbereich: `64` Zellen (`461 … 524`)
- Kernanteil an der gesamten Rasterfläche:
  `157.609 / 275.625 ≈ 57,18 %`

Die Darstellung ist pixelbasiert: Eine Simulationszelle entspricht einem Pixel
im intern erzeugten Reaktorbild. Das Hauptformular positioniert dieses Bild bei
`Left=16`, `Top=16`.

### Periodische Materialanordnung

**Bestätigt:** Die Materialart hängt im Ausgangszustand ausschließlich von der
x-Koordinate ab. Das Muster wiederholt sich alle 32 Zellen:

```text
x mod 32 =  0 …  5   Moderator
x mod 32 =  6 …  9   Absorberstab
x mod 32 = 10 … 15   Moderator
x mod 32 = 16 … 31   Spaltstoff
```

Anders geschrieben besteht eine volle 32-Zellen-Periode aus:

```text
12 Zellen Moderator + 4 Zellen Absorber + 16 Zellen Spaltstoff
```

Da die Kernbreite 397 und damit kein ganzzahliges Vielfaches von 32 ist,
enthält der Kern zwölf volle Perioden und einen Rest von 13 Zellen. Daraus
folgen die exakten Breiten- und Flächenanteile im vollständig eingefahrenen
Ausgangszustand:

| Material | Spalten | Anteil am Kern |
|---|---:|---:|
| Spaltstoff | 192 | 48,36 % |
| Moderator | 153 | 38,54 % |
| Absorberstäbe gesamt | 52 | 13,10 % |
| **Summe** | **397** | **100,00 %** |

Jede Materialspalte erstreckt sich im Ausgangszustand über die volle Kernhöhe.
Deshalb entsprechen die Spaltenanteile zugleich den Flächenanteilen.

### Steuer- und Sicherheitsstäbe

**Bestätigt:** Die 13 Absorberstreifen sind in zwei abwechselnde Gruppen
aufgeteilt:

- 6 Steuerstäbe mit je 4 Zellen Breite, zusammen 24 Spalten bzw. 6,05 % der
  Kernbreite;
- 7 Sicherheitsstäbe mit je 4 Zellen Breite, zusammen 28 Spalten bzw. 7,05 %
  der Kernbreite.

Die Steuerstabposition ist eine y-Koordinate mit dem Bereich `64 … 461`.
`461` bedeutet vollständig eingefahren, `64` vollständig ausgefahren. Ein
Tastendruck verändert die Position um 5 Zellen. Die angezeigte Ausfahrposition
berechnet sich als:

```text
Ausfahrposition_in_Prozent = (461 - Stabende_y) / 397 × 100
```

Der obere und untere Anschlag werden im Code explizit begrenzt.

Das Ausfahren der Steuerstäbe ist nur möglich, wenn die Sicherheitsstäbe zuvor
ausgefahren wurden. Einfahren ist dagegen jederzeit zulässig. Für eine
teilweise eingefahrene Steuerstabgruppe beträgt deren Absorberfläche innerhalb
des Kerns:

```text
A_Steuerstäbe = 24 × (Stabende_y - 64)
```

Damit ergeben sich für die diskreten Endzustände:

| Zustand | Moderator | Spaltstoff | Absorber |
|---|---:|---:|---:|
| beide Gruppen eingefahren | 153 Spalten | 192 Spalten | 52 Spalten |
| nur Steuerstäbe eingefahren | 181 Spalten | 192 Spalten | 24 Spalten |
| beide Gruppen ausgefahren | 205 Spalten | 192 Spalten | 0 Spalten |

„Spalten“ bezeichnet hier die flächengleiche Zahl vollständig hoher
Materialstreifen. Bei teilweise eingefahrenen Steuerstäben ist die
Absorberfläche entsprechend der obigen Formel nicht mehr über die volle Höhe
verteilt.

Ein SCRAM setzt das Stabende sofort auf `461` und schreibt beide Stabgruppen
wieder als Absorber in den vollständigen Kern. Die Sicherheitsstäbe lassen
sich nur ausfahren, wenn der Detektor im untersten Messbereich steht
(im Code: Messbereichsmaximum höchstens 100).

### Zelltypen und Farben

**Bestätigt:** Die Materialmatrix verwendet kleine ganzzahlige Zelltypen.
Die Farbtabelle liegt ebenfalls direkt in der EXE:

| Typ | Bedeutung | Windows-Farbwert | sichtbare RGB-Farbe |
|---:|---|---:|---|
| 0 | leere Umgebung | `0x00FFFFFF` | Weiß |
| 1 | Moderator | `0x0000FFFF` | Gelb |
| 2 | Spaltstoff | `0x0000FF00` | Grün |
| 3 | Absorber | `0x00FF0000` | Blau |
| 4 | Abbrandfarbe/Zielwert | `0x00004000` | Dunkelgrün |
| 5 | Neutronenquelle | `0x00306060` | oliv-graubraun |

Bei eingeschalteter Abbrandanzeige interpoliert die Anwendung die Farbe einer
Brennstoffzelle abhängig von ihrem lokalen Zähler zwischen Grün und
Dunkelgrün. Der Zähler läuft von 0 bis 10.

Die einschaltbare Neutronenquelle belegt ein Quadrat von `8 × 8` Zellen:

```text
x = 260 … 267
y = 438 … 445
```

Das emittierte Neutron startet im Mittelpunkt bei `(263, 441)`.

### Reflektor und Moderatorablass

**Bestätigt:** Die Reflektoroption verändert den 64 Zellen breiten Rand um den
Kern. Im Code wird dieser Rand zwischen Zelltyp 0 und Zelltyp 1 umgeschaltet.
Da Zelltyp 1 dieselben Wechselwirkungen wie der Moderator besitzt, ist der
„Reflektor“ im Modell ein moderierender Rand und kein eigener Materialtyp.

„Drain Moderator“ ersetzt global jede Zelle vom Typ 1 durch Typ 0. Der
Moderator verschwindet dadurch sowohl aus dem Kern als auch aus einem
gegebenenfalls eingeschalteten Reflektorrand. Der Standardtyp, der beim späteren
Ausfahren von Stäben wiederhergestellt wird, wird ebenfalls auf 0 gesetzt.

## Neutronenmodell

### Datenstruktur und Kapazität

**Rekonstruiert:** Ein Neutron belegt 20 Byte:

```text
float x
float y
float dx
float dy
byte  schnell
byte  aktiv
2 Byte Auffüllung
```

Der statische Speicher ist für 100.000 Einträge ausgelegt. Inaktive Einträge
werden nach jedem Simulationsschritt durch Kopieren aktiver Einträge
komprimiert.

Der reservierte Bereich ist exakt 2.000.020 Byte groß, also Platz für
100.001 Strukturen zu je 20 Byte. Index 0 dient der ursprünglichen
Pascal-Logik als unbenutzter/technischer Eintrag; die simulierten Neutronen
beginnen bei Index 1. Die beiden 525²-Byte-Raster benötigen zusammen weitere
551.250 Byte.

Beim Programmstart werden zwei aktive schnelle Neutronen erzeugt. Ihre
Startposition ist gleichverteilt über das gesamte Raster. Auch ihre Richtung
wird zufällig gewählt und anschließend normiert.

### Bestätigter Startzustand

Nach `FormCreate` gelten folgende Zustände:

| Zustand | Startwert |
|---|---:|
| Neutronen | 2 aktive schnelle Neutronen |
| Steuerstabende | `y=461`, vollständig eingefahren |
| Sicherheitsstäbe | eingefahren |
| Neutronenquelle | aus |
| Reflektor | aus |
| Moderator | vorhanden |
| Messbereich | Index 2, Maximum 100 |
| Leistung | 0 |
| Timerintervall | 20 ms |
| Slow motion | aus |
| Dichtefenster | geschlossen |
| Oberflächensprache | Englisch |

Sowohl Steuer- als auch Sicherheitsstäbe sind damit beim Start vollständig
eingefahren. Erst die getrennten Bedienaktionen entfernen jeweils eine der
abwechselnden Stabgruppen.

### Bewegung

**Bestätigt:** In jedem Timerdurchlauf wird für jedes aktive Neutron gerechnet:

```text
x_neu = x_alt + dx
y_neu = y_alt + dy
```

Der Geschwindigkeitsvektor wird bei der Erzeugung auf die Länge 5 normiert:

```text
L = sqrt(rx² + ry²)
dx = 5 × rx / L
dy = 5 × ry / L
```

`rx` und `ry` entstehen aus zwei unabhängigen Zufallszahlen minus 0,5.
Neutronen außerhalb `0 … 523` werden deaktiviert. Die Grenze 524 ist damit
zwar Teil des Darstellungsrasters, aber bereits außerhalb des erlaubten
Bewegungsbereichs.

Beim Eintritt eines schnellen Neutrons in eine von leer verschiedene Zelle
wird seine Richtung neu zufällig gewählt. Die beiden neuen Komponenten liegen
jeweils im Bereich `[-2, 2)`. Anders als bei der Erzeugung wird dieser
Streuvektor nicht erneut auf Länge 5 normiert.

Schnelle Neutronen werden rot, langsame Neutronen schwarz gezeichnet.

### Zufallszahlengenerator

**Bestätigt:** Die Anwendung verwendet den in ihrer Delphi-Laufzeit
eingebetteten linearen Kongruenzgenerator mit einem 32-Bit-Zustand:

```text
seed_neu = (seed_alt × 0x08088405 + 1) mod 2³²
random   = seed_neu / 2³²
```

Der Multiplikator ist dezimal `134.775.813`; der Skalierungsfaktor ist exakt
`2⁻³² = 2,3283064365386963 × 10⁻¹⁰`. Das Ergebnis liegt damit in `[0,1)`.

Beim Aufbau der Simulation wird vorher Delphis `Randomize` aufgerufen. Der
Startseed stammt deshalb aus einer Systemzeitfunktion und ist zwischen
Programmläufen nicht konstant. Für eine kompatible Browserfassung kann
derselbe Generator leicht mit 32-Bit-Überlauf nachgebildet werden. Für Tests
sollte zusätzlich eine explizite Seed-Schnittstelle vorgesehen werden.

### Wechselwirkungen nach Material

Die Simulation verwendet die oben beschriebenen gleichverteilten Zufallswerte
aus `[0,1)`.

#### Moderator, Typ 1

**Rekonstruiert:**

- Ein schnelles Neutron wird mit Wahrscheinlichkeit 5 % langsam.
- In einem zweiten unabhängigen Zufallstest wird das Neutron mit
  Wahrscheinlichkeit 0,3 % absorbiert.

Die zweite Prüfung wird auch nach einer möglichen Abbremsung durchgeführt.

#### Spaltstoff, Typ 2

Nur langsame Neutronen lösen im Spaltstoff die folgenden Prüfungen aus.

Für jede berührte Brennstoffzelle existiert ein Byte-Zähler `b` im Bereich
`0 … 10`. Die Spaltwahrscheinlichkeit lautet:

```text
p_spaltung = 0,02 × (10 - b) / 10
            = 0,002 × (10 - b)
```

Sie sinkt somit von 2 % bei `b=0` bis 0 % bei `b=10`.

Bei einer Spaltung:

- wird das einfallende Neutron deaktiviert;
- werden drei neue schnelle Neutronen am selben Ort erzeugt;
- erhalten alle drei eine unabhängige Zufallsrichtung mit Länge 5;
- wird der globale Spaltungszähler erhöht;
- wird bei aktivierter Option „Burnout“ der lokale Zähler `b` bis höchstens 10
  erhöht und die Zellenfarbe entsprechend abgedunkelt.

Wenn keine Spaltung stattfindet, folgt eine Absorptionsprüfung:

```text
p_absorption = 0,005 × b / 10
              = 0,0005 × b
```

Sie steigt von 0 % bei `b=0` bis 0,5 % bei `b=10`.

Die Option „Burnout/Abbrand“ ist damit nicht nur eine optische Anzeige. Ist sie
deaktiviert, wird `b` niemals erhöht: Die Spaltwahrscheinlichkeit bleibt
dauerhaft bei 2 % und die zusätzliche Absorptionswahrscheinlichkeit bei 0 %.
Das Einschalten aktiviert gleichzeitig die physikalische
Brennstofferschöpfung und ihre Farbdarstellung.

#### Absorber, Typ 3

**Rekonstruiert:**

- Langsame Neutronen werden immer absorbiert.
- Schnelle Neutronen werden mit Wahrscheinlichkeit 20 % absorbiert.

#### Leere Umgebung und Quelle

Für Typ 0 und Typ 5 ist keine eigene Absorptions- oder Spaltreaktion erkennbar.
Die Quelle ist damit primär ein sichtbarer Bereich plus ein separater
Emissionsmechanismus.

### Quellen

**Bestätigt:** Es existieren zwei Quellenmechanismen:

1. Bei eingeschalteter Neutronenquelle wird pro Timerdurchlauf mit
   Wahrscheinlichkeit 50 % ein schnelles Neutron bei `(263,441)` erzeugt.
2. Unabhängig davon wird pro Timerdurchlauf mit Wahrscheinlichkeit 1 % ein
   schnelles Untergrundneutron an einer gleichverteilten Position im gesamten
   `524 × 524`-Bereich erzeugt.

Beide Mechanismen beachten die Obergrenze von 100.000 Neutroneneinträgen.

## Leistung, Detektor und Schutzfunktionen

### Leistungsmodell

**Rekonstruiert:** Der Leistungswert ist kein thermohydraulisches Modell.
Er ist ein geglätteter Aktivitätsindikator. Ein Zähler `K` wird in jedem
Timerdurchlauf für jedes langsame Neutron erhöht, das eine Spaltstoffzelle
erreicht. Danach gilt:

```text
Leistung_neu = 0,9 × Leistung_alt + 0,01 × K
```

Der Wert wird auf zwei vertikale Balken aufgeteilt:

- `0 … 100` im normalen Leistungsbalken;
- der Anteil über 100 wird im oberen roten/gelben Balken mit Faktor 5
  dargestellt.

Ab einem Leistungswert über 120 wird automatisch eine Abschaltung ausgelöst:
Die Sicherheitslogik setzt den SCRAM-Zustand und fährt die Absorberstäbe ein.

### Neutronendetektor

**Bestätigt:** Der Detektorbalken besitzt vier wählbare Messbereiche. Der
interne Bereichsindex läuft von 2 bis 5. Beim Hochschalten wird das
Messbereichsmaximum mit 10 multipliziert, beim Herunterschalten durch 10
dividiert:

```text
100 → 1.000 → 10.000 → 100.000
```

Die Zahl der am Anfang des Durchlaufs vorhandenen aktiven Neutronen wird als
Fortschrittswert eingetragen. Neutronen, die während desselben Durchlaufs
deaktiviert werden, wirken sich deshalb erst im nächsten Durchlauf auf die
Anzeige aus.

Die intern mitgelieferte `TGauge`-Implementierung konnte ebenfalls statisch
rekonstruiert werden. Sie begrenzt den Fortschrittswert auf
`Minimum … Maximum` und liefert als Anzeigewert:

```text
Detektorprozent =
    trunc(100 × (Fortschritt - Minimum) / (Maximum - Minimum))
```

Hier ist `Minimum=0`. `trunc` schneidet in Richtung null ab; bei den hier nur
positiven Werten entspricht das dem Abrunden. Ein Fortschritt oberhalb des
Messbereichsmaximums wird vorher auf das Maximum begrenzt und ergibt somit
100 %.

Die Detektorfarbe wechselt bei einem Wert strikt über 80 % von Schwarz nach
Rot und bei einem Wert strikt unter 80 % wieder von Rot nach Schwarz. Bei
exakt 80 % bleibt die bisherige Farbe erhalten.

Die eingebetteten Warnmeldungen benennen die Schutzschwellen als:

- „Neutron Density > 90 % in selected measuring range“
- „Neutron Density < 3 % in selected measuring range“

### Automatische Abschaltungen

**Bestätigt:** Eine automatische Abschaltung erfolgt unter exakt folgenden
Bedingungen, sofern die Sicherheitsstäbe zuvor ausgefahren waren:

```text
Detektorprozent > 90
oder
(Detektorprozent < 3 und Messbereichsmaximum > 100)
oder
Leistung > 120
```

Die Unterbereichsabschaltung verhindert also den Betrieb in einem zu hohen
Messbereich, wenn die Anzeige dort unter 3 % fällt. Im niedrigsten Bereich
mit Maximum 100 ist diese Bedingung bewusst deaktiviert.

Alle Vergleiche sind strikt. Genau 90 %, 3 % oder 120 lösen die jeweilige
Schutzfunktion nicht aus.

Bei einer Abschaltung werden:

- beide Absorbergruppen vollständig bis `y=461` eingetragen;
- die Sicherheitskreis-Anzeige rot eingefärbt;
- im Meldungsfeld die auslösende Ursache angezeigt.

Für die manuelle Auslösung wird „Handauslösung“ beziehungsweise
„Manually Triggered Scram“ verwendet. Beim Versuch, die Sicherheitsstäbe in
einem höheren Messbereich auszufahren, erscheint:
„Neutronendetektor ist nicht im untersten Messbereich!“

### Horizontale und vertikale Dichteverteilungen

**Bestätigt:** Die beiden Diagramme sind keine momentanen vollständigen
2D-Auswertungen, sondern eindimensionale Histogramme durch ein 99 Zellen
breites Kreuz im Reaktormittelpunkt.

Für die horizontale Verteilung werden nur Neutronen mit

```text
213 ≤ y ≤ 311
```

gezählt. Der Histogrammindex ist ihre x-Koordinate `0 … 524`.

Für die vertikale Verteilung werden nur Neutronen mit

```text
213 ≤ x ≤ 311
```

gezählt. Der Histogrammindex ist ihre y-Koordinate `0 … 524`.

Für jede Richtung existieren drei Float-Arrays mit 525 Einträgen:

- schnelle Neutronen;
- langsame Neutronen;
- Spaltereignisse.

Die Zählung erfolgt vor der Bewegung des Neutrons im jeweiligen
Timerdurchlauf. Eine Messung läuft genau 100 Timerdurchläufe. Beim Start einer
Messung werden die drei Arrays auf null gesetzt.

Nach 100 Durchläufen wird ein gemeinsames Maximum über die schnellen und
langsamen Neutronenhistogramme gesucht. Der Startwert für das Maximum ist 1,
damit auch bei leeren Histogrammen keine Division durch null entsteht.
Beide Kurven werden durch dasselbe Maximum dividiert:

```text
schnell_normiert[i] = schnell[i] / Maximum
langsam_normiert[i] = langsam[i] / Maximum
```

Die Diagrammamplitude beträgt 100 Pixel. Langsame Neutronen werden grau,
schnelle Neutronen rot gezeichnet. Benachbarte Arraywerte `i-1` und `i`
werden durch Liniensegmente verbunden.

Das Spaltungsarray wird zwar gefüllt und bei der nächsten Messung gelöscht,
aber im vorhandenen Zeichencode nicht dargestellt. Dies ist sehr
wahrscheinlich ein unvollständig gebliebenes Feature.

Die horizontalen und vertikalen Routinen sind strukturell identisch; lediglich
Auswahlband, Indexrichtung und Bildschirmorientierung unterscheiden sich.

## Zeitverhalten

**Bestätigt:** Der Timer wird beim Start auf 20 ms gesetzt. Die Option
„Slow motion“ stellt ihn auf 100 ms um. Damit sind nominal vorgesehen:

| Modus | Timerintervall | Sollfrequenz |
|---|---:|---:|
| normal | 20 ms | 50 Hz |
| langsam | 100 ms | 10 Hz |

Die Anwendung misst zusätzlich die Rechenzeit eines Durchlaufs über einen
Performance-Counter. Die physikalische Schrittweite wird jedoch nicht mit der
tatsächlich vergangenen Zeit skaliert. Bei Überlastung läuft das Modell daher
in Simulationszeit langsamer.

## Oberfläche und Fenstermaße

Die folgenden Werte stammen aus der eingebetteten `TFORM1`-Ressource und sind
nicht aus dem Screenshot geschätzt.

### Hauptfenster

| Eigenschaft | Wert |
|---|---:|
| Fensterbreite | 913 |
| Fensterhöhe | 619 |
| Design-DPI | 96 |
| Skalierung | deaktiviert |
| Reaktorbildposition | `(16,16)` |
| Detektorbalken | `(568,56)`, `25 × 185` |
| Leistungsbalken normal | `(680,88)`, `25 × 153` |
| Leistungsbalken Überlast | `(680,56)`, `25 × 33` |
| Steuerstab-Spinbutton | `(576,304)`, `97 × 57` |

Weitere eingebettete Dialoge:

- horizontale Neutronendichteverteilung: Clientbereich `535 × 220`;
- vertikale Neutronendichteverteilung: Clientbereich `204 × 75`.

Beim erstmaligen Öffnen überschreibt der Programmcode diese Designmaße passend
zur Reaktorgrafik. Mit deren bestätigter Position `(16,16)` entstehen:

| Diagramm | Fenstergröße zur Laufzeit | Zeichenrahmen |
|---|---:|---:|
| horizontal | `572 × 166` | `(16,16)`, `524 × 102` |
| vertikal | `166 × 572` | `(16,16)`, `102 × 524` |

Die Anwendung enthält vollständige deutsche und englische Beschriftungen. Die
im DFM gespeicherten Startbeschriftungen sind englisch; der mit `Deutsch`
beschriftete Knopf bietet den Wechsel zur deutschen Oberfläche an.

### Sprachumschaltung

**Bestätigt:** Die Sprache wird nicht über Betriebssystemressourcen gewählt.
Der Sprachknopf prüft seine eigene aktuelle Beschriftung:

- steht dort `Deutsch`, werden deutsche Texte gesetzt und der Knopf erhält
  `English`;
- andernfalls werden englische Texte gesetzt und der Knopf erhält `Deutsch`.

Damit bezeichnet der Knopf jeweils die Sprache, zu der umgeschaltet werden
kann, nicht die momentan sichtbare Sprache.

Die statisch zugeordneten Texte sind:

| Deutsch | Englisch |
|---|---|
| Steuerstäbe | Control Rods |
| Neutronen- | Neutron |
| Optionen | Options |
| Leistung | Power |
| Neutronenquelle | Neutron Source |
| Sicherheitskreis | Safety Circuit |
| Spaltzone | Reactor Core |
| Mess- bereich | Measuring Range |
| Detektor | Detector |
| Neutronendichte- | Neutron Density |
| verteilungen | Distributions |
| Zeitlupe | Slow motion |
| Einfahren | IN |
| Ausfahren | OUT |
| RESA | SCRAM |
| Sicherheitsstab ausfahren | Safety rod up |
| höher | higher |
| tiefer | lower |
| Reflektor | Reflector |
| Moderatorablass | Drain Moderator |
| Abbrand | Burnout |
| Spaltungen gesamt: | Fissions, total: |

Auch Diagrammtitel und sämtliche Schutzmeldungen werden beim Umschalten
ersetzt. Die Materialgrafik selbst enthält keine sprachabhängigen Texte.

### Beobachtete Implementierungsbesonderheiten

Die folgenden Punkte sind im Maschinencode eindeutig erkennbar und sollten
bei der Neuimplementierung bewusst entweder kompatibel nachgebildet oder als
behobene Altfehler dokumentiert werden:

- Die Beschriftung „Spaltungen gesamt“ zeigt den Spaltungszähler des aktuellen
  Timerdurchlaufs. Der Zähler wird zu Beginn jedes Durchlaufs auf null gesetzt
  und ist somit nicht kumulativ.
- Ein Histogramm für Spaltorte wird gesammelt, aber niemals gezeichnet.
- Beim normalen Einschalten wird die Quelle als `8 × 8`-Quadrat gezeichnet.
  Nach dem Ausfahren der Sicherheitsstäbe wird nur ein inneres
  `5 × 5`-Quadrat erneut gezeichnet.
- Ein Zweig prüft, ob das Detektormaximum kleiner als 100 ist. Da der kleinste
  erlaubte Messbereich bereits 100 beträgt, ist dieser Zweig im normalen
  Programmzustand unerreichbar.
- Abhängig von der Neutronenzahl wird intern eine Variable auf 1, 4 oder 20
  gesetzt (`<1.000`, `<10.000`, sonst). Innerhalb des Timerereignisses wird
  dieser berechnete Wert anschließend nicht verwendet.
- Die Streurichtung im Material wird nicht normiert. Dadurch ändert sich die
  Neutronengeschwindigkeit nach einer Streuung, obwohl neu erzeugte Neutronen
  stets die Geschwindigkeit 5 erhalten.
- Der Reflektor besitzt kein eigenes physikalisches Verhalten, sondern
  verwendet exakt den Zelltyp und die Reaktionen des Moderators.

## Abgeleiteter Ablauf eines Timerdurchlaufs

Vereinfacht ergibt sich folgender Ablauf:

```text
1. Darstellungsfläche vorbereiten.
2. Änderungen an Reflektor und Rasterdarstellung übernehmen.
3. Für jedes zu Beginn vorhandene aktive Neutron:
   a. Dichteverteilungen aktualisieren.
   b. Gegebenenfalls an Material streuen.
   c. Position um den Geschwindigkeitsvektor verschieben.
   d. Neutron bei Verlassen des Rasters deaktivieren.
4. Detektorwert aus dem Bestand zu Beginn des Schritts aktualisieren.
5. Detektorgrenzen prüfen und gegebenenfalls SCRAM auslösen.
6. Für jedes noch aktive Neutron die Materialwechselwirkung ausführen.
7. Neutronenquelle und Untergrundquelle auswerten.
8. Inaktive Neutroneneinträge aus der Liste entfernen.
9. Leistungswert exponentiell glätten und Leistungsgrenze prüfen.
10. Leistung, Spaltungszähler und Warnungen aktualisieren.
11. Nach 100 Messdurchläufen Dichtekurven normieren und zeichnen.
12. Gemessene Rechenzeit anzeigen.
```

## Hinweise für die Neuimplementierung und Tests

Für eine originalgetreue, zugleich testbare Browserfassung sollte der
Simulationskern von der Darstellung getrennt werden:

- Ein injizierbarer, deterministisch seedbarer Zufallszahlengenerator macht
  Monte-Carlo-Abläufe reproduzierbar.
- Zelltypen sollten als benannte Konstanten oder Enum statt als rohe Zahlen
  implementiert werden.
- Ein `Uint8Array(525 * 525)` bildet beide Byte-Raster ohne
  Genauigkeitsverlust ab.
- Neutronen können in strukturparallelen Typed Arrays oder in einem
  vorallokierten Pool mit maximal 100.000 Einträgen gespeichert werden.
- Die originale 20-ms-Schrittlogik sollte als diskreter `step()` modelliert
  werden; die UI darf diesen Schritt nur takten.

Mindestens folgende automatische Tests lassen sich direkt aus den bestätigten
Konstanten ableiten:

1. Das Raster enthält exakt `525 × 525` Zellen.
2. Der Kern umfasst exakt die Koordinaten `64 … 460`.
3. Die vollständig eingefahrene Anordnung enthält 192 Spaltstoff-, 153
   Moderator- und 52 Absorberspalten.
4. Steuerstäbe bewegen sich in 5-Zellen-Schritten und niemals außerhalb
   `64 … 461`.
5. SCRAM setzt die Stabposition auf 461.
6. Die Prozentanzeige liefert bei 461 genau 0 % und bei 64 genau 100 %.
7. Moderatorablass entfernt jede Typ-1-Zelle.
8. Eine Spaltung erzeugt genau drei schnelle Neutronen und deaktiviert das
   auslösende Neutron.
9. Der Abbrandzähler bleibt im Bereich `0 … 10`.
10. Messbereiche wechseln exakt zwischen 100, 1.000, 10.000 und 100.000.
11. Slow motion wechselt das Sollintervall von 20 auf 100 ms.
12. Der Leistungsfilter erfüllt
    `P_neu = 0,9 × P_alt + 0,01 × K`.
13. Der Detektorwert entspricht
    `trunc(100 × Fortschritt / Messbereichsmaximum)`.
14. Automatischer Hochbereichs-SCRAM verwendet `>90`, nicht `≥90`.
15. Unterbereichs-SCRAM verwendet `<3` und ist bei Maximum 100 deaktiviert.
16. Eine Dichtemessung sammelt genau 100 Schritte im Mittelband
    `213 … 311`.
17. Schnelle und langsame Histogramme werden auf ein gemeinsames Maximum
    normiert.

## Offene Punkte

Die statisch klärbaren Punkte aus der ersten Analysefassung sind inzwischen
aufgearbeitet. Zurückgestellt bleiben nur Aufgaben, die eine Ausführung oder
eine Referenzaufzeichnung benötigen:

- visueller Pixelvergleich der tatsächlich von GDI/VCL gerenderten Oberfläche
  bei unterschiedlichen Windows-Themes und Schriftinstallationen;
- Prüfung des subjektiven Bediengefühls und der real erreichten
  Timerfrequenz unter Last;
- Beobachtung von Zufallsverteilungen über lange Läufe als Gegenprobe zur
  statisch rekonstruierten Vergleichsrichtung;
- Golden-Master-Aufzeichnungen von konkreten Läufen. Da die EXE ihren
  Zufallszahlengenerator intern initialisiert und keine Seed-Schnittstelle
  anbietet, sind identische Originalwiederholungen ohne zusätzliche
  Instrumentierung nicht garantiert;
- Verhalten bei Betriebssystemfehlern, Ressourcenmangel oder mehr als 100.000
  Neutronen.

Diese Punkte sind für die Struktur des Simulationskerns nicht blockierend und
können nach der ersten browserbasierten Implementierung als
Kompatibilitätsprüfung folgen.

## Analysewerkzeug

Das Hilfsskript `tools/parse_delphi_dfm.py` dekodiert die aus der EXE
extrahierten binären Delphi-Formularressourcen. Dadurch können Positionen,
Größen, Beschriftungen, Standardwerte und Ereignisnamen reproduzierbar geprüft
werden.

## Statische Fundstellen

Die wichtigsten rekonstruierten Ereignisroutinen liegen an folgenden virtuellen
Adressen. Diese Liste erleichtert spätere Gegenprüfungen mit einem anderen
Disassembler:

| Routine | Adresse |
|---|---:|
| Initialisierung der Raster und Neutronen | `0x45A8DC` |
| `FormCreate` | `0x45AB78` |
| `Timer1Timer` | `0x45AD04` |
| Messbereich höher | `0x45C3B8` |
| Messbereich tiefer | `0x45C484` |
| Neutronenquelle ein | `0x45C558` |
| Neutronenquelle aus | `0x45C5D8` |
| Sicherheitsstäbe ausfahren | `0x45C6E8` |
| manueller SCRAM | `0x45C85C` |
| Steuerstabbewegung abwärts | `0x45C948` |
| Steuerstabbewegung aufwärts | `0x45CB08` |
| Sprachumschaltung | `0x45CD04` |
| Moderatorablass | `0x45D89C` |
| horizontales Diagramm | `0x45D96C` |
| vertikales Diagramm | `0x45DC3C` |

Relevante Routinen der eingebetteten Gauge-Komponente:

| Funktion | Adresse |
|---|---:|
| Prozentberechnung | `0x45863C` / `0x458714` |
| Minimum setzen | `0x458F1C` |
| Maximum setzen | `0x458FCC` |
| Fortschritt begrenzen und setzen | `0x45907C` |

Zentrale Konstanten im Code:

| Adresse | Wert | Verwendung |
|---|---:|---|
| `0x45AB6C` | `524.0` | zufällige Startkoordinate |
| `0x45AB70` | `0.5` | Zentrierung der Zufallsrichtung |
| `0x45AB74` | `5.0` | Anfangsgeschwindigkeit |
| `0x45C348` | `0.05` | Moderationswahrscheinlichkeit |
| `0x45C354` | `0.003` | Absorption im Moderator |
| `0x45C360` | `0.02` | maximale Spaltwahrscheinlichkeit |
| `0x45C36C` | `10.0` | maximaler Abbrandzähler |
| `0x45C37C` | `0.005` | Abbrand-Absorptionsfaktor |
| `0x45C388` | `0.2` | schnelle Absorption im Stab |
| `0x45C394` | `0.01` | Untergrundquellenrate |
| `0x45C3A0` | `524.0` | Untergrundquellenbereich |
| `0x45C3A4` | `0.9` | Leistungsglättung |
| `0x45C3B0` | `100.0` | normale Leistungsskala |
| `0x45C3B4` | `120.0` | Leistungs-SCRAM-Grenze |
| `0x45CAEC` | `397.0` | Steuerstabweg |
