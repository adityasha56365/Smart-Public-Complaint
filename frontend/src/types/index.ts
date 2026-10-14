/** TypeScript type definitions mirroring the backend schemas. */

export type UserRole = "citizen" | "officer" | "supervisor" | "admin" | "transport_admin" | "transport_officer" | "transport_supervisor";
export type ComplaintStatus =
  | "submitted"
  | "under_review"
  | "assigned"
  | "in_progress"
  | "awaiting_info"
  | "resolved"
  | "reopened"
  | "rejected"
  | "closed";
export type Priority = "low" | "medium" | "high" | "critical";

export interface User {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  department_id: number | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_role: UserRole;
  user_id: number;
  full_name: string;
}

export interface Complaint {
  id: number;
  reference_number: string;
  title: string;
  description: string;
  location_address: string | null;
  location_landmark: string | null;
  location_lat: number | null;
  location_lng: number | null;
  ward: string | null;
  zone: string | null;
  priority: Priority;
  status: ComplaintStatus;
  rejection_reason: string | null;
  resolution_details: string | null;
  citizen_id: number;
  category_id: number | null;
  category_name: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  attachments?: AttachmentOut[];
  created_at: string;
  updated_at: string;
}

export interface AttachmentOut {
  id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  attachment_type: "image" | "video";
  created_at: string;
  url: string | null;
  data_url?: string | null;
}

export interface StatusHistoryItem {
  id: number;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  created_at: string;
  changed_by_name: string | null;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  author_name: string | null;
  author_role: string | null;
}

export interface InternalNote {
  id: number;
  content: string;
  created_at: string;
  author_name: string | null;
}

export interface Assignment {
  id: number;
  officer_id: number | null;
  officer_name: string | null;
  department_id: number | null;
  department_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface ComplaintDetail extends Complaint {
  citizen_name: string | null;
  attachments: AttachmentOut[];
  status_history: StatusHistoryItem[];
  comments: Comment[];
  internal_notes: InternalNote[];
  current_assignment: Assignment | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  department_id: number | null;
  is_active: boolean;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  jurisdiction: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentWithStats extends Department {
  officer_count: number;
  open_count: number;
  overdue_count: number;
  resolution_rate: number;
}

export interface Notification {
  id: number;
  complaint_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  new_today: number;
  pending_review: number;
  in_progress: number;
  resolved: number;
  overdue: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface DailyTrend {
  date: string;
  received: number;
  resolved: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface ReportSummary {
  total_received: number;
  total_resolved: number;
  median_resolution_days: number;
  reopened_rate: number;
  category_distribution: CategoryDistribution[];
  daily_trend: DailyTrend[];
}

export interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Map and Geolocation Types
// ---------------------------------------------------------------------------

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationSelection {
  lat: number;
  lng: number;
  address?: string;
  landmark?: string;
}

export interface MapComplaintMarker {
  id: number;
  reference_number: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: Priority;
  category_name?: string | null;
  location_address?: string | null;
  location_landmark?: string | null;
  location_lat: number;
  location_lng: number;
  created_at: string;
}
