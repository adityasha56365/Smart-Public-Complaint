"""JanSahayak AI Chatbot API endpoints.

Supports:
- POST /api/v1/chat          — General chat (Q&A, complaint guidance)
- POST /api/v1/chat/complaint-draft/submit  — Submit a drafted complaint
- GET  /api/v1/chat/complaint-status/{ref}  — Retrieve complaint status by reference
"""
import json
import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import bearer_scheme, get_current_user
from app.core.security import decode_token
from app.db.session import get_db
from app.models.models import (
    Complaint,
    ComplaintCategory,
    ComplaintStatus,
    ComplaintStatusHistory,
    Notification,
    Priority,
    User,
    UserRole,
)
from app.core.utils import generate_reference_number
from fastapi.security import HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

# ---------------------------------------------------------------------------
# Rate limiting (simple in-memory per-user, resets on restart)
# ---------------------------------------------------------------------------
_rate_store: Dict[str, List[float]] = {}
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 20


def _check_rate_limit(user_id: int) -> None:
    key = str(user_id)
    now = time.time()
    hits = [t for t in _rate_store.get(key, []) if now - t < RATE_LIMIT_WINDOW]
    if len(hits) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment before sending more messages.",
        )
    hits.append(now)
    _rate_store[key] = hits


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list, max_length=30)
    session_id: Optional[str] = Field(None, max_length=64)


class ChatResponse(BaseModel):
    reply: str
    session_id: Optional[str] = None
    suggestion_actions: List[str] = []
    complaint_draft: Optional[Dict[str, Any]] = None
    provider: str = "fallback"


class ComplaintDraftSubmit(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category_id: Optional[int] = None
    location_address: Optional[str] = None
    location_landmark: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    ward: Optional[str] = None
    zone: Optional[str] = None
    priority: str = "medium"


class ComplaintStatusResponse(BaseModel):
    reference_number: str
    title: str
    status: str
    status_label: str
    category: Optional[str]
    location: Optional[str]
    submitted_at: str
    updated_at: str
    history: List[Dict[str, Any]] = []


# ---------------------------------------------------------------------------
# AI provider abstraction
# ---------------------------------------------------------------------------

def _get_ai_provider() -> Optional[str]:
    provider = getattr(settings, "AI_PROVIDER", "").lower()
    api_key = getattr(settings, "AI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
    if not provider and (getattr(settings, "GEMINI_API_KEY", "") or getattr(settings, "AI_API_KEY", "")):
        provider = "google"
    if provider and api_key:
        return provider
    return None


def _call_ai(system_prompt: str, history: List[ChatMessage], user_message: str) -> Optional[str]:
    provider = _get_ai_provider()
    if not provider:
        return None
    api_key = getattr(settings, "AI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
    model = getattr(settings, "AI_MODEL", "")
    try:
        if provider == "google":
            return _call_google_gemini(api_key, model or "gemini-3.1-flash-lite", system_prompt, history, user_message)
        elif provider == "openai":
            return _call_openai(api_key, model or "gpt-4o-mini", system_prompt, history, user_message)
        else:
            logger.warning("Unknown AI provider: %s", provider)
            return None
    except Exception as exc:
        logger.error("AI provider call failed: %s", exc)
        return None


def _call_google_gemini(api_key: str, model: str, system_prompt: str, history: List[ChatMessage], user_message: str) -> Optional[str]:
    import httpx

    candidate_models = [m for m in [model, "gemini-3.1-flash-lite"] if m]
    seen = set()
    models_to_try = []
    for m in candidate_models:
        if m not in seen:
            seen.add(m)
            models_to_try.append(m)

    contents = []
    for msg in history[-20:]:
        role = "user" if msg.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.content}]})
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 1024,
            "temperature": 0.7,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    last_error = None
    for target_model in models_to_try:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={api_key}"
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(endpoint, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"]
            else:
                logger.warning("Gemini model %s returned status %d: %s", target_model, resp.status_code, resp.text[:200])
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini model %s failed: %s; trying fallback model", target_model, exc)
            continue

    if last_error:
        raise last_error
    return None


def _call_openai(api_key, model, system_prompt, history, user_message):
    import urllib.request
    endpoint = "https://api.openai.com/v1/chat/completions"
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-20:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message})
    payload = json.dumps({"model": model, "messages": messages, "max_tokens": 1024, "temperature": 0.7}).encode()
    req = urllib.request.Request(
        endpoint, data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read())
    return data["choices"][0]["message"]["content"]


