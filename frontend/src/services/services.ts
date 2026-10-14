/** Complaint, category, department, notification, and admin API services. */
import api from "./api";
import type {
  AuditLog,
  Category,
  Complaint,
  ComplaintDetail,
  DashboardStats,
  Department,
  DepartmentWithStats,
  Notification,
  PaginatedResponse,
  ReportSummary,
  User,
} from "../types";

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

export interface CreateComplaintPayload {
  title: string;
  description: string;
  category_id?: number;
  location_address?: string;
  location_landmark?: string;
  location_lat?: number;
  location_lng?: number;
  ward?: string;
  zone?: string;
  priority?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface ComplaintFilters {
  page?: number;
  page_size?: number;
  status?: string;
  category_id?: number;
  search?: string;
}

// ---------------------------------------------------------------------------
// Complaints Cache (in-memory SWR to prevent 0-flashing on page switches)
// ---------------------------------------------------------------------------
let complaintsCache: Record<string, { data: PaginatedResponse<Complaint>; timestamp: number }> = {};
const CACHE_TTL_MS = 60000; // 60s cache

export const complaintService = {
  getCached(filters: ComplaintFilters = {}): PaginatedResponse<Complaint> | null {
    const key = JSON.stringify(filters);
    const hit = complaintsCache[key];
    if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) {
      return hit.data;
    }
    return null;
  },

  clearCache() {
    complaintsCache = {};
  },

  async create(payload: CreateComplaintPayload): Promise<Complaint> {
    const { data } = await api.post<Complaint>("/complaints", payload);
    complaintsCache = {}; // invalidate cache so new complaint appears immediately
    return data;
  },

  async list(filters: ComplaintFilters = {}): Promise<PaginatedResponse<Complaint>> {
    const key = JSON.stringify(filters);
    const { data } = await api.get<PaginatedResponse<Complaint>>("/complaints", { params: filters });
    complaintsCache[key] = { data, timestamp: Date.now() };
    return data;
  },

  async get(id: number): Promise<ComplaintDetail> {
    const { data } = await api.get<ComplaintDetail>(`/complaints/${id}`);
    return data;
  },

  async updateStatus(id: number, status: string, reason?: string, resolution?: string): Promise<Complaint> {
    const { data } = await api.patch<Complaint>(`/complaints/${id}/status`, {
      status,
      reason,
      resolution_details: resolution,
    });
    complaintsCache = {};
    return data;
  },

  async assign(id: number, payload: { officer_id?: number; department_id?: number; notes?: string }): Promise<Complaint> {
    const { data } = await api.post<Complaint>(`/complaints/${id}/assign`, payload);
    complaintsCache = {};
    return data;
  },

  async uploadAttachment(id: number, file: File, onProgress?: (pct: number) => void): Promise<{ id: number; url?: string; data_url?: string }> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`/complaints/${id}/attachments`, form, {
      headers: { "Content-Type": undefined },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    complaintsCache = {};
    return data;
  },

  async addComment(id: number, content: string) {
    const { data } = await api.post(`/complaints/${id}/comments`, { content });
    return data;
  },

  async addInternalNote(id: number, content: string) {
    const { data } = await api.post(`/complaints/${id}/internal-notes`, { content });
    return data;
  },

