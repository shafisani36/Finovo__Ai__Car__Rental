import { useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  DAMAGE_CATEGORIES,
  DAMAGE_SEVERITIES,
  NON_CHARGEABLE_CATEGORIES,
  inspectionApi,
  type InspectionReport,
  type InspectionView,
  type ManualFindingInput,
} from "../api/inspectionApi";
import { VEHICLE_PANELS } from "./vehiclePanels";
import { VIEW_LABELS } from "./inspectionHelpers";

/** Close-ups that are only read for their numbers, never checked for damage */
const DOCUMENT_VIEWS: InspectionView[] = ["ODOMETER", "CHASSIS_NUMBER"];
const MAX_FINDINGS = 40;

const CARD: CSSProperties = {
  border: "1px solid #ECEAEF",
  borderRadius: "12px",
  padding: "14px",
  background: "#FFFFFF",
};
const INPUT: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #ECEAEF",
  backgroundColor: "#F7F5F8",
  boxSizing: "border-box",
  font: "inherit",
  fontSize: "0.85rem",
};
const LABEL: CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#685D73",
  marginBottom: "4px",
};
const BUTTON: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "10px 16px",
  borderRadius: "8px",
  border: "1px solid #ECEAEF",
  background: "#FFFFFF",
  fontWeight: 700,
  cursor: "pointer",
};

type Draft = {
  key: number;
  view: InspectionView;
  panel: string;
  category: ManualFindingInput["category"];
  severity: ManualFindingInput["severity"];
  description: string;
  newDamage: boolean;
  chargeAmount: string;
};

interface ManualReviewPanelProps {
  report: InspectionReport;
  currency: string;
  /** Called with the reviewed inspection once staff saved the damage */
  onDone: (report: InspectionReport) => void;
  /** Runs the AI again on the same photos (the page still holds them) */
  onRetryAi?: () => void;
  retrying?: boolean;
}

function panelsFor(view: InspectionView): string[] {
  const visible = Object.keys(VEHICLE_PANELS).filter((p) =>
    VEHICLE_PANELS[p].views.includes(view),
  );
  return visible.length > 0 ? visible : Object.keys(VEHICLE_PANELS);
}

/**
 * Shown when the AI could not check the photos: staff look at each photo, record every damage by hand and
 * save. Pickup damage becomes the rental baseline; new damage on a return becomes a proposed charge.
 */
