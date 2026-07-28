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

Beim Programmstart werden zwei aktive schnelle Neutronen erzeugt. Ihre
Startposition ist gleichverteilt über das gesamte Raster. Auch ihre Richtung
wird zufällig gewählt und anschließend normiert.

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

### Wechselwirkungen nach Material

Die Simulation verwendet `Random()`-ähnliche, gleichverteilte Zufallswerte aus
`[0,1)`.

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

Die Zahl aktiver Neutronen wird pro Timerdurchlauf an den Detektor übergeben.
Die Oberfläche warnt beziehungsweise reagiert auf Schwellen von 90 und 3 im
vom Gauge zurückgegebenen Anzeigewert. Die eingebetteten Meldungen benennen
diese Schwellen als:

- „Neutron Density > 90 % in selected measuring range“
- „Neutron Density < 3 % in selected measuring range“

**Noch zu prüfen:** Die exakte Rundungs- und Sättigungslogik innerhalb der
Delphi-Komponente `TGauge` sollte durch einen dynamischen Vergleichstest
bestätigt werden.

### Automatische Abschaltungen

Im Code und in den eingebetteten Texten sind folgende Schutzbedingungen
erkennbar:

- Leistung über 120 %;
- Neutronendichte über 90 % im gewählten Messbereich;
- Neutronendichte unter 3 % im gewählten Messbereich unter einer zusätzlichen
  Bereichs-/Quellenbedingung;
- manuell ausgelöster SCRAM.

Die exakte UI-Abfolge der Unterbereichsabschaltung ist noch dynamisch zu
verifizieren. Das physische Ergebnis der Abschaltung ist dagegen eindeutig:
Absorberzellen werden bis zur Unterkante des Kerns eingetragen.

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

Die Anwendung enthält vollständige deutsche und englische Beschriftungen.

## Abgeleiteter Ablauf eines Timerdurchlaufs

Vereinfacht ergibt sich folgender Ablauf:

```text
1. Darstellungsfläche vorbereiten.
2. Änderungen an Reflektor und Rasterdarstellung übernehmen.
3. Für jedes aktive Neutron:
   a. Dichteverteilungen aktualisieren.
   b. Gegebenenfalls an Material streuen.
   c. Position um den Geschwindigkeitsvektor verschieben.
   d. Neutron bei Verlassen des Rasters deaktivieren.
   e. Materialwechselwirkung ausführen.
4. Neutronenquelle und Untergrundquelle auswerten.
5. Inaktive Neutroneneinträge aus der Liste entfernen.
6. Leistungswert exponentiell glätten.
7. Detektor, Leistung, Zähler und Warnungen aktualisieren.
8. Gegebenenfalls automatische Abschaltung auslösen.
9. In Intervallen von 100 Durchläufen Dichtekurven normieren/zeichnen.
10. Gemessene Rechenzeit anzeigen.
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

## Offene Punkte

Für die nächsten Analyseschritte bleiben insbesondere:

- dynamischer Abgleich der Zufallsvergleiche und der genauen
  Gauge-Sättigung;
- vollständige Rekonstruktion der horizontalen und vertikalen
  Dichteverteilungsdiagramme;
- exakte Zuordnung aller deutschen und englischen UI-Zustände;
- Prüfung von Startzustand und Bedienablauf unter einer geeigneten
  Windows-/Wine-Umgebung;
- Golden-Master-Aufzeichnungen mit festem Zufallsseed für die spätere
  Browserimplementierung.

## Analysewerkzeug

Das Hilfsskript `tools/parse_delphi_dfm.py` dekodiert die aus der EXE
extrahierten binären Delphi-Formularressourcen. Dadurch können Positionen,
Größen, Beschriftungen, Standardwerte und Ereignisnamen reproduzierbar geprüft
werden.