SYSTEM_PROMPT = """You are JanSahayak AI, a helpful multilingual public-service assistant for the Civicly citizen complaint platform.

Your responsibilities:
1. Help citizens register civic complaints (garbage, roads, water supply, streetlights, drainage, etc.)
2. Guide them through the complaint process step by step
3. Answer questions about the app and complaint status
4. Support Hindi, English, and Hinglish — always respond in the same language the user writes in

Rules you MUST follow:
- Never invent government rules, helpline numbers, deadlines, or guarantees
- Never ask for passwords, OTPs, bank details, or Aadhaar numbers
- Never submit a complaint without explicit citizen confirmation
- Always be respectful and use simple language suitable for all literacy levels
- If you cannot answer, acknowledge the limitation and suggest contacting the relevant department
- Keep responses concise and helpful
- Format your response using markdown for readability (bold, bullets, numbers)

When helping write a complaint, collect ONE piece of information at a time:
1. Category / type of problem
2. Exact location / area / address
3. How long the problem has existed
4. Brief description in citizen's own words

After collecting all info, generate a well-structured formal complaint in the citizen's language and ask for explicit confirmation before telling them to submit.
"""


def _rule_based_response(message: str, history: List[ChatMessage]) -> Dict[str, Any]:
    msg = message.lower().strip()

    register_triggers = [
        "complaint karni", "complaint likhni", "complaint register", "shikayat",
        "mujhe complaint", "i want to complain", "report a problem", "register complaint",
        "complaint dena", "problem report", "issue report"
    ]
    if any(t in msg for t in register_triggers):
        return {
            "reply": (
                "Zaroor! Main aapki complaint register karne mein madad karunga.\n\n"
                "Pehle mujhe batayein — **aapki samasya kis prakar ki hai?**\n\n"
                "• 🗑️ Kachra / Safaai (Garbage)\n"
                "• 🛣️ Sadak / Pothole (Road)\n"
                "• 💧 Paani ki supply (Water)\n"
                "• 💡 Streetlight\n"
                "• 🚰 Drainage / Sewage / Nali\n"
                "• 🌳 Park / Sarkari Sampatti\n"
                "• 🔇 Noise / Pollution\n"
                "• Koi aur samasya\n\n"
                "Apni samasya type karein ya neeche se chunein:"
            ),
            "suggestion_actions": [
                "Kachra nahi utha raha", "Sadak mein pothole hai",
                "Paani nahi aa raha", "Streetlight kharab hai",
                "Drainage band hai", "Aur koi samasya"
            ],
            "complaint_draft": None,
        }

    write_triggers = ["likhni nahi", "kaise likhun", "help me write", "complaint likhne mein", "nahi aati", "guide"]
    if any(t in msg for t in write_triggers):
        return {
            "reply": (
                "Koi baat nahi! Main aapki complaint likhne mein madad karunga. 📝\n\n"
                "Bas mujhe apni samasya **saral shabdon mein** batayein — jaise:\n"
                "- *\"Mere mohalle mein 3 din se kachra nahi utha\"*\n"
                "- *\"Main Road par bada pothole hai jo accident ka kaaran ban sakta hai\"*\n"
                "- *\"Hamare area mein 2 din se paani nahi aa raha\"*\n\n"
                "Aap kya batana chahte hain?"
            ),
            "suggestion_actions": [
                "Mujhe complaint register karni hai",
                "Track my complaint",
                "How to use this app"
            ],
            "complaint_draft": None,
        }

    track_triggers = ["track", "meri complaint", "complaint ka status", "reference number", "cmp-", "status check", "kitna time", "kab tak"]
    if any(t in msg for t in track_triggers):
        return {
            "reply": (
                "Apni complaint track karne ke liye:\n\n"
                "1. **'My Complaints'** section mein jayein (baye taraf menu mein)\n"
                "2. Apni complaint par click karein — poora status dikhega\n\n"
                "**Ya agar aapke paas Reference Number hai:**\n"
                "Format: **CMP-XXXXXXXX**\n"
                "Mujhe apna reference number batayein, main status check karunga.\n\n"
                "*Note: Status check ke liye login zaroori hai.*"
            ),
            "suggestion_actions": ["Mera reference number hai: CMP-", "Register a Complaint"],
            "complaint_draft": None,
        }

    howto_triggers = ["kaise use", "how to use", "how to register", "kaise register", "app kaise", "use karna", "kya hai", "what is"]
    if any(t in msg for t in howto_triggers):
        return {
            "reply": (
                "**Civicly app kaise use karein:** 📱\n\n"
                "1️⃣ **Account banayein** — 'Create Account' se register karein\n"
                "2️⃣ **Complaint darz karein** — Home par 'Report a problem' dabayein\n"
                "3️⃣ **Category chunein** — apni samasya ki category select karein\n"
                "4️⃣ **Location daalein** — apna address ya area type karein\n"
                "5️⃣ **Photo lagayein** (optional) — samasya ki photo\n"
                "6️⃣ **Submit karein** — Reference number milega\n\n"
                "'My Complaints' mein kabhi bhi status track karein."
            ),
            "suggestion_actions": [
                "Register a Complaint",
                "Help Me Write a Complaint",
                "Track My Complaint"
            ],
            "complaint_draft": None,
        }

    if "pending" in msg or "kyun pending" in msg or "itna time" in msg or "delay" in msg:
        return {
            "reply": (
                "Complaint pending hone ke kai kaaran ho sakte hain:\n\n"
                "• **Review mein hai** — adhikari ne abhi review nahi ki\n"
                "• **Assign ho rahi hai** — sahi department ko bheja ja raha hai\n"
                "• **Awaiting info** — aur jaankari ki zaroorat ho sakti hai\n\n"
                "Agar zyada samay ho gaya hai, 'My Complaints' mein status check karein.\n\n"
                "*Main koi specific timeline guarantee nahi kar sakta — yeh department par depend karta hai.*"
            ),
            "suggestion_actions": ["Track My Complaint", "Register a Complaint"],
            "complaint_draft": None,
        }

    if "photo" in msg or "upload" in msg or "image" in msg or "picture" in msg:
        return {
            "reply": (
                "Photo upload karne ke liye: 📷\n\n"
                "1. Complaint form mein **Step 3** par jayein\n"
                "2. **'Upload evidence'** section mein camera icon dabayein\n"
                "3. Phone se photo select karein ya camera se click karein\n"
                "4. Maximum: **20 MB** | Formats: JPG, PNG, WebP, MP4\n\n"
                "💡 *Photo se aapki complaint jaldi process hoti hai!*"
            ),
            "suggestion_actions": ["Register a Complaint", "Track My Complaint"],
            "complaint_draft": None,
        }

    if ("submit" in msg or "jama" in msg) and ("baad" in msg or "after" in msg or "hoga" in msg or "happens" in msg):
        return {
            "reply": (
                "Complaint submit hone ke baad:\n\n"
                "1. ✅ **Reference Number** milega (CMP-XXXXXXXX format mein)\n"
                "2. 📩 **Notification** confirmation ki aayegi\n"
                "3. 👮 Sahi **department ko assign** kiya jayega\n"
                "4. 🔄 Status updates milte rahenge jab bhi kuch badle\n"
                "5. ✔️ **Resolution** hone par final notification aayegi\n\n"
                "'My Complaints' mein kabhi bhi track kar sakte hain."
            ),
            "suggestion_actions": ["Track My Complaint", "Register a Complaint"],
            "complaint_draft": None,
        }

    if "edit" in msg or "badalna" in msg or "change complaint" in msg:
        return {
            "reply": (
                "Submitted complaint ko directly edit nahi kar sakte.\n\n"
                "**Options:**\n"
                "• Agar complaint abhi **Submitted** status mein hai toh officer se comment mein request kar sakte hain\n"
                "• Nai complaint file kar sakte hain sahi details ke saath\n\n"
                "Kya aap nai complaint file karna chahte hain?"
            ),
            "suggestion_actions": ["Register a Complaint", "Track My Complaint"],
            "complaint_draft": None,
        }

    civic_keywords = {
        "kachra": ("Garbage & Sanitation", "Uncollected garbage"),
        "garbage": ("Garbage & Sanitation", "Uncollected garbage / waste issue"),
        "safai": ("Garbage & Sanitation", "Street cleaning required"),
        "sanitation": ("Garbage & Sanitation", "Sanitation issue"),
        "pothole": ("Roads & Potholes", "Pothole / road damage"),
        "sadak": ("Roads & Potholes", "Road damage issue"),
        "road kharab": ("Roads & Potholes", "Damaged road"),
        "paani nahi": ("Water Supply", "No water supply"),
        "paani ki supply": ("Water Supply", "Water supply issue"),
        "water supply": ("Water Supply", "Water supply disruption"),
        "streetlight": ("Streetlights", "Streetlight not working"),
        "street light": ("Streetlights", "Street light malfunction"),
        "light kaam nahi": ("Streetlights", "Streetlight not functioning"),
        "drainage": ("Drainage & Sewage", "Drainage blockage"),
        "nali": ("Drainage & Sewage", "Drain blockage"),
        "sewage": ("Drainage & Sewage", "Sewage overflow"),
        "park": ("Parks & Public Property", "Park maintenance issue"),
        "noise": ("Noise & Pollution", "Noise pollution"),
        "pollution": ("Noise & Pollution", "Environmental pollution"),
    }

    matched_category = None
    for keyword, (cat, _) in civic_keywords.items():
        if keyword in msg:
            matched_category = cat
            break

    if matched_category:
        return {
            "reply": (
                f"Samajh gaya! Aapko **{matched_category}** se related samasya hai.\n\n"
                "Complaint draft karne ke liye ek-ek karke kuch information chahiye:\n\n"
                "**Pehla sawaal: Aapka exact address ya area kya hai?**\n"
                "(Jaise: *'Lajpat Nagar, Ward 5'* ya *'MG Road ke paas, Block B'*)"
            ),
            "suggestion_actions": ["Help Me Write a Complaint", "Register a Complaint directly"],
            "complaint_draft": None,
        }

    greet_triggers = ["namaste", "hello", "hi ", "hii", "hey", "namaskar", "good morning", "good evening", "jai hind"]
    if any(t in msg for t in greet_triggers) or msg in ["hi", "hello", "hey"]:
        return {
            "reply": (
                "Namaste! 🙏 Main **JanSahayak AI** hoon — aapka digital sahayak.\n\n"
                "Main aapki madad kar sakta hoon:\n"
                "• 📝 Complaint **likhne** mein\n"
                "• 📋 Complaint **register** karne mein\n"
                "• 🔍 Complaint **track** karne mein\n"
                "• ❓ App se related **sawaalon** ke jawab mein\n\n"
                "Aaj main aapki kya madad kar sakta hoon?"
            ),
            "suggestion_actions": [
                "Register a Complaint",
                "Help Me Write a Complaint",
                "Track My Complaint",
                "How to Use This App",
                "Ask a Question"
            ],
            "complaint_draft": None,
        }

    # Context-aware: multi-turn complaint drafting flow
    if history:
        last_assistant = next((m.content for m in reversed(history) if m.role == "assistant"), "")
        if "address ya area" in last_assistant or "exact location" in last_assistant.lower():
            return {
                "reply": (
                    f"Shukriya! Location note kar li: **{message.strip()}**\n\n"
                    "Ab batayein — **yeh samasya kitne time se hai?**\n"
                    "(Jaise: *'2 din se'*, *'1 hafte se'*, *'pichle mahine se'*)"
                ),
                "suggestion_actions": ["2 din se", "1 hafte se", "1 mahine se", "Bahut zyada samay se"],
                "complaint_draft": None,
            }

        if "kitne time se hai" in last_assistant or "time se" in last_assistant:
            duration = message.strip()
            # Extract location from the user message before this
            user_msgs = [m.content for m in history if m.role == "user"]
            location = user_msgs[-1] if user_msgs else "Local area"

            # Detect category from assistant messages or user history
            cat_name = "Other Civic Issues"
            cat_id = 7
            for hist_msg in reversed(history):
                content_lower = hist_msg.content.lower()
                for kw, (c_name, _) in civic_keywords.items():
                    if kw in content_lower:
                        cat_name = c_name
                        cat_id = {
                            "Roads & Potholes": 1,
                            "Garbage & Sanitation": 2,
                            "Water Supply": 3,
                            "Streetlights": 4,
                            "Parks & Public Property": 5,
                            "Drainage & Sewage": 6,
                        }.get(cat_name, 7)
                        break
                if cat_name != "Other Civic Issues":
                    break

            draft = {
                "title": f"{cat_name} issue reported at {location[:50]}",
                "description": (
                    f"Civic grievance regarding {cat_name}.\n\n"
                    f"• Problem: {cat_name} malfunction / disruption\n"
                    f"• Location: {location}\n"
                    f"• Issue duration: {duration}\n"
                    f"• Urgency: Citizen requested municipal inspection and immediate resolution."
                ),
                "category_id": cat_id,
                "category_name": cat_name,
                "location_address": location,
                "priority": "medium",
            }

            return {
                "reply": (
                    f"✨ **Aapki complaint ka draft taiyar hai!**\n\n"
                    f"**Category:** {cat_name}\n"
                    f"**Location:** {location}\n"
                    f"**Duration:** {duration}\n\n"
                    "Neeche diye gaye card se aap ise direct submit kar sakte hain ya review kar sakte hain:"
                ),
                "suggestion_actions": [
                    "Submit Draft Complaint",
                    "Register a Complaint",
                    "Track My Complaint",
                ],
                "complaint_draft": draft,
            }

    return {
        "reply": (
            "Main samajhne ki koshish kar raha hoon. Kya aap thoda aur detail mein bata sakte hain?\n\n"
            "Main inke baare mein madad kar sakta hoon:\n"
            "• Civic complaint register karna (kachra, sadak, paani, streetlight, etc.)\n"
            "• Complaint ka status track karna\n"
            "• App use karne ka tarika\n"
            "• Shikayat likhne mein madad\n\n"
            "Agar aapka sawaal kisi specific sarkari department se related hai, please us department se seedha sampark karein."
        ),
        "suggestion_actions": [
            "Register a Complaint",
            "Help Me Write a Complaint",
            "Track My Complaint",
            "How to Use This App"
        ],
        "complaint_draft": None,
    }


