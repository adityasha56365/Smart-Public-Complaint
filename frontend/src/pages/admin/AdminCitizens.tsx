import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { userService } from "../../services/services";
import { downloadCSV } from "../../utils/csvExport";
import type { PaginatedResponse, User } from "../../types";

export default function AdminCitizens() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchCitizens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({ page, page_size: 20, role: "citizen", search: search || undefined });
      setData(res);
    } catch {
      /**/
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCitizens();
  }, [fetchCitizens]);

  const toggleActive = async (u: User) => {
    setUpdatingId(u.id);
    try {
      await userService.update(u.id, { is_active: !u.is_active });
      fetchCitizens();
    } catch {
      /**/
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">CITIZENS</span>
          <h1>Citizens &amp; users</h1>
          <p>View citizen accounts and manage access if needed.</p>
        </div>
        <button
          className="secondary-button"
          onClick={() =>
            data &&
            downloadCSV(
              ["User ID", "Full Name", "Email", "Phone", "Status", "Joined Date"],
              data.items.map(u => [
                u.id,
                u.full_name,
                u.email || "",
                u.phone || "",
                u.is_active ? "Active" : "Suspended",
                new Date(u.created_at).toLocaleDateString("en-IN"),
              ]),
              `citizens-${Date.now()}.csv`
            )
          }
        >
          <Icon name="download" /> Export
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="admin-search" style={{ maxWidth: 400 }}>
          <Icon name="search" />
          <input
            placeholder="Search by name or email"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      <section className="admin-panel">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(u => (
              <tr key={u.id}>
                <td>
                  <strong style={{ fontSize: 10, color: "var(--navy)" }}>{u.full_name}</strong>
                  <small style={{ display: "block", fontSize: 8, color: "var(--muted)" }}>#{u.id}</small>
                </td>
                <td>{u.email || "—"}</td>
                <td>{u.phone || "—"}</td>
                <td><span className={`status ${u.is_active ? "resolved" : "rejected"}`}><span></span>{u.is_active ? "Active" : "Suspended"}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                <td>
                  <button
                    className="secondary-button"
                    style={{ minHeight: 30, padding: "0 10px", fontSize: 9 }}
                    onClick={() => toggleActive(u)}
                    disabled={updatingId === u.id}
                  >
                    {updatingId === u.id ? <Spinner /> : u.is_active ? "Suspend" : "Restore"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && data?.items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  No citizens found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data && data.total > 20 && (
          <div className="pagination">
            <span>{data.total} registered citizens</span>
            <div>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
