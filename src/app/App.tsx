import { useEffect, useMemo, useState } from "react";
import {
  HistogramCanvas,
  type HistogramVisibility,
} from "../rendering/HistogramCanvas";
import { OriginalReactorCanvas } from "../components/original12/OriginalReactorCanvas";
import type {
  Original12Snapshot,
  ScramReason,
} from "../simulation/models/original12/types";
import {
  GRID_SIZE,
  MAX_NEUTRONS,
  ROD_INSERTED_END,
  ROD_WITHDRAWN_END,
} from "../simulation/models/original12/constants";
import {
  initialLanguage,
  translations,
  type Language,
  type TranslationKey,
} from "../i18n/translations";
import { createRandomSeed, parseSeed } from "./seed";
import { useSimulationSnapshot } from "./useSimulationSnapshot";
import { WorkerClient } from "./workerClient";
import { isKineyDeployment } from "./deploymentHost";
import type { DiagnosticScenario } from "../runtime/protocol";

const client = new WorkerClient();
const WEB_VERSION = "1.0.0";
const IMPRINT_URL = "https://blog.kiney.de/impressum/";

function reasonKey(reason: ScramReason): TranslationKey {
  return {
    manual: "reasonManual",
    "detector-high": "reasonDetectorHigh",
    "detector-low-range": "reasonDetectorLow",
    "power-high": "reasonPowerHigh",
  }[reason] as TranslationKey;
}

function rejectionKey(reason: string): TranslationKey | null {
  return {
    "safety-circuit-not-armed": "armedRequired",
    "control-rod-end-stop": "rodEndStop",
    "detector-range-must-be-100": "rangeRequired",
    "safety-rods-already-withdrawn": "safetyAlready",
    "moderator-already-drained": "moderatorAlready",
    "detector-range-end-stop": "rangeEndStop",
    "pause-required": "pauseRequired",
  }[reason] as TranslationKey | undefined ?? null;
}

function format(value: number, language: Language, digits = 0): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function strongest(values: Float32Array): number {
  let index = 0;
  for (let cursor = 1; cursor < values.length; cursor += 1) {
    if (values[cursor] > values[index]) index = cursor;
  }
  return index;
}

