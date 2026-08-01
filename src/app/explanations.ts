import type { Language } from "../i18n/translations";
import type { Original12Snapshot } from "../simulation/models/original12/types";

export type ExplanationId =
  | "overview"
  | "reactor"
  | "detector"
  | "range"
  | "power"
  | "fissions"
  | "safety"
  | "controlRods"
  | "source"
  | "reflector"
  | "burnout"
  | "moderatorDrain"
  | "histograms";

export interface Explanation {
  readonly title: string;
  readonly what: string;
  readonly effect: string;
  readonly dependsOn: string;
  readonly current: string;
}

type StaticExplanation = Omit<Explanation, "current">;

const copy: Record<Language, Record<ExplanationId, StaticExplanation>> = {
  de: {
    overview: {
      title: "Simulation erkunden",
      what:
        "Bewege den Zeiger über einen Bereich oder fokussiere ihn mit der Tastatur.",
      effect:
        "Hier erscheinen seine Wirkung, Abhängigkeiten und der aktuelle Zustand.",
      dependsOn:
        "Auf Touch-Geräten genügt ein Antippen. Die normale Bedienung bleibt aktiv.",
    },
    reactor: {
      title: "Reaktoransicht",
      what:
        "Das Raster zeigt Moderator, Spaltstoff, Absorber und Quelle sowie schnelle und langsame Neutronen.",
      effect:
        "Gelber Moderator bremst schnelle Neutronen. Langsame Neutronen können im grünen Spaltstoff Spaltungen auslösen.",
      dependsOn:
        "Quelle → schnelle Neutronen → Moderator → langsame Neutronen → Spaltungen → Leistung.",
    },
    detector: {
      title: "Neutronendetektor",
      what:
        "Der Detektor setzt die simulierte Neutronenzahl in einen Prozentwert des gewählten Messbereichs um.",
      effect:
        "Über 90 % warnt der Schutz. Unter 3 % kann ein zu hoher Messbereich ebenfalls eine Abschaltung auslösen.",
      dependsOn:
        "Abhängig von Neutronenzahl und Messbereich; er verändert den Reaktor selbst nicht.",
    },
    range: {
      title: "Messbereich",
      what:
        "Der Messbereich bestimmt, welche Neutronenzahl als 100 % angezeigt wird.",
      effect:
        "Ein höherer Bereich senkt den angezeigten Prozentwert, ein niedrigerer erhöht ihn. Die Neutronenzahl bleibt gleich.",
      dependsOn:
        "Zum Scharfschalten des Sicherheitskreises ist der Bereich 10² erforderlich.",
    },
    power: {
      title: "Leistung",
      what:
        "Ein geglätteter Aktivitätsindikator des vereinfachten Modells, keine reale physikalische Leistungsangabe.",
      effect:
        "Viele Spaltungen lassen den Wert steigen. Oberhalb von 120 löst der scharfe Sicherheitskreis einen SCRAM aus.",
      dependsOn:
        "Spaltungen → geglättete Aktivität → Leistungsanzeige.",
    },
    fissions: {
      title: "Spaltungen",
      what:
        "Eine Spaltung entsteht, wenn ein geeignetes Neutron im Spaltstoff reagiert.",
      effect:
        "Dabei entstehen neue schnelle Neutronen. So kann eine Kettenreaktion entstehen.",
      dependsOn:
        "Abhängig von langsamen Neutronen, vorhandenem Spaltstoff und bei aktiviertem Abbrand von dessen Zustand.",
    },
    safety: {
      title: "Sicherheitskreis",
      what:
        "Die Sicherheitsstäbe bilden die vereinfachte Schutzfunktion des Modells.",
      effect:
        "Im scharfen Zustand führen Grenzwertverletzungen zum SCRAM: absorbierende Stäbe werden sofort eingefahren.",
      dependsOn:
        "Das Scharfschalten benötigt Messbereich 10². Erst danach lassen sich die Steuerstäbe ausfahren.",
    },
    controlRods: {
      title: "Steuerstäbe",
      what:
        "Die blauen Stäbe absorbieren Neutronen im Reaktor.",
      effect:
        "Einfahren senkt gewöhnlich Neutronenzahl und Aktivität; Ausfahren kann beide erhöhen.",
      dependsOn:
        "Ausfahren ist nur bei scharfem Sicherheitskreis möglich. Steuerstäbe ─| Neutronen → Spaltungen → Leistung.",
    },
    source: {
      title: "Neutronenquelle",
      what:
        "Die braune Quelle bringt zusätzliche schnelle Neutronen in die Simulation ein.",
      effect:
        "Sie erleichtert den Start. Eine bereits laufende Kettenreaktion kann auch nach dem Ausschalten weiterbestehen.",
      dependsOn:
        "Quelle → schnelle Neutronen; Moderator und Reflektor beeinflussen deren weiteren Weg.",
    },
    reflector: {
      title: "Moderierender Reflektor",
      what:
        "Der gelbe Rand bremst und reflektiert Neutronen, die die Spaltzone verlassen.",
      effect:
        "Mehr Neutronen können als langsame Neutronen in die Spaltzone zurückkehren.",
      dependsOn:
        "Wirkt auf schnelle Neutronen und erhöht indirekt die Chance weiterer Spaltungen.",
    },
    burnout: {
      title: "Abbrand",
      what:
        "Abbrand bildet den fortschreitenden Verbrauch des Spaltstoffs vereinfacht ab.",
      effect:
        "Verbrauchter Spaltstoff wird dunkler und seine Spaltwahrscheinlichkeit sinkt.",
      dependsOn:
        "Abhängig von bisherigen Spaltungen an der jeweiligen Stelle im Raster.",
    },
    moderatorDrain: {
      title: "Moderator ablassen",
      what:
        "Diese Aktion entfernt den Moderator aus dem Reaktorkern.",
      effect:
        "Schnelle Neutronen werden kaum noch abgebremst; dadurch werden weitere Spaltungen unwahrscheinlicher.",
      dependsOn:
        "Bis zum nächsten Reset nicht rückgängig zu machen.",
    },
    histograms: {
      title: "Dichteverteilungen",
      what:
        "Die Diagramme sammeln über 100 Schritte, wo Neutronen und Spaltungen auftreten.",
      effect:
        "Horizontale und vertikale Profile machen räumliche Schwerpunkte sichtbar.",
      dependsOn:
        "Die Kurven hängen vom aktuellen Messfenster und den ausgewählten sichtbaren Datenreihen ab.",
    },
  },
  en: {
    overview: {
      title: "Explore the simulation",
      what: "Move the pointer over an area or focus it with the keyboard.",
      effect:
        "Its effect, dependencies, and current state will appear here.",
      dependsOn:
        "On touch devices, simply tap it. Normal controls remain active.",
    },
    reactor: {
      title: "Reactor view",
      what:
        "The grid shows moderator, fuel, absorbers, and source as well as fast and slow neutrons.",
      effect:
        "Yellow moderator slows fast neutrons. Slow neutrons can trigger fissions in green fuel.",
      dependsOn:
        "Source → fast neutrons → moderator → slow neutrons → fissions → power.",
    },
    detector: {
      title: "Neutron detector",
      what:
        "The detector converts the simulated neutron count into a percentage of the selected range.",
      effect:
        "Above 90% the protection warns. Below 3%, an excessively high range can also trigger a shutdown.",
      dependsOn:
        "Depends on neutron count and measurement range; it does not change the reactor itself.",
    },
    range: {
      title: "Measurement range",
      what: "The range determines which neutron count is displayed as 100%.",
      effect:
        "A higher range lowers the displayed percentage and a lower range raises it. The neutron count stays unchanged.",
      dependsOn:
        "The 10² range is required for arming the safety circuit.",
    },
    power: {
      title: "Power",
      what:
        "A smoothed activity indicator in the simplified model, not a real physical power measurement.",
      effect:
        "Many fissions raise the value. Above 120, the armed safety circuit triggers a SCRAM.",
      dependsOn: "Fissions → smoothed activity → power display.",
    },
    fissions: {
      title: "Fissions",
      what: "A fission occurs when a suitable neutron reacts in the fuel.",
      effect:
        "It produces new fast neutrons. This can create a chain reaction.",
      dependsOn:
        "Depends on slow neutrons, available fuel, and, when enabled, its burnup state.",
    },
    safety: {
      title: "Safety circuit",
      what:
        "The safety rods form the simplified protection function in this model.",
      effect:
        "When armed, crossing a protection limit causes a SCRAM: absorbing rods are inserted immediately.",
      dependsOn:
        "Arming requires the 10² range. Only then can the control rods be withdrawn.",
    },
    controlRods: {
      title: "Control rods",
      what: "The blue rods absorb neutrons in the reactor.",
      effect:
        "Inserting them usually reduces neutron count and activity; withdrawing them can increase both.",
      dependsOn:
        "Withdrawal requires an armed safety circuit. Control rods ─| neutrons → fissions → power.",
    },
    source: {
      title: "Neutron source",
      what:
        "The brown source adds fast neutrons to the simulation.",
      effect:
        "It helps to start the reaction. An established chain reaction may continue after it is switched off.",
      dependsOn:
        "Source → fast neutrons; moderator and reflector affect their subsequent path.",
    },
    reflector: {
      title: "Moderating reflector",
      what:
        "The yellow border slows and reflects neutrons leaving the fission zone.",
      effect:
        "More neutrons can return to the fission zone as slow neutrons.",
      dependsOn:
        "Acts on fast neutrons and indirectly increases the chance of further fissions.",
    },
    burnout: {
      title: "Burnup",
      what: "Burnup provides a simplified model of fuel consumption over time.",
      effect:
        "Consumed fuel becomes darker and its fission probability decreases.",
      dependsOn: "Depends on previous fissions at each location in the grid.",
    },
    moderatorDrain: {
      title: "Drain moderator",
      what: "This action removes the moderator from the reactor core.",
      effect:
        "Fast neutrons are barely slowed, making further fissions less likely.",
      dependsOn: "Cannot be undone before the next reset.",
    },
    histograms: {
      title: "Density distributions",
      what:
        "The plots collect where neutrons and fissions occur over 100 steps.",
      effect:
        "Horizontal and vertical profiles reveal where activity is concentrated.",
      dependsOn:
        "The curves depend on the current measurement window and selected visible data series.",
    },
  },
};