# ---------------------------------------------------------------------------
# Optional auth dependency
# ---------------------------------------------------------------------------

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if not payload or payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user if user and user.is_active else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if current_user:
        _check_rate_limit(current_user.id)

    user_message = body.message.strip()
    if not user_message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    provider_used = "fallback"
    complaint_draft = None
    suggestion_actions: List[str] = []

    ai_reply = _call_ai(SYSTEM_PROMPT, body.history, user_message)
    if ai_reply:
        provider_used = getattr(settings, "AI_PROVIDER", "ai").lower()
        reply = ai_reply
        suggestion_actions = ["Register a Complaint", "Track My Complaint"]
    else:
        fallback = _rule_based_response(user_message, body.history)
        reply = fallback["reply"]
        suggestion_actions = fallback["suggestion_actions"]
        complaint_draft = fallback.get("complaint_draft")

    return ChatResponse(
        reply=reply,
        session_id=body.session_id,
        suggestion_actions=suggestion_actions,
        complaint_draft=complaint_draft,
        provider=provider_used,
    )


@router.get("/complaint-status/{reference}", response_model=ComplaintStatusResponse)
def get_complaint_status(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(
        Complaint.reference_number == reference.upper()
    ).first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found with that reference number.")

    if current_user.role == UserRole.citizen and complaint.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    status_labels = {
        "submitted": "Jama ki gayi — aapki complaint hamare paas pahunch gayi",
        "under_review": "Samiksha mein — adhikari review kar rahe hain",
        "assigned": "Assign ki gayi — department ko bhej di gayi",
        "in_progress": "Kaam chal raha hai — team kaam kar rahi hai",
        "awaiting_info": "Jaankari chahiye — aur vivaran chahiye",
        "resolved": "Hal ho gayi — samasya thik kar di gayi",
        "reopened": "Dobara khola — follow-up request ki gayi",
        "rejected": "Aswikar — complaint swikar nahi ki gayi",
        "closed": "Band — case band kar diya gaya",
    }

    hist = sorted(complaint.status_history, key=lambda h: h.created_at)
    history_out = [
        {"status": h.new_status, "date": h.created_at.strftime("%d %b %Y, %H:%M"), "reason": h.reason or ""}
        for h in hist
    ]

    return ComplaintStatusResponse(
        reference_number=complaint.reference_number,
        title=complaint.title,
        status=complaint.status,
        status_label=status_labels.get(complaint.status, complaint.status),
        category=complaint.category.name if complaint.category else None,
        location=complaint.location_address or complaint.location_landmark,
        submitted_at=complaint.created_at.strftime("%d %b %Y, %H:%M"),
        updated_at=complaint.updated_at.strftime("%d %b %Y, %H:%M"),
        history=history_out,
    )


@router.post("/complaint-draft/submit", response_model=dict, status_code=status.HTTP_201_CREATED)
def submit_draft_complaint(
    body: ComplaintDraftSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.category_id is not None:
        cat = db.query(ComplaintCategory).filter(ComplaintCategory.id == body.category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found.")

    try:
        priority_val = Priority(body.priority)
    except ValueError:
        priority_val = Priority.medium

    ref = None
    for _ in range(5):
        candidate = generate_reference_number()
        if not db.query(Complaint).filter(Complaint.reference_number == candidate).first():
            ref = candidate
            break

    if not ref:
        raise HTTPException(status_code=500, detail="Could not generate a unique reference number.")

    complaint = Complaint(
        reference_number=ref,
        title=body.title,
        description=body.description,
        category_id=body.category_id,
        location_address=body.location_address,
        location_landmark=body.location_landmark,
        location_lat=body.location_lat,
        location_lng=body.location_lng,
        ward=body.ward,
        zone=body.zone,
        priority=priority_val,
        citizen_id=current_user.id,
        status=ComplaintStatus.submitted,
    )
    db.add(complaint)
    db.flush()

    db.add(ComplaintStatusHistory(
        complaint_id=complaint.id,
        previous_status=None,
        new_status=ComplaintStatus.submitted,
        changed_by_id=current_user.id,
        reason="Complaint submitted via JanSahayak AI assistant",
    ))

    db.add(Notification(
        user_id=current_user.id,
        complaint_id=complaint.id,
        title="Complaint submitted via AI assistant",
        message=f"Aapki complaint '{complaint.title}' safaltapoorvak jama ki gayi. Reference: {ref}",
    ))

    db.commit()
    db.refresh(complaint)

    return {
        "success": True,
        "complaint_id": complaint.id,
        "reference_number": ref,
        "message": f"Aapki complaint safaltapoorvak submit ho gayi! Reference number hai: **{ref}**",
    }