function Gauge({
  value,
  maximum,
  warning,
  label,
  text,
  markers = [],
  powerZones = false,
}: {
  value: number;
  maximum: number;
  warning?: boolean;
  label: string;
  text: string;
  markers?: readonly number[];
  powerZones?: boolean;
}) {
  const percent = Math.max(0, Math.min(100, (100 * value) / maximum));
  return (
    <div className="gauge">
      <div className="gauge-row">
        <span>{label}</span>
        <strong>{text}</strong>
      </div>
      <div
        className={`gauge-track${warning ? " warning" : ""}${
          powerZones ? " power-zones" : ""
        }`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={maximum}
        aria-valuenow={value}
        aria-valuetext={text}
      >
        <span style={{ width: `${percent}%` }} />
        {markers.map((marker) => (
          <i
            aria-hidden="true"
            className="gauge-marker"
            key={marker}
            style={{ left: `${marker}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function InstrumentPanel({
  snapshot,
  language,
  t,
}: {
  snapshot: Original12Snapshot;
  language: Language;
  t: (key: TranslationKey) => string;
}) {
  return (
    <section className="instrument-grid" aria-label={t("detector")}>
      <article className="card instrument">
        <h2>{t("detector")}</h2>
        <Gauge
          label={t("detector")}
          value={snapshot.detectorPercent}
          maximum={100}
          warning={snapshot.detectorWarning}
          text={`${snapshot.detectorPercent} %`}
          markers={[3, 80, 90]}
        />
        <div className="metric-pair">
          <span>
            {t("range")}{" "}
            <strong>
              10
              <sup>{["", "", "²", "³", "⁴", "⁵"][snapshot.detectorRangeIndex]}</sup>
            </strong>
          </span>
          <span>
            {t("neutrons")}{" "}
            <strong>{format(snapshot.neutronCount, language)}</strong>
          </span>
        </div>
        <div className="button-row">
          <button
            type="button"
            disabled={snapshot.detectorRangeIndex === 2}
            onClick={() =>
              client.model({ type: "change-range", direction: "lower" })
            }
          >
            − <span>{t("lowerRange")}</span>
          </button>
          <button
            type="button"
            disabled={snapshot.detectorRangeIndex === 5}
            onClick={() =>
              client.model({ type: "change-range", direction: "higher" })
            }
          >
            + <span>{t("higherRange")}</span>
          </button>
        </div>
      </article>

      <article className="card instrument">
        <h2>{t("power")}</h2>
        <Gauge
          label={t("power")}
          value={snapshot.power}
          maximum={120}
          warning={snapshot.power > 100}
          text={format(snapshot.power, language, 1)}
          markers={[100 / 1.2, 100]}
          powerZones
        />
        <p className="muted">{t("powerHelp")}</p>
      </article>

      <article className="card instrument">
        <h2>{t("fissions")}</h2>
        <div className="large-metrics">
          <span>
            <small>{t("thisStep")}</small>
            {format(snapshot.fissionsThisStep, language)}
          </span>
          <span>
            <small>{t("sinceStart")}</small>
            {format(snapshot.fissionsTotal, language)}
          </span>
        </div>
      </article>
    </section>
  );
}

export function App() {
  const state = useSimulationSnapshot(client);
  const showImprint = isKineyDeployment(window.location.hostname);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [initialSeed] = useState(() => {
    const requestedSeed = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get("diagnosticSeed")
      : null;
    return requestedSeed === null
      ? createRandomSeed()
      : (parseSeed(requestedSeed) ?? createRandomSeed());
  });
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const [confirmDrain, setConfirmDrain] = useState(false);
  const [scramRequested, setScramRequested] = useState(false);
  const [showBands, setShowBands] = useState(
    () => localStorage.getItem("nuclear-reactor-bands") === "true",
  );
  const [pendingReset, setPendingReset] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [histogramVisibility, setHistogramVisibility] =
    useState<HistogramVisibility>({
      fast: true,
      slow: true,
      fissions: false,
      current: true,
      previous: true,
    });
  const t = useMemo(
    () => (key: TranslationKey) => translations[language][key],
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("nuclear-reactor-language", language);
  }, [language]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const diagnosticValue = import.meta.env.DEV
      ? parameters.get("diagnosticNeutrons")
      : null;
    const diagnosticNeutronCount =
      diagnosticValue === null ? Number.NaN : Number(diagnosticValue);
    const validDiagnosticCount =
      Number.isInteger(diagnosticNeutronCount) &&
      diagnosticNeutronCount >= 0 &&
      diagnosticNeutronCount <= MAX_NEUTRONS
        ? diagnosticNeutronCount
        : undefined;
    const requestedScenario = import.meta.env.DEV
      ? parameters.get("diagnosticScenario")
      : null;
    const diagnosticScenarios: ReadonlyArray<DiagnosticScenario> = [
      "detector-high",
      "detector-high-boundary",
      "detector-low",
      "detector-low-boundary",
      "power-high",
      "power-boundary",
      "burnout",
    ];
    const diagnosticScenario = diagnosticScenarios.find(
      (candidate) => candidate === requestedScenario,
    );
    const diagnosticPaused =
      import.meta.env.DEV && parameters.get("diagnosticPaused") === "true";
    client.initialize(
      initialSeed,
      validDiagnosticCount === undefined &&
        diagnosticScenario === undefined &&
        !diagnosticPaused,
      validDiagnosticCount,
      diagnosticScenario,
    );
    client.setMaximumPublicationRate(20);
    const refreshAfterVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        client.requestFullSnapshot();
      }
    };
    document.addEventListener("visibilitychange", refreshAfterVisibilityChange);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        refreshAfterVisibilityChange,
      );
  }, [initialSeed]);

  useEffect(() => {
    if (state.snapshot?.protectionState === "tripped") {
      setScramRequested(false);
    }
  }, [state.snapshot?.protectionState]);

  const snapshot = state.snapshot;
  if (!snapshot) {
    return (
      <main className="loading">
        <h1>{t("product")}</h1>
        <p>{state.fatalError ? t("workerError") : `${t("model")} …`}</p>
        {state.fatalError && (
          <button type="button" onClick={() => client.restart(initialSeed)}>
            {t("restartWorker")}
          </button>
        )}
      </main>
    );
  }

  const resetWithInput = () => {
    const seed = parseSeed(seedInput);
    if (seed === null) {
      setSeedError(true);
      return;
    }
    setSeedError(false);
    requestReset(seed);
  };
  const requestReset = (seed: number) => {
    if (snapshot.step > 5) setPendingReset(seed);
    else client.runtime({ type: "reset", seed });
  };
  const requestScram = () => {
    setScramRequested(true);
    client.model({ type: "scram" });
  };
  const alarmText =
    scramRequested && snapshot.protectionState !== "tripped"
      ? t("scramPending")
      : snapshot.protectionState === "tripped"
      ? `${t("alarmTripped")}: ${
          snapshot.lastScram ? t(reasonKey(snapshot.lastScram.reason)) : ""
        }`
      : snapshot.protectionState === "armed"
        ? snapshot.detectorWarning
          ? `${t("alarmArmed")} · ${t("detectorWarning")}`
          : t("alarmArmed")
        : snapshot.detectorWarning
          ? `${t("alarmInserted")} · ${t("detectorWarning")}`
          : t("alarmInserted");

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{t("model")}</p>
          <h1>{t("product")}</h1>
        </div>
        <div className="header-status">
          <span className={`status-dot ${state.running ? "running" : ""}`}>
            {state.running ? t("running") : t("paused")} · {t("step")}{" "}
            {format(snapshot.step, language)}
          </span>
          <button
            type="button"
            className="scram mobile-scram"
            onClick={requestScram}
          >
            {t("scram")}
          </button>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="primary"
            onClick={() =>
              client.runtime({ type: state.running ? "pause" : "start" })
            }
          >
            {state.running ? t("pause") : t("start")}
          </button>
          <button
            type="button"
            disabled={state.running}
            onClick={() => client.runtime({ type: "step-once" })}
          >
            {t("stepOnce")}
          </button>
          <label>
            <span>{t("speed")}</span>
            <select
              value={state.speed}
              onChange={(event) =>
                client.runtime({
                  type: "set-speed",
                  speed: event.target.value as "normal" | "slow",
                })
              }
            >
              <option value="normal">{t("normal")}</option>
              <option value="slow">{t("slow")}</option>
            </select>
          </label>
          <label>
            <span>{t("language")}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="de">{t("languageGerman")}</option>
              <option value="en">{t("languageEnglish")}</option>
            </select>
          </label>
        </div>
      </header>

      <div
        className={`alarm-banner ${snapshot.protectionState}${
          scramRequested ? " requested" : ""
        }${
          snapshot.detectorWarning && snapshot.protectionState !== "tripped"
            ? " warning"
            : ""
        }`}
        role="status"
        aria-live="polite"
      >
        {alarmText}
        {snapshot.protectionState === "tripped" && (
          <span className="alarm-step">
            {" "}
            · {t("step")} {snapshot.lastScram?.step ?? snapshot.step}
          </span>
        )}
      </div>

      {state.fatalError && (
        <div className="error-banner" role="alert">
          {t("workerError")} {state.fatalError}
          <button
            type="button"
            onClick={() => client.restart(snapshot.seed)}
          >
            {t("restartWorker")}
          </button>
        </div>
      )}
      {state.lastRejection && (
        <div className="notice" role="status">
          {t("rejected")}:{" "}
          {rejectionKey(state.lastRejection.reason)
            ? t(rejectionKey(state.lastRejection.reason)!)
            : state.lastRejection.reason}
        </div>
      )}

      <div className="workspace">
        <section className="card reactor-panel" aria-labelledby="reactor-title">
          <div className="section-heading">
            <h2 id="reactor-title">{t("reactor")}</h2>
            <div className="chips">
              {snapshot.sourceEnabled && <span>{t("source")}</span>}
              {snapshot.reflectorEnabled && <span>{t("reflector")}</span>}
              {snapshot.burnoutEnabled && <span>{t("burnout")}</span>}
            </div>
          </div>
          <OriginalReactorCanvas
            snapshot={snapshot}
            label={t("reactorSummary")}
            showBands={showBands}
          />
          <label className="band-toggle">
            <input
              type="checkbox"
              checked={showBands}
              onChange={(event) => {
                setShowBands(event.target.checked);
                localStorage.setItem(
                  "nuclear-reactor-bands",
                  String(event.target.checked),
                );
              }}
            />
            {t("showMeasurementBands")}
          </label>
          <div className="legend" aria-label={t("legend")}>
            {[
              ["empty", "empty"],
              ["moderator", "moderator"],
              ["fuel", "fuel"],
              ["absorber", "absorber"],
              ["sourceMaterial", "source"],
              ["fast", "fast-particle"],
              ["slowNeutrons", "slow-particle"],
            ].map(([key, className]) => (
              <span key={key}>
                <i className={className} aria-hidden="true" />
                {t(key as TranslationKey)}
              </span>
            ))}
          </div>
        </section>

        <aside className="control-column">
          <InstrumentPanel snapshot={snapshot} language={language} t={t} />

          <section className="card controls" aria-labelledby="safety-title">
            <h2 id="safety-title">{t("safety")}</h2>
            <button
              type="button"
              className="scram"
              onClick={requestScram}
            >
              {t("scram")}
            </button>
            <button
              type="button"
              disabled={
                snapshot.detectorMaximum !== 100 ||
                snapshot.protectionState === "armed"
              }
              aria-describedby={
                snapshot.detectorMaximum !== 100 ? "range-lock-help" : undefined
              }
              onClick={() => client.model({ type: "withdraw-safety-rods" })}
            >
              {t("withdrawSafety")}
            </button>
            <p id="range-lock-help" className="muted">
              {t("rangeRequired")}
            </p>
          </section>

          <section className="card controls" aria-labelledby="rods-title">
            <div className="section-heading">
              <h2 id="rods-title">{t("controlRods")}</h2>
              <strong>
                {format(snapshot.controlRodPercent, language, 1)} %
              </strong>
            </div>
            <div className="rod-indicator" aria-hidden="true">
              <span style={{ height: `${100 - snapshot.controlRodPercent}%` }} />
            </div>
            <div className="button-row">
              <button
                type="button"
                disabled={snapshot.controlRodEnd === ROD_INSERTED_END}
                onClick={() =>
                  client.model({
                    type: "move-control-rods",
                    direction: "in",
                  })
                }
              >
                ↓ {t("insert")}
              </button>
              <button
                type="button"
                disabled={
                  snapshot.controlRodEnd === ROD_WITHDRAWN_END ||
                  snapshot.protectionState !== "armed"
                }
                aria-describedby={
                  snapshot.protectionState !== "armed"
                    ? "armed-lock-help"
                    : undefined
                }
                onClick={() =>
                  client.model({
                    type: "move-control-rods",
                    direction: "out",
                  })
                }
              >
                ↑ {t("withdraw")}
              </button>
            </div>
            <p id="armed-lock-help" className="muted">
              {t("armedRequired")}
            </p>
          </section>

          <section className="card controls options" aria-label={t("source")}>
            {[
              ["source", snapshot.sourceEnabled, "set-source"],
              ["reflector", snapshot.reflectorEnabled, "set-reflector"],
              ["burnout", snapshot.burnoutEnabled, "set-burnout"],
            ].map(([label, enabled, type]) => (
              <label className="toggle" key={String(type)}>
                <span>{t(label as TranslationKey)}</span>
                <input
                  type="checkbox"
                  checked={Boolean(enabled)}
                  onChange={(event) =>
                    client.model({
                      type: type as
                        | "set-source"
                        | "set-reflector"
                        | "set-burnout",
                      enabled: event.target.checked,
                    })
                  }
                />
              </label>
            ))}
            {!snapshot.moderatorDrained &&
              (confirmDrain ? (
                <div className="confirm-panel" role="alertdialog">
                  <p>{t("drainQuestion")}</p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        client.model({ type: "drain-moderator" });
                        setConfirmDrain(false);
                      }}
                    >
                      {t("confirmDrain")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDrain(false)}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="danger-secondary"
                  onClick={() => setConfirmDrain(true)}
                >
                  {t("drain")}
                </button>
              ))}
          </section>
        </aside>
      </div>

      <section className="histogram-grid">
        {[
          [t("horizontal"), snapshot.horizontalHistogram, false],
          [t("vertical"), snapshot.verticalHistogram, true],
        ].map(([title, histogram, vertical]) => (
          <article
            className="card histogram-panel"
            key={String(title)}
            data-has-current={Boolean(
              (histogram as Original12Snapshot["horizontalHistogram"]).current,
            )}
            data-has-previous={Boolean(
              (histogram as Original12Snapshot["horizontalHistogram"]).previous,
            )}
          >
            <div className="section-heading">
              <h2>{String(title)}</h2>
              <span>
                {t("histogramProgress")}{" "}
                {(histogram as Original12Snapshot["horizontalHistogram"]).progress}
                /100
              </span>
            </div>
          <HistogramCanvas
              histogram={
                histogram as Original12Snapshot["horizontalHistogram"]
              }
              vertical={Boolean(vertical)}
              visibility={histogramVisibility}
              summary={
                (histogram as Original12Snapshot["horizontalHistogram"]).current
                  ? `${String(title)}: ${t("curveMaximum")} ${
                      (histogram as Original12Snapshot["horizontalHistogram"])
                        .current!.maximum
                    }; ${t("fast")} ${t("maximumBin")} ${strongest(
                      (histogram as Original12Snapshot["horizontalHistogram"])
                        .current!.fast,
                    )}; ${t("slowNeutrons")} ${t("maximumBin")} ${strongest(
                      (histogram as Original12Snapshot["horizontalHistogram"])
                        .current!.slow,
                    )}; ${t("measurementProgress")} ${
                      (histogram as Original12Snapshot["horizontalHistogram"])
                        .progress
                    }/100`
                  : t("noMeasurement")
              }
            />
            <div className="curve-legend" aria-label={t("curveSelection")}>
              {[
                ["fast", "fast", "fast-line"],
                ["slow", "slowNeutrons", "slow-line"],
                ["fissions", "fissionSites", "fission-line"],
                ["current", "currentWindow", "current-window"],
                ["previous", "previousWindow", "previous-window"],
              ].map(([visibilityKey, labelKey, className]) => {
                const key = visibilityKey as keyof HistogramVisibility;
                return (
                  <button
                    type="button"
                    className={`curve-toggle ${className}`}
                    aria-pressed={histogramVisibility[key]}
                    key={key}
                    onClick={() =>
                      setHistogramVisibility((current) => ({
                        ...current,
                        [key]: !current[key],
                      }))
                    }
                  >
                    {t(labelKey as TranslationKey)}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
        <button
          type="button"
          className="reset-histograms"
          onClick={() => client.model({ type: "reset-histograms" })}
        >
          {t("resetMeasurements")}
        </button>
      </section>

      <section className="card reset-panel" aria-labelledby="reset-title">
        <h2 id="reset-title">{t("reset")}</h2>
        <div className="reset-actions">
          <button
            type="button"
            onClick={() =>
              requestReset(snapshot.seed)
            }
          >
            {t("sameSeed")}
          </button>
          <button
            type="button"
            onClick={() =>
              requestReset(createRandomSeed())
            }
          >
            {t("newSeed")}
          </button>
          <label>
            <span>{t("customSeed")}</span>
            <input
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              placeholder={t("seedPlaceholder")}
              aria-invalid={seedError}
              aria-describedby={seedError ? "seed-error" : undefined}
            />
          </label>
          <button type="button" onClick={resetWithInput}>
            {t("reset")}
          </button>
        </div>
        {seedError && (
          <p id="seed-error" className="field-error">
            {t("invalidSeed")}
          </p>
        )}
        {pendingReset !== null && (
          <div className="confirm-panel reset-confirm" role="alertdialog">
            <p>{t("restartQuestion")}</p>
            <div className="button-row">
              <button
                type="button"
                className="danger"
                onClick={() => {
                  client.runtime({ type: "reset", seed: pendingReset });
                  setPendingReset(null);
                }}
              >
                {t("confirmReset")}
              </button>
              <button type="button" onClick={() => setPendingReset(null)}>
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card diagnostics" aria-labelledby="diagnostics-title">
        <h2 id="diagnostics-title">{t("diagnostics")}</h2>
        <dl>
          <div>
            <dt>{t("seedLabel")}</dt>
            <dd>{snapshot.seed}</dd>
          </div>
          <div>
            <dt>{t("modelVersion")}</dt>
            <dd>{snapshot.modelId} / {snapshot.modelVersion}</dd>
          </div>
          <div>
            <dt>{t("schemaVersion")}</dt>
            <dd>{snapshot.snapshotSchemaVersion}</dd>
          </div>
          <div>
            <dt>{t("webVersion")}</dt>
            <dd>{WEB_VERSION}</dd>
          </div>
          <div>
            <dt>{t("configuration")}</dt>
            <dd>
              {snapshot.configuration.profile} · {GRID_SIZE} × {GRID_SIZE} ·{" "}
              {t("lcgLabel")} · {t("source")}{" "}
              {snapshot.sourceEnabled ? t("on") : t("off")} · {t("reflector")}{" "}
              {snapshot.reflectorEnabled ? t("on") : t("off")} · {t("burnout")}{" "}
              {snapshot.burnoutEnabled ? t("on") : t("off")} · {t("moderator")}{" "}
              {snapshot.moderatorDrained ? t("drained") : t("present")}
            </dd>
          </div>
          {snapshot.lastScram && (
            <div>
              <dt>{t("lastScram")}</dt>
              <dd>
                {t(reasonKey(snapshot.lastScram.reason))} · {t("step")}{" "}
                {snapshot.lastScram.step}
              </dd>
            </div>
          )}
        </dl>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(String(snapshot.seed));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? t("seedCopied") : t("copySeed")}
        </button>
      </section>

      <details className="card help">
        <summary>{t("help")}</summary>
        <p>{t("helpText")}</p>
        <p>{t("physicsHelp")}</p>
      </details>

      {showImprint && (
        <footer className="app-footer">
          <a href={IMPRINT_URL}>{t("imprint")}</a>
        </footer>
      )}
    </main>
  );
}
