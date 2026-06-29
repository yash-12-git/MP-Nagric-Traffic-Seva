// i18n for the officer dashboard. Hindi-first bilingual UI with a runtime
// language switcher, persisted in localStorage.
import { createContext, useContext, useState, useCallback } from 'react';

const LANG_KEY = 'mp_officer_lang';

export const STRINGS = {
  hi: {
    appName: 'नागरिक ट्रैफिक सेवा',
    officer_dashboard: 'Officer Dashboard · भोपाल यातायात',
    nav_queue: 'केस सूची',
    nav_analytics: 'विश्लेषण',
    sign_out: 'साइन आउट',

    // login
    login_sub: 'Officer Dashboard · मध्य प्रदेश यातायात पुलिस',
    badge_number: 'बैज नंबर',
    password: 'पासवर्ड',
    sign_in: 'साइन इन करें',
    signing_in: 'साइन इन हो रहा है…',
    login_failed: 'लॉगिन विफल',
    demo_credentials: 'डेमो क्रेडेंशियल',

    // stats strip
    pending: 'लंबित',
    under_review: 'समीक्षाधीन',
    issued_today: 'आज जारी',
    avg_review: 'औसत समीक्षा',

    // queue
    filters: 'फ़िल्टर',
    status: 'स्थिति',
    violation_type: 'उल्लंघन प्रकार',
    all_types: 'सभी प्रकार',
    all_statuses: 'सभी स्थितियाँ',
    from: 'से',
    to: 'तक',
    clear_filters: 'फ़िल्टर साफ़ करें',
    cases_for_review: 'समीक्षा हेतु केस',
    cases_count: 'केस',
    newest_first: 'नवीनतम पहले',
    loading_cases: 'केस लोड हो रहे हैं…',
    no_cases: 'इन फ़िल्टर से कोई केस मेल नहीं खाता।',
    reported_by: 'द्वारा रिपोर्ट',
    review_arrow: 'समीक्षा →',

    // case detail
    back_to_queue: 'केस सूची पर वापस',
    evidence_verified: 'साक्ष्य अखंडता सत्यापित · SHA-256 ✓',
    evidence_mismatch: 'साक्ष्य हैश मेल नहीं खाता',
    not_tampered: 'छेड़छाड़ नहीं हुई',
    location: 'स्थान',
    detected_plate: 'पहचानी गई प्लेट',
    ocr_editable: 'OCR — संपादन योग्य',
    confidence: 'विश्वास',
    officer_note: 'अधिकारी टिप्पणी',
    note_placeholder: 'जैसे: 00:03 पर बिना हेलमेट स्पष्ट दिख रहा है…',
    reporter_note: 'रिपोर्टर टिप्पणी',
    vehicle_owner: 'वाहन स्वामी विवरण',
    vahan_verified: 'VAHAN सत्यापित',
    owner_name: 'नाम',
    vehicle: 'वाहन',
    rto: 'RTO',
    address: 'पता',
    reg_date: 'पंजीकरण तिथि',
    issue_challan: 'चालान जारी करें',
    reject: 'अस्वीकार',
    working: 'कार्य हो रहा है…',
    case_not_found: 'केस नहीं मिला।',
    challan_issued_label: 'चालान',
    issued: 'जारी',
    view_challan: 'चालान देखें',
    rejected_label: 'अस्वीकृत',
    reject_case: 'केस अस्वीकार करें',
    reject_reason: 'अस्वीकृति का कारण (आवश्यक)',
    cancel: 'रद्द करें',
    confirm_reject: 'अस्वीकार की पुष्टि करें',

    // analytics
    analytics: 'विश्लेषण',
    analytics_sub: 'पिछले 30 दिन · भोपाल यातायात मंडल',
    total_cases: 'कुल केस',
    challans_issued: 'चालान जारी',
    total_fines: 'कुल जुर्माना',
    avg_resolution: 'औसत निपटान',
    violations_by_type: 'प्रकार अनुसार उल्लंघन',
    cases_per_day: 'प्रतिदिन केस',
    last_30_days: 'पिछले 30 दिन',
    hotspots: 'उल्लंघन हॉटस्पॉट',
    top_locations: 'शीर्ष स्थान',

    // challan view
    download: 'डाउनलोड',
    open_print: 'खोलें / प्रिंट',
  },
  en: {
    appName: 'Nagrik Traffic Seva',
    officer_dashboard: 'Officer Dashboard · Bhopal Traffic',
    nav_queue: 'Case Queue',
    nav_analytics: 'Analytics',
    sign_out: 'Sign out',

    login_sub: 'Officer Dashboard · Madhya Pradesh Traffic Police',
    badge_number: 'Badge number',
    password: 'Password',
    sign_in: 'Sign in',
    signing_in: 'Signing in…',
    login_failed: 'Login failed',
    demo_credentials: 'Demo credentials',

    pending: 'Pending',
    under_review: 'Under review',
    issued_today: 'Issued today',
    avg_review: 'Avg review',

    filters: 'Filters',
    status: 'Status',
    violation_type: 'Violation type',
    all_types: 'All types',
    all_statuses: 'All statuses',
    from: 'From',
    to: 'To',
    clear_filters: 'Clear filters',
    cases_for_review: 'Cases for review',
    cases_count: 'cases',
    newest_first: 'newest first',
    loading_cases: 'Loading cases…',
    no_cases: 'No cases match these filters.',
    reported_by: 'reported by',
    review_arrow: 'Review →',

    back_to_queue: 'Back to queue',
    evidence_verified: 'Evidence integrity verified · SHA-256 ✓',
    evidence_mismatch: 'Evidence hash mismatch',
    not_tampered: 'not tampered',
    location: 'Location',
    detected_plate: 'Detected plate',
    ocr_editable: 'OCR — editable',
    confidence: 'Confidence',
    officer_note: 'Officer note',
    note_placeholder: 'e.g. Clear no-helmet visible at 00:03…',
    reporter_note: 'Reporter note',
    vehicle_owner: 'Vehicle owner details',
    vahan_verified: 'VAHAN verified',
    owner_name: 'Name',
    vehicle: 'Vehicle',
    rto: 'RTO',
    address: 'Address',
    reg_date: 'Registration date',
    issue_challan: 'Issue challan',
    reject: 'Reject',
    working: 'Working…',
    case_not_found: 'Case not found.',
    challan_issued_label: 'Challan',
    issued: 'issued',
    view_challan: 'View challan',
    rejected_label: 'Rejected',
    reject_case: 'Reject case',
    reject_reason: 'Rejection reason (required)',
    cancel: 'Cancel',
    confirm_reject: 'Confirm reject',

    analytics: 'Analytics',
    analytics_sub: 'Last 30 days · Bhopal Traffic Division',
    total_cases: 'Total cases',
    challans_issued: 'Challans issued',
    total_fines: 'Total fines',
    avg_resolution: 'Avg resolution',
    violations_by_type: 'Violations by type',
    cases_per_day: 'Cases per day',
    last_30_days: 'last 30 days',
    hotspots: 'Violation hotspots',
    top_locations: 'Top locations',

    download: 'Download',
    open_print: 'Open / Print',
  },
};

const STATUS_LABELS = {
  hi: { PENDING: 'लंबित', UNDER_REVIEW: 'समीक्षाधीन', CHALLAN_ISSUED: 'चालान जारी', REJECTED: 'अस्वीकृत' },
  en: { PENDING: 'Pending', UNDER_REVIEW: 'Under review', CHALLAN_ISSUED: 'Challan issued', REJECTED: 'Rejected' },
};

const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'en' || saved === 'hi' ? saved : 'hi';
  });

  const setLang = useCallback((next) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  }, []);

  const toggle = useCallback(() => setLang(lang === 'hi' ? 'en' : 'hi'), [lang, setLang]);
  const t = useCallback((key) => STRINGS[lang][key] ?? STRINGS.hi[key] ?? key, [lang]);
  const statusLabel = useCallback((s) => STATUS_LABELS[lang][s] ?? s, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t, statusLabel }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
