/** JanSahayak AI Chatbot API service. All AI calls go through the backend — no API keys in the browser. */
import api from "./api";
import appEvents from "./appEvents";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: string; content: string }>;
  session_id?: string;
}

export interface ChatResponse {
  reply: string;
  session_id?: string;
  suggestion_actions: string[];
  complaint_draft?: ComplaintDraft | null;
  provider: string;
}

export interface ComplaintDraft {
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
  category_name?: string;
}

export interface ComplaintStatusInfo {
  reference_number: string;
  title: string;
  status: string;
  status_label: string;
  category?: string;
  location?: string;
  submitted_at: string;
  updated_at: string;
  history: Array<{ status: string; date: string; reason: string }>;
}

export interface DraftSubmitResult {
  success: boolean;
  complaint_id: number;
  reference_number: string;
  message: string;
}

export const chatService = {
  async sendMessage(req: ChatRequest): Promise<ChatResponse> {
    const { data } = await api.post<ChatResponse>("/chat", req, { timeout: 45000 });
    return data;
  },

  async getComplaintStatus(reference: string): Promise<ComplaintStatusInfo> {
    const { data } = await api.get<ComplaintStatusInfo>(`/chat/complaint-status/${encodeURIComponent(reference)}`);
    return data;
  },

  async submitDraft(draft: ComplaintDraft): Promise<DraftSubmitResult> {
    const { data } = await api.post<DraftSubmitResult>("/chat/complaint-draft/submit", draft);
    appEvents.emit("complaint:created", data);
    appEvents.emit("complaints:invalidate");
    return data;
  },
};