function number(value: number, language: Language, digits = 0): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function currentText(
  id: ExplanationId,
  snapshot: Original12Snapshot,
  language: Language,
): string {
  const de = language === "de";
  const enabled = (value: boolean) =>
    value ? (de ? "eingeschaltet" : "enabled") : de ? "ausgeschaltet" : "disabled";

  switch (id) {
    case "overview":
      return de
        ? `Die Simulation befindet sich bei Schritt ${number(snapshot.step, language)}.`
        : `The simulation is at step ${number(snapshot.step, language)}.`;
    case "reactor":
      return de
        ? `Aktuell: ${number(snapshot.fastNeutronCount, language)} schnelle und ${number(snapshot.slowNeutronCount, language)} langsame Neutronen.`
        : `Currently: ${number(snapshot.fastNeutronCount, language)} fast and ${number(snapshot.slowNeutronCount, language)} slow neutrons.`;
    case "detector":
      return de
        ? `Aktuell ${snapshot.detectorPercent} % bei ${number(snapshot.neutronCount, language)} Neutronen${snapshot.detectorWarning ? "; Warnbereich erreicht" : ""}.`
        : `Currently ${snapshot.detectorPercent}% with ${number(snapshot.neutronCount, language)} neutrons${snapshot.detectorWarning ? "; warning range reached" : ""}.`;
    case "range":
      return de
        ? `Gewählt ist 10${["", "", "²", "³", "⁴", "⁵"][snapshot.detectorRangeIndex]}; das entspricht maximal ${number(snapshot.detectorMaximum, language)} Neutronen.`
        : `10${["", "", "²", "³", "⁴", "⁵"][snapshot.detectorRangeIndex]} is selected; this represents a maximum of ${number(snapshot.detectorMaximum, language)} neutrons.`;
    case "power":
      return de
        ? `Der geglättete Indikator steht bei ${number(snapshot.power, language, 1)}.`
        : `The smoothed indicator is at ${number(snapshot.power, language, 1)}.`;
    case "fissions":
      return de
        ? `In diesem Schritt: ${number(snapshot.fissionsThisStep, language)}; seit Start: ${number(snapshot.fissionsTotal, language)}.`
        : `This step: ${number(snapshot.fissionsThisStep, language)}; since start: ${number(snapshot.fissionsTotal, language)}.`;
    case "safety":
      if (snapshot.protectionState === "tripped") {
        return de ? "Aktuell: SCRAM ausgelöst." : "Current state: SCRAM triggered.";
      }
      if (snapshot.protectionState === "armed") {
        return de ? "Aktuell: Sicherheitskreis scharf." : "Current state: safety circuit armed.";
      }
      return snapshot.detectorMaximum === 100
        ? de
          ? "Aktuell nicht scharf; der erforderliche Messbereich 10² ist eingestellt."
          : "Currently not armed; the required 10² range is selected."
        : de
          ? "Aktuell gesperrt: zuerst Messbereich 10² einstellen."
          : "Currently locked: select the 10² range first.";
    case "controlRods":
      return de
        ? `Aktuell ${number(snapshot.controlRodPercent, language, 1)} % ausgefahren${snapshot.protectionState === "armed" ? "" : "; Ausfahren ist ohne scharfen Sicherheitskreis gesperrt"}.`
        : `Currently ${number(snapshot.controlRodPercent, language, 1)}% withdrawn${snapshot.protectionState === "armed" ? "" : "; withdrawal is locked until the safety circuit is armed"}.`;
    case "source":
      return de
        ? `Die Neutronenquelle ist ${enabled(snapshot.sourceEnabled)}.`
        : `The neutron source is ${enabled(snapshot.sourceEnabled)}.`;
    case "reflector":
      return de
        ? `Der Reflektor ist ${enabled(snapshot.reflectorEnabled)}.`
        : `The reflector is ${enabled(snapshot.reflectorEnabled)}.`;
    case "burnout":
      return de
        ? `Die Abbrandberechnung ist ${enabled(snapshot.burnoutEnabled)}.`
        : `Burnup calculation is ${enabled(snapshot.burnoutEnabled)}.`;
    case "moderatorDrain":
      return snapshot.moderatorDrained
        ? de
          ? "Der Moderator wurde abgelassen; ein Reset stellt ihn wieder her."
          : "The moderator has been drained; a reset restores it."
        : de
          ? "Der Moderator ist vorhanden."
          : "The moderator is present.";
    case "histograms":
      return de
        ? `Das aktuelle Messfenster ist bei ${snapshot.horizontalHistogram.progress}/100 Schritten.`
        : `The current measurement window is at ${snapshot.horizontalHistogram.progress}/100 steps.`;
  }
}

export function getExplanation(
  id: ExplanationId,
  snapshot: Original12Snapshot,
  language: Language,
): Explanation {
  return {
    ...copy[language][id],
    current: currentText(id, snapshot, language),
  };
}