export function ManualReviewPanel({
  report,
  currency,
  onDone,
  onRetryAi,
  retrying,
}: ManualReviewPanelProps) {
  const { t } = useTranslation();
  const isReturn = report.type === "RETURN";
  const photos = useMemo(
    () => report.photos.filter((p) => !DOCUMENT_VIEWS.includes(p.view)),
    [report.photos],
  );
  const pickup = report.comparison?.pickupInspection ?? null;
  const pickupPhoto = (view: InspectionView) =>
    pickup?.photos.find((p) => p.view === view);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewLabel = (view: InspectionView) =>
    t(`inspectionReport.views.${view}`, { defaultValue: VIEW_LABELS[view] });

  const addDraft = () => {
    const view = photos[0]?.view ?? "FRONT";
    setDrafts((prev) => [
      ...prev,
      {
        key: nextKey,
        view,
        panel: panelsFor(view)[0],
        category: "SCRATCH",
        severity: "LOW",
        description: "",
        newDamage: isReturn,
        chargeAmount: "",
      },
    ]);
    setNextKey((k) => k + 1);
  };

  const update = (key: number, change: Partial<Draft>) =>
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const next = { ...d, ...change };
        // A new angle may not show the chosen part: pick the first part visible from it
        if (change.view && !panelsFor(change.view).includes(next.panel))
          next.panel = panelsFor(change.view)[0];
        return next;
      }),
    );

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const findings: ManualFindingInput[] = drafts.map((d) => ({
        view: d.view,
        panel: d.panel,
        category: d.category,
        severity: d.severity,
        description: d.description.trim() || undefined,
        ...(isReturn
          ? {
              newDamage: d.newDamage,
              chargeAmount:
                d.newDamage && d.chargeAmount !== ""
                  ? Number(d.chargeAmount)
                  : undefined,
            }
          : {}),
      }));
      const res = await inspectionApi.completeManualReview(
        report.id,
        findings,
        notes.trim() || undefined,
      );
      onDone(res.inspection);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("inspectionReport.manual.errSave"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="no-print"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        marginTop: "16px",
      }}
    >
      <div
        style={{
          ...CARD,
          borderColor: "#F59E0B",
          background: "rgba(245, 158, 11, 0.08)",
          display: "flex",
          gap: "12px",
        }}
      >
        <AlertTriangle size={22} color="#B45309" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: "#92400E" }}>
            {t("inspectionReport.manual.pendingTitle")}
          </strong>
          <p
            style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#78350F" }}
          >
            {isReturn
              ? t("inspectionReport.manual.helpReturn")
              : t("inspectionReport.manual.helpPickup")}
          </p>
          {report.aiUnavailableReason && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.78rem",
                color: "#92400E",
              }}
            >
              {report.aiUnavailableReason}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        {photos.map((photo) => {
          const before = isReturn ? pickupPhoto(photo.view) : undefined;
          return (
            <figure
              key={photo.id}
              style={{ ...CARD, margin: 0, padding: "10px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: before ? "1fr 1fr" : "1fr",
                  gap: "6px",
                }}
              >
                {before && (
                  <a
                    href={before.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={t("inspectionReport.manual.openPhoto")}
                  >
                    <img
                      src={before.imageUrl}
                      alt={t("inspectionReport.manual.pickupAlt", {
                        view: viewLabel(photo.view),
                      })}
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        display: "block",
                      }}
                    />
                  </a>
                )}
                <a
                  href={photo.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={t("inspectionReport.manual.openPhoto")}
                >
                  <img
                    src={photo.imageUrl}
                    alt={t("inspectionReport.photoAlt", {
                      view: viewLabel(photo.view),
                    })}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      display: "block",
                    }}
                  />
                </a>
              </div>
              <figcaption
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginTop: "6px",
                }}
              >
                {viewLabel(photo.view)}
                {before && (
                  <span style={{ color: "#6B7280", fontWeight: 400 }}>
                    {" "}
                    · {t("inspectionReport.manual.pickupVsReturn")}
                  </span>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>

      {isReturn && pickup && (
        <div style={{ ...CARD, fontSize: "0.85rem" }}>
          <strong>
            {t("inspectionReport.manual.pickupDamage", {
              count: pickup.findings.length,
            })}
          </strong>
          {pickup.findings.length > 0 && (
            <ul
              style={{
                margin: "6px 0 0",
                paddingInlineStart: "18px",
                color: "#4B5563",
              }}
            >
              {pickup.findings.map((f) => (
                <li key={f.id}>
                  {t(`inspectionReport.categories.${f.category}`, {
                    defaultValue: f.damageType,
                  })}{" "}
                  · {f.panel ? t(`inspectionReport.panels.${f.panel}`) : f.part}{" "}
                  · {t(`inspectionReport.severities.${f.severity}`)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {drafts.map((d, index) => {
          const chargeable = !NON_CHARGEABLE_CATEGORIES.includes(d.category);
          return (
            <div
              key={d.key}
              style={{
                ...CARD,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "10px",
                alignItems: "end",
              }}
            >
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ fontSize: "0.88rem" }}>
                  {t("inspectionReport.manual.damageNumber", {
                    number: index + 1,
                  })}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    setDrafts((prev) => prev.filter((x) => x.key !== d.key))
                  }
                  aria-label={t("inspectionReport.manual.remove")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#B91C1C",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div>
                <label htmlFor={`mr-view-${d.key}`} style={LABEL}>
                  {t("inspectionReport.manual.photo")}
                </label>
                <select
                  id={`mr-view-${d.key}`}
                  style={INPUT}
                  value={d.view}
                  onChange={(e) =>
                    update(d.key, { view: e.target.value as InspectionView })
                  }
                >
                  {photos.map((p) => (
                    <option key={p.view} value={p.view}>
                      {viewLabel(p.view)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`mr-panel-${d.key}`} style={LABEL}>
                  {t("inspectionReport.manual.part")}
                </label>
                <select
                  id={`mr-panel-${d.key}`}
                  style={INPUT}
                  value={d.panel}
                  onChange={(e) => update(d.key, { panel: e.target.value })}
                >
                  {panelsFor(d.view).map((p) => (
                    <option key={p} value={p}>
                      {t(`inspectionReport.panels.${p}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`mr-cat-${d.key}`} style={LABEL}>
                  {t("inspectionReport.manual.type")}
                </label>
                <select
                  id={`mr-cat-${d.key}`}
                  style={INPUT}
                  value={d.category}
                  onChange={(e) =>
                    update(d.key, {
                      category: e.target.value as Draft["category"],
                    })
                  }
                >
                  {DAMAGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`inspectionReport.categories.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`mr-sev-${d.key}`} style={LABEL}>
                  {t("inspectionReport.manual.severity")}
                </label>
                <select
                  id={`mr-sev-${d.key}`}
                  style={INPUT}
                  value={d.severity}
                  onChange={(e) =>
                    update(d.key, {
                      severity: e.target.value as Draft["severity"],
                    })
                  }
                >
                  {DAMAGE_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {t(`inspectionReport.severities.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor={`mr-desc-${d.key}`} style={LABEL}>
                  {t("inspectionReport.manual.description")}
                </label>
                <input
                  id={`mr-desc-${d.key}`}
                  style={INPUT}
                  maxLength={300}
                  value={d.description}
                  onChange={(e) =>
                    update(d.key, { description: e.target.value })
                  }
                />
              </div>
              {isReturn && (
                <>
                  <label
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={d.newDamage}
                      onChange={(e) =>
                        update(d.key, { newDamage: e.target.checked })
                      }
                    />
                    {t("inspectionReport.manual.newDamage")}
                  </label>
                  {d.newDamage && chargeable && (
                    <div>
                      <label htmlFor={`mr-charge-${d.key}`} style={LABEL}>
                        {t("inspectionReport.manual.charge", { currency })}
                      </label>
                      <input
                        id={`mr-charge-${d.key}`}
                        type="number"
                        min={0}
                        step="0.01"
                        style={INPUT}
                        placeholder={t(
                          "inspectionReport.manual.chargePlaceholder",
                        )}
                        value={d.chargeAmount}
                        onChange={(e) =>
                          update(d.key, { chargeAmount: e.target.value })
                        }
                      />
                    </div>
                  )}
                  {d.newDamage && !chargeable && (
                    <span style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                      {t("inspectionReport.manual.notCharged")}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
        {drafts.length < MAX_FINDINGS && (
          <button
            type="button"
            onClick={addDraft}
            style={{ ...BUTTON, alignSelf: "flex-start" }}
          >
            <Plus size={16} />
            {t("inspectionReport.manual.addDamage")}
          </button>
        )}
      </div>

      <div>
        <label htmlFor="mr-notes" style={LABEL}>
          {t("inspectionReport.manual.notes")}
        </label>
        <textarea
          id="mr-notes"
          rows={2}
          maxLength={1000}
          style={INPUT}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <div
          role="alert"
          style={{ color: "#B91C1C", fontWeight: 600, fontSize: "0.88rem" }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {onRetryAi && (
          <button
            type="button"
            onClick={onRetryAi}
            disabled={retrying || saving}
            style={{ ...BUTTON, opacity: retrying ? 0.6 : 1 }}
          >
            <RefreshCw size={16} />
            {retrying
              ? t("inspectionReport.manual.retrying")
              : t("inspectionReport.manual.retryAi")}
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || retrying}
          style={{
            ...BUTTON,
            background: "#1E0426",
            color: "#FFFFFF",
            border: "none",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving
            ? t("inspectionReport.manual.saving")
            : drafts.length === 0
              ? t("inspectionReport.manual.saveNoDamage")
              : t("inspectionReport.manual.save", { count: drafts.length })}
        </button>
      </div>
      {isReturn &&
        drafts.some(
          (d) =>
            d.newDamage &&
            !NON_CHARGEABLE_CATEGORIES.includes(d.category) &&
            d.chargeAmount === "",
        ) && (
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "#6B7280",
              textAlign: "end",
            }}
          >
            {t("inspectionReport.manual.defaultChargeNote")}
          </p>
        )}
    </section>
  );
}
