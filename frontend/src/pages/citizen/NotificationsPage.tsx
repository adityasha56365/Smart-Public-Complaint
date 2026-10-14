import { useCallback, useEffect, useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { notificationService } from "../../services/services";
import type { Notification } from "../../types";

export default function NotificationsPage() {
  const cached = notificationService.getCached();
  const [notifications, setNotifications] = useState<Notification[]>(() => cached || []);
  const [loading, setLoading] = useState(() => !cached);

  const fetch = useCallback(async () => {
    try {
      const data = await notificationService.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      /**/
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(n => (Array.isArray(n) ? n.map(x => ({ ...x, is_read: true })) : []));
    } catch {
      /**/
    }
  };

  const iconMap: Record<string, IconName> = {
    submitted: "file", assigned: "building", in_progress: "clock",
    resolved: "check", awaiting_info: "bell",
  };

  const list = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">LATEST UPDATES</span>
          <h2>Notifications</h2>
          <p>Important updates on your complaints and local services.</p>
        </div>
        <button className="text-button" onClick={markAllRead}>
          Mark all as read
        </button>
      </div>
      <section className="panel notifications">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        {!loading && list.map((n) => {
          const icon = iconMap[n.title.toLowerCase().includes("assigned") ? "assigned" : "submitted"] || "bell";
          return (
            <div
              className={`notification ${!n.is_read ? "unread" : ""}`}
              key={n.id}
              onClick={() => notificationService.markRead(n.id).catch(() => {})}
            >
              <span className="notification-icon"><Icon name={icon as IconName} /></span>
              <div>
                <strong>{n.title}</strong>
                <p>{n.message}</p>
                <small>
                  {new Date(n.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
              {!n.is_read && <i className="unread-dot"></i>}
            </div>
          );
        })}
        {!loading && notifications.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            <Icon name="bell" size={32} />
            <p style={{ marginTop: 12, fontSize: 13 }}>No notifications yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
