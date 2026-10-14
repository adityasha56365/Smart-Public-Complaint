import { useCallback, useEffect, useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import Status from "../../components/common/Status";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import { useAuth } from "../../hooks/useAuth";
import { usePreferences } from "../../hooks/usePreferences";
import { complaintService } from "../../services/services";
import NearestPublicOffices from "../../components/offices/NearestPublicOffices";
import type { Complaint } from "../../types";

export default function Home({ openReport, openDetail }: { openReport: () => void; openDetail: (id: number) => void }) {
  const { user } = useAuth();
  const { t } = usePreferences();
  
  // Use cached complaints if available to render instantly without 0-flicker
  const cached = complaintService.getCached({ page_size: 50 }) || complaintService.getCached({ page: 1, page_size: 50 });
  const [complaints, setComplaints] = useState<Complaint[]>(() => cached?.items || []);
  const [loading, setLoading] = useState(() => complaints.length === 0);
  const [error, setError] = useState("");

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await complaintService.list({ page_size: 50 });
      setComplaints(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setError("Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const now = new Date();
  const greetingKey = now.getHours() < 12 ? "good_morning" : now.getHours() < 18 ? "good_afternoon" : "good_evening";
  const greetingFallback = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const greeting = t(greetingKey, greetingFallback);
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const list = Array.isArray(complaints) ? complaints : [];
  const total = list.length;
  const active = list.filter(c => c && !["resolved", "closed", "rejected"].includes(c.status)).length;
  const resolved = list.filter(c => c && ["resolved", "closed"].includes(c.status)).length;

  const iconMap: Record<string, IconName> = {
    "roads & potholes": "road", "garbage & sanitation": "trash", "water supply": "water",
    "streetlights": "light", "parks & public property": "park", "drainage & sewage": "water",
  };
  const toneMap: Record<string, string> = {
    in_progress: "teal", assigned: "blue", resolved: "green", submitted: "amber",
    under_review: "amber", awaiting_info: "navy",
  };

  return (
    <div className="page home-page">
      <section className="welcome">
        <div>
          <span className="eyebrow">{dateStr}</span>
          <h2>{greeting}, {firstName}.</h2>
          <p>{t("home_subtitle", "Let's make your neighbourhood better, one report at a time.")}</p>
        </div>
      </section>
      <section className="report-hero">
        <div className="hero-copy">
          <span className="hero-kicker"><i></i> {t("quick_reporting", "QUICK REPORTING")}</span>
          <h2>{t("hero_title", "Spot a problem in your neighbourhood?")}</h2>
          <p>{t("hero_desc", "Report it in under two minutes. Add a photo, confirm the location, and we'll route it to the right team.")}</p>
          <button id="btn-report-problem" className="primary-button" onClick={openReport}>
            <Icon name="plus" /> {t("report_btn", "Report a problem")} <Icon name="arrow" />
          </button>
        </div>
        <div className="civic-visual" aria-hidden="true">
          <div className="sun"></div>
          <div className="cloud one"></div>
          <div className="cloud two"></div>
          <div className="building b1"><i></i><i></i><i></i></div>
          <div className="building b2"><i></i><i></i></div>
          <div className="building b3"><i></i><i></i><i></i></div>
          <div className="tree t1"></div>
          <div className="tree t2"></div>
          <div className="road-line"></div>
          <div className="location-pulse"><Icon name="pin" size={24} /></div>
        </div>
      </section>
      <section className="stats-grid">
        <div className="stat">
          <div className="stat-icon navy"><Icon name="file" /></div>
          <div>
            <span>{t("stat_submitted", "Submitted")}</span>
            <strong>{total}</strong>
            <small>{t("stat_all_time", "All time")}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon amber"><Icon name="clock" /></div>
          <div>
            <span>{t("stat_in_progress", "In progress")}</span>
            <strong>{active}</strong>
            <small>{t("stat_active_cases", "Active cases")}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon green"><Icon name="check" /></div>
          <div>
            <span>{t("stat_resolved", "Resolved")}</span>
            <strong>{resolved}</strong>
            <small>{total > 0 ? Math.round((resolved / total) * 100) : 0}% {t("stat_resolution_rate", "resolution rate")}</small>
          </div>
        </div>
      </section>
      <div className="content-grid">
        <section className="panel active-complaints">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("stay_informed", "STAY INFORMED")}</span>
              <h3>{t("active_complaints", "Active complaints")}</h3>
            </div>
            <button>{t("view_all", "View all")} <Icon name="arrow" size={17} /></button>
          </div>
          <div className="complaint-list">
            {loading && <div style={{ padding: 20 }}><Spinner /></div>}
            {error && <ErrorBanner message={error} onRetry={fetchComplaints} />}
            {!loading && list.slice(0, 2).map(c => {
              const icon = iconMap[c.category_name?.toLowerCase() || ""] || "building";
              const tone = toneMap[c.status] || "navy";
              const timeAgo = new Date(c.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
              return (
                <button className="complaint-row" key={c.id} onClick={() => openDetail(c.id)}>
                  <span className={`issue-icon ${tone}`}><Icon name={icon as IconName} /></span>
                  <span className="complaint-main">
                    <span className="complaint-meta">{c.reference_number} · {timeAgo}</span>
                    <strong>{c.title}</strong>
                    <small><Icon name="pin" size={14} />{c.location_address || "Location not specified"}</small>
                  </span>
                  <Status value={c.status} />
                  <Icon name="chevron" size={18} />
                </button>
              );
            })}
            {!loading && list.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                <p style={{ fontSize: 13 }}>{t("no_complaints_yet", "No complaints yet. Report your first issue!")}</p>
                <button className="primary-button" style={{ marginTop: 12 }} onClick={openReport}>
                  <Icon name="plus" /> {t("report_btn", "Report a problem")}
                </button>
              </div>
            )}
          </div>
        </section>
        <section className="panel neighbourhood">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("around_you", "AROUND YOU")}</span>
              <h3>{t("neighbourhood_pulse", "Neighbourhood pulse")}</h3>
            </div>
            <button className="icon-only"><Icon name="arrow" /></button>
          </div>
          <div className="map-card">
            <div className="map-roads"></div>
            <span className="map-label l1">Indiranagar</span>
            <span className="map-label l2">Domlur</span>
            <span className="map-pin p1 blue">3</span>
            <span className="map-pin p2 amber">2</span>
            <span className="map-pin p3 teal">4</span>
            <span className="you-dot"></span>
          </div>
          <div className="map-summary">
            <div><strong>9</strong><span>{t("open_nearby", "open nearby")}</span></div>
            <div><strong>14</strong><span>{t("resolved_this_week", "resolved this week")}</span></div>
          </div>
        </section>
      </div>

      {/* Nearest Important Public Offices Interactive Feature */}
      <NearestPublicOffices />
    </div>
  );
}
