/**
 * Preferences Hook — manages language, accessibility, notifications, and privacy settings
 * with localStorage persistence and live DOM updates.
 */
import { useEffect, useState, useCallback } from "react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "EN", name: "English", nativeName: "English", region: "National / International" },
  { code: "HI", name: "Hindi", nativeName: "हिन्दी", region: "National" },
  { code: "MR", name: "Marathi", nativeName: "मराठी", region: "Maharashtra" },
  { code: "BN", name: "Bengali", nativeName: "বাংলা", region: "West Bengal / Tripura" },
  { code: "TA", name: "Tamil", nativeName: "தமிழ்", region: "Tamil Nadu" },
  { code: "TE", name: "Telugu", nativeName: "తెలుగు", region: "Andhra Pradesh / Telangana" },
  { code: "GU", name: "Gujarati", nativeName: "ગુજરાતી", region: "Gujarat" },
  { code: "KN", name: "Kannada", nativeName: "ಕನ್ನಡ", region: "Karnataka" },
  { code: "ML", name: "Malayalam", nativeName: "മലയാളം", region: "Kerala" },
  { code: "PA", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", region: "Punjab" },
  { code: "UR", name: "Urdu", nativeName: "اردو", region: "National" },
];

export interface AccessibilitySettings {
  fontSizePercent: number; // 85, 100, 115, 130
  highContrast: boolean;
  reduceMotion: boolean;
  theme: "light" | "dark" | "system";
  screenReaderOpt: boolean;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  statusUpdates: boolean;
  officerInquiries: boolean;
  announcements: boolean;
  sound: boolean;
}

export interface PrivacySettings {
  anonymousComplaints: boolean;
  preciseLocation: boolean;
  publicGallery: boolean;
  twoFactor: boolean;
}

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  fontSizePercent: 100,
  highContrast: false,
  reduceMotion: false,
  theme: "light",
  screenReaderOpt: false,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  push: true,
  email: true,
  sms: false,
  statusUpdates: true,
  officerInquiries: true,
  announcements: true,
  sound: true,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  anonymousComplaints: false,
  preciseLocation: true,
  publicGallery: true,
  twoFactor: false,
};

export function usePreferences() {
  // 1. Language
  const [language, setLanguageState] = useState<LanguageOption>(() => {
    try {
      const saved = localStorage.getItem("civicly_lang");
      if (saved) {
        const found = SUPPORTED_LANGUAGES.find(l => l.code === saved);
        if (found) return found;
      }
    } catch {}
    return SUPPORTED_LANGUAGES[0];
  });

  const setLanguage = useCallback((opt: LanguageOption) => {
    setLanguageState(opt);
    try {
      localStorage.setItem("civicly_lang", opt.code);
      document.documentElement.lang = opt.code.toLowerCase();
    } catch {}
  }, []);

  // 2. Accessibility
  const [accessibility, setAccessibilityState] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem("civicly_accessibility");
      if (saved) return { ...DEFAULT_ACCESSIBILITY, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_ACCESSIBILITY;
  });

  const applyAccessibilityDOM = (settings: AccessibilitySettings) => {
    if (typeof document === "undefined") return;
    // Font scale
    document.documentElement.style.fontSize = `${(settings.fontSizePercent / 100) * 16}px`;

    // High Contrast
    if (settings.highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }

    // Reduce Motion
    if (settings.reduceMotion) {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }

    // Dark Mode
    if (settings.theme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  };

  useEffect(() => {
    applyAccessibilityDOM(accessibility);
  }, [accessibility]);

  const updateAccessibility = useCallback((patch: Partial<AccessibilitySettings>) => {
    setAccessibilityState(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("civicly_accessibility", JSON.stringify(next));
      } catch {}
      applyAccessibilityDOM(next);
      return next;
    });
  }, []);

  const resetAccessibility = useCallback(() => {
    setAccessibilityState(DEFAULT_ACCESSIBILITY);
    try {
      localStorage.setItem("civicly_accessibility", JSON.stringify(DEFAULT_ACCESSIBILITY));
    } catch {}
    applyAccessibilityDOM(DEFAULT_ACCESSIBILITY);
  }, []);

  // 3. Notifications
  const [notifications, setNotificationsState] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem("civicly_notifications");
      if (saved) return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_NOTIFICATIONS;
  });

  const updateNotifications = useCallback((patch: Partial<NotificationSettings>) => {
    setNotificationsState(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("civicly_notifications", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // 4. Privacy
  const [privacy, setPrivacyState] = useState<PrivacySettings>(() => {
    try {
      const saved = localStorage.getItem("civicly_privacy");
      if (saved) return { ...DEFAULT_PRIVACY, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PRIVACY;
  });

  const updatePrivacy = useCallback((patch: Partial<PrivacySettings>) => {
    setPrivacyState(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("civicly_privacy", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return {
    language,
    setLanguage,
    accessibility,
    updateAccessibility,
    resetAccessibility,
    notifications,
    updateNotifications,
    privacy,
    updatePrivacy,
  };
}
