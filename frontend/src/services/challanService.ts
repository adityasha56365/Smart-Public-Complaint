import api from "./api";
import type {
  ChallanComplaint,
  ChallanDisputeReason,
  TransportDashboardSummary,
} from "../types/challan";

export interface CreateChallanPayload {
  challan_number: string;
  vehicle_number: string;
  issue_date: string;
  issuing_authority?: string;
  jurisdiction?: string;
  dispute_reason: ChallanDisputeReason;
  description: string;
  evidence?: {
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    attachment_type?: string;
    file_data?: string;
  }[];
}

export interface PaginatedChallanResponse {
  total: number;
  page: number;
  page_size: number;
  items: ChallanComplaint[];
}

export const challanService = {
  // Citizen API
  async create(payload: CreateChallanPayload): Promise<ChallanComplaint> {
    const { data } = await api.post<ChallanComplaint>("/challan-complaints", payload);
    return data;
  },

  async listMy(params?: {
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedChallanResponse> {
    const { data } = await api.get<PaginatedChallanResponse>("/challan-complaints/my", { params });
    return data;
  },

  async getDetail(id: number): Promise<ChallanComplaint> {
    const { data } = await api.get<ChallanComplaint>(`/challan-complaints/${id}`);
    return data;
  },

  async respond(
    id: number,
    payload: {
      response_text: string;
      evidence?: {
        original_filename: string;
        mime_type: string;
        size_bytes: number;
        attachment_type?: string;
        file_data?: string;
      }[];
    }
  ): Promise<ChallanComplaint> {
    const { data } = await api.post<ChallanComplaint>(`/challan-complaints/${id}/respond`, payload);
    return data;
  },

  // Transport Department API
  async getDashboardSummary(): Promise<TransportDashboardSummary> {
    const { data } = await api.get<TransportDashboardSummary>("/transport/dashboard/summary");
    return data;
  },

  async listTransportComplaints(params?: {
    status?: string;
    dispute_reason?: string;
    search?: string;
    assigned_to_me?: boolean;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<PaginatedChallanResponse> {
    const { data } = await api.get<PaginatedChallanResponse>("/transport/challan-complaints", { params });
    return data;
  },

  async getTransportDetail(id: number): Promise<ChallanComplaint> {
    const { data } = await api.get<ChallanComplaint>(`/transport/challan-complaints/${id}`);
    return data;
  },

  async acceptForReview(id: number): Promise<ChallanComplaint> {
    const { data } = await api.post<ChallanComplaint>(`/transport/challan-complaints/${id}/accept`);
    return data;
  },

  async assign(id: number, officer_id: number, note?: string): Promise<ChallanComplaint> {
    const { data } = await api.post<ChallanComplaint>(`/transport/challan-complaints/${id}/assign`, {
      officer_id,
      note,
    });
    return data;
  },

  async recordReview(id: number, findings: string, action_taken = "reviewed"): Promise<ChallanComplaint> {
    const { data } = await api.post<ChallanComplaint>(`/transport/challan-complaints/${id}/review`, {
      findings,
      action_taken,
    });
    return data;
  },

  async requestInfo(id: number, message: string): Promise<ChallanComplaint> {
    const { data } = await api.post<ChallanComplaint>(`/transport/challan-complaints/${id}/request-info`, {
      message,
    });
    return data;
  },

  async recordDecision(id: number, decision_type: string, reason: string): Promise<ChallanComplaint> {
    const { data } = await api.post<ChallanComplaint>(`/transport/challan-complaints/${id}/decision`, {
      decision_type,
      reason,
    });
    return data;
  },
};