  async submitFeedback(id: number, rating: number, comment?: string) {
    const { data } = await api.post(`/complaints/${id}/feedback`, { rating, comment });
    return data;
  },
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

let categoriesCache: { data: Category[]; timestamp: number } | null = null;

export const categoryService = {
  getCached(): Category[] | null {
    if (categoriesCache && Date.now() - categoriesCache.timestamp < 120000) {
      return categoriesCache.data;
    }
    return null;
  },

  async list(): Promise<Category[]> {
    if (categoriesCache && Date.now() - categoriesCache.timestamp < 60000) {
      return categoriesCache.data;
    }
    const { data } = await api.get<Category[]>("/categories");
    categoriesCache = { data, timestamp: Date.now() };
    return data;
  },

  async create(payload: { name: string; description?: string; icon?: string; department_id?: number }): Promise<Category> {
    const { data } = await api.post<Category>("/categories", payload);
    categoriesCache = null;
    return data;
  },
};

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

let departmentsCache: { data: Department[]; timestamp: number } | null = null;
let deptStatsCache: { data: DepartmentWithStats[]; timestamp: number } | null = null;

export const departmentService = {
  getCached(): Department[] | null {
    if (departmentsCache && Date.now() - departmentsCache.timestamp < 120000) {
      return departmentsCache.data;
    }
    return null;
  },

  getCachedWithStats(): DepartmentWithStats[] | null {
    if (deptStatsCache && Date.now() - deptStatsCache.timestamp < 60000) {
      return deptStatsCache.data;
    }
    return null;
  },

  async list(force = false): Promise<Department[]> {
    if (!force && departmentsCache && Date.now() - departmentsCache.timestamp < 30000) {
      return departmentsCache.data;
    }
    const { data } = await api.get<Department[]>("/departments");
    departmentsCache = { data, timestamp: Date.now() };
    return data;
  },

  async listWithStats(force = false): Promise<DepartmentWithStats[]> {
    if (!force && deptStatsCache && Date.now() - deptStatsCache.timestamp < 30000) {
      return deptStatsCache.data;
    }
    const { data } = await api.get<DepartmentWithStats[]>("/departments/with-stats");
    deptStatsCache = { data, timestamp: Date.now() };
    return data;
  },

  async create(payload: { name: string; description?: string; jurisdiction?: string }): Promise<Department> {
    const { data } = await api.post<Department>("/departments", payload);
    departmentsCache = null;
    deptStatsCache = null;
    return data;
  },

  async update(id: number, payload: { name?: string; description?: string; jurisdiction?: string; is_active?: boolean }): Promise<Department> {
    const { data } = await api.put<Department>(`/departments/${id}`, payload);
    departmentsCache = null;
    deptStatsCache = null;
    return data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/departments/${id}`);
    departmentsCache = null;
    deptStatsCache = null;
  },
};

// ---------------------------------------------------------------------------
// Users / Officers
// ---------------------------------------------------------------------------

let officersCache: { data: User[]; timestamp: number } | null = null;

export const userService = {
  getCachedOfficers(): User[] | null {
    if (officersCache && Date.now() - officersCache.timestamp < 60000) {
      return officersCache.data;
    }
    return null;
  },

  async list(params?: { page?: number; page_size?: number; role?: string; search?: string }): Promise<PaginatedResponse<User>> {
    const { data } = await api.get<PaginatedResponse<User>>("/users", { params });
    return data;
  },

  async listOfficers(): Promise<User[]> {
    if (officersCache && Date.now() - officersCache.timestamp < 30000) {
      return officersCache.data;
    }
    const { data } = await api.get<User[]>("/users/officers");
    officersCache = { data, timestamp: Date.now() };
    return data;
  },

  async create(payload: {
    full_name: string;
    email?: string;
    phone?: string;
    password: string;
    role: string;
    department_id?: number;
  }): Promise<User> {
    const { data } = await api.post<User>("/users", payload);
    officersCache = null;
    return data;
  },

  async update(id: number, payload: { full_name?: string; role?: string; is_active?: boolean; department_id?: number }): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, payload);
    officersCache = null;
    return data;
  },
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

let notifCache: { data: Notification[]; timestamp: number } | null = null;

export const notificationService = {
  getCached(): Notification[] | null {
    if (notifCache && Date.now() - notifCache.timestamp < 60000) {
      return notifCache.data;
    }
    return null;
  },

  async list(): Promise<Notification[]> {
    const { data } = await api.get<Notification[]>("/notifications");
    notifCache = { data, timestamp: Date.now() };
    return data;
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/mark-all-read");
    if (notifCache) {
      notifCache.data = notifCache.data.map(n => ({ ...n, is_read: true }));
    }
  },

  async markRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
    if (notifCache) {
      notifCache.data = notifCache.data.map(n => (n.id === id ? { ...n, is_read: true } : n));
    }
  },
};

// ---------------------------------------------------------------------------
// Admin / Reports
// ---------------------------------------------------------------------------

let statsCache: { data: DashboardStats; timestamp: number } | null = null;
let reportsCache: Record<number, { data: ReportSummary; timestamp: number }> = {};

export const adminService = {
  getCachedStats(): DashboardStats | null {
    if (statsCache && Date.now() - statsCache.timestamp < 60000) {
      return statsCache.data;
    }
    return null;
  },

  async stats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>("/admin/stats");
    statsCache = { data, timestamp: Date.now() };
    return data;
  },

  getCachedReports(days: number = 30): ReportSummary | null {
    const hit = reportsCache[days];
    if (hit && Date.now() - hit.timestamp < 60000) {
      return hit.data;
    }
    return null;
  },

  async reports(days = 30): Promise<ReportSummary> {
    const { data } = await api.get<ReportSummary>("/admin/reports", { params: { days } });
    reportsCache[days] = { data, timestamp: Date.now() };
    return data;
  },
};

export const auditService = {
  async list(page = 1, pageSize = 50): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await api.get<PaginatedResponse<AuditLog>>("/audit-logs", { params: { page, page_size: pageSize } });
    return data;
  },
};
