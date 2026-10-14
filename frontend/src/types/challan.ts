export type ChallanStatus =
  | "submitted"
  | "under_review"
  | "awaiting_citizen_info"
  | "upheld"
  | "correction_recommended"
  | "correction_approved"
  | "cancellation_approved"
  | "cancellation_executed"
  | "dispute_rejected";

export type ChallanDisputeReason =
  | "wrong_vehicle"
  | "incorrect_reg_no"
  | "details_mismatch"
  | "already_paid"
  | "duplicate_challan"
  | "incorrect_location_time"
  | "evidence_indicates_mistake"
  | "other";

export const CHALLAN_REASON_LABELS: Record<ChallanDisputeReason, string> = {
  wrong_vehicle: "Wrong vehicle identified",
  incorrect_reg_no: "Incorrect vehicle registration number",
  details_mismatch: "Vehicle or number plate details do not match",
  already_paid: "Challan already paid",
  duplicate_challan: "Duplicate challan issued",
  incorrect_location_time: "Incorrect location or violation time",
  evidence_indicates_mistake: "Evidence indicates an operational mistake",
  other: "Other legitimate reason",
};

export const CHALLAN_STATUS_LABELS: Record<ChallanStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: "Dispute Submitted", color: "var(--navy)", bg: "#eef2f4" },
  under_review: { label: "Under Review", color: "var(--teal)", bg: "#eaf7f5" },
  awaiting_citizen_info: { label: "Additional Info Required", color: "var(--warning)", bg: "#fff7eb" },
  upheld: { label: "Challan Upheld", color: "#8a4f21", bg: "#fdf2e9" },
  correction_recommended: { label: "Correction Recommended", color: "#196c8a", bg: "#e9f6fb" },
  correction_approved: { label: "Correction Approved", color: "#137752", bg: "#eaf9f3" },
  cancellation_approved: { label: "Cancellation Approved (Pending Exec)", color: "var(--success)", bg: "#e7f8ef" },
  cancellation_executed: { label: "Cancellation Executed", color: "var(--success)", bg: "#daf4e5" },
  dispute_rejected: { label: "Dispute Rejected", color: "var(--error)", bg: "#fdf0ed" },
};

export interface ChallanEvidence {
  id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  size_bytes: number;
  attachment_type: string;
  file_data?: string | null;
  is_citizen_response: boolean;
  created_at: string;
}

export interface ChallanStatusHistory {
  id: number;
  from_status: string | null;
  to_status: string;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

export interface ChallanReview {
  id: number;
  officer_name: string | null;
  findings: string;
  action_taken: string;
  created_at: string;
}

export interface ChallanComplaint {
  id: number;
  reference_id: string;
  citizen_id: number;
  citizen_name?: string | null;
  citizen_email?: string | null;
  citizen_phone?: string | null;
  challan_number: string;
  vehicle_number: string;
  issue_date: string;
  issuing_authority?: string | null;
  jurisdiction?: string | null;
  dispute_reason: ChallanDisputeReason;
  description: string;
  status: ChallanStatus;
  assigned_officer_id?: number | null;
  assigned_officer_name?: string | null;
  assigned_department_id?: number | null;
  decision_type?: string | null;
  decision_reason?: string | null;
  decision_by_name?: string | null;
  decision_date?: string | null;
  additional_info_requested?: string | null;
  citizen_response_text?: string | null;
  created_at: string;
  updated_at: string;
  evidence: ChallanEvidence[];
  status_history: ChallanStatusHistory[];
  reviews: ChallanReview[];
}

export interface TransportDashboardSummary {
  total_disputes: number;
  newly_submitted: number;
  pending_review: number;
  under_review: number;
  awaiting_citizen_info: number;
  decisions_issued: number;
  cancellations_approved: number;
  cancellations_executed: number;
  upheld_count: number;
  rejected_count: number;
  today_submitted?: number;
  reason_breakdown?: Record<string, number>;
  estimated_relief_amount?: number;
}

