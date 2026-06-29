// Lightweight i18n for the citizen app. Hindi-first bilingual UI with a runtime
// language switcher (हिंदी ⇄ English), persisted in AsyncStorage.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = 'mp_lang';

export const STRINGS = {
  hi: {
    appName: 'नागरिक ट्रैफिक सेवा',
    appNameSub: 'MP Nagrik Traffic Seva',
    tagline: 'नागरिक रिपोर्टिंग · DEMO',

    // tabs / nav
    tab_home: 'होम',
    tab_reports: 'रिपोर्ट',
    tab_rewards: 'इनाम',
    tab_profile: 'प्रोफ़ाइल',

    // login
    login_subtitle: 'उल्लंघन की रिपोर्ट के लिए साइन इन करें',
    phone_number: 'फ़ोन नंबर',
    send_otp: 'OTP भेजें',
    sending: 'भेजा जा रहा है…',
    enter_otp: 'OTP दर्ज करें',
    demo_otp: 'डेमो OTP',
    verify_continue: 'सत्यापित करें और जारी रखें',
    verifying: 'सत्यापित हो रहा है…',
    change_number: 'नंबर बदलें',
    invalid_number: 'अमान्य नंबर',
    invalid_number_msg: 'मान्य 10-अंकों का फ़ोन नंबर दर्ज करें।',
    error: 'त्रुटि',

    // home
    hello: 'नमस्ते,',
    civic_points: 'नागरिक अंक',
    civic_points_en: 'Civic points',
    rank_in: 'भोपाल में रैंक',
    contributions: 'योगदान',
    report_violation: 'उल्लंघन की रिपोर्ट करें',
    report_violation_sub: 'Report a violation — 30 सेकंड लगते हैं',
    my_reports: 'मेरी रिपोर्ट',
    my_reports_en: 'My reports',
    view_all: 'सभी देखें',
    no_reports: 'अभी तक कोई रिपोर्ट नहीं। सड़क प्रहरी बनें!',
    points_suffix: 'अंक',

    // capture
    report_title: 'उल्लंघन की रिपोर्ट',
    step_of: 'चरण',
    of: 'का',
    evidence_and_type: 'साक्ष्य और प्रकार',
    gps_locked: 'GPS लॉक',
    locating: 'स्थान खोजा जा रहा है…',
    violation_type: 'उल्लंघन का प्रकार',
    violation_type_en: 'Violation type',
    more_types: 'और प्रकार देखें',
    auto: 'स्वतः',
    cam_required: 'साक्ष्य कैद करने के लिए कैमरा एक्सेस आवश्यक है।',
    grant_access: 'कैमरा और माइक एक्सेस दें',
    mode_video: 'वीडियो',
    mode_photo: 'फ़ोटो',
    hint_video: 'रिकॉर्ड शुरू/बंद करने के लिए टैप करें (अधि. 30 से.)',
    hint_photo: 'फ़ोटो लेने के लिए टैप करें',

    // submit
    location: 'स्थान',
    not_available: 'उपलब्ध नहीं',
    date_time: 'दिनांक व समय',
    note_optional: 'टिप्पणी (वैकल्पिक)',
    note_placeholder: 'अधिकारी की मदद के लिए विवरण जोड़ें…',
    submit_report: 'रिपोर्ट जमा करें',
    submitting: 'जमा हो रहा है…',
    uploading: 'अपलोड हो रहा है…',
    video_ready: 'वीडियो साक्ष्य तैयार',
    submit_failed: 'जमा करने में विफल',
    submit_failed_msg: 'जमा नहीं हो सका। क्या बैकएंड चालू है?',

    // submitted success
    report_submitted: 'रिपोर्ट जमा हो गई',
    report_submitted_en: 'Your report has been submitted',
    case_number: 'केस संख्या',
    plate_auto_detected: 'नंबर प्लेट स्वतः पहचानी गई',
    ocr_confidence: 'OCR विश्वास',
    no_plate_detected: 'कोई प्लेट नहीं मिली — अधिकारी मैन्युअल समीक्षा करेंगे।',
    vehicle_owner_vahan: 'वाहन स्वामी (VAHAN)',
    vehicle: 'वाहन',
    what_next: 'आगे क्या होगा?',
    what_next_en: 'What happens next',
    step_evidence_secured: 'साक्ष्य सुरक्षित किया गया',
    step_evidence_secured_sub: 'SHA-256 हैश से सत्यापित',
    step_officer_review: 'अधिकारी द्वारा समीक्षा',
    step_officer_review_sub: 'ट्रैफिक अधिकारी 24 घंटे में जाँचेंगे',
    step_challan_issued: 'ई-चालान जारी',
    step_challan_issued_sub: 'मंज़ूरी पर आपको अंक मिलेंगे',
    points_on_approval: 'मंज़ूरी पर +50 नागरिक अंक',
    points_on_approval_sub: 'सुरक्षित सड़कों में आपका योगदान',
    view_status: 'स्थिति देखें',
    done: 'हो गया',

    // rewards
    rewards_title: 'इनाम व रैंक',
    rewards_sub: 'Rewards & rank',
    your_tier: 'आपका स्तर',
    rank_label: 'रैंक',
    next_tier_in: 'अगले स्तर के लिए और',
    points_needed: 'अंक चाहिए',
    how_points_work: 'अंक कैसे मिलते हैं',
    how_points_1: 'मंज़ूर रिपोर्ट पर +50 अंक तक',
    how_points_2: 'स्तर बढ़ने पर नई उपलब्धियाँ',
    how_points_3: 'भोपाल लीडरबोर्ड में रैंक',
    tiers: 'स्तर',

    // profile
    total_reports: 'कुल रिपोर्ट',
    accepted: 'स्वीकृत',
    rejected: 'अस्वीकृत',
    sign_out: 'साइन आउट',
    language: 'भाषा',
    demo_note: 'DEMO बिल्ड · MP Nagrik Traffic Seva (Phase 0)',

    // status labels
    status_PENDING: 'लंबित',
    status_UNDER_REVIEW: 'समीक्षाधीन',
    status_CHALLAN_ISSUED: 'चालान जारी',
    status_REJECTED: 'अस्वीकृत',
  },
  en: {
    appName: 'Nagrik Traffic Seva',
    appNameSub: 'MP Nagrik Traffic Seva',
    tagline: 'Citizen Reporting · DEMO',

    tab_home: 'Home',
    tab_reports: 'Reports',
    tab_rewards: 'Rewards',
    tab_profile: 'Profile',

    login_subtitle: 'Sign in to report violations',
    phone_number: 'Phone number',
    send_otp: 'Send OTP',
    sending: 'Sending…',
    enter_otp: 'Enter OTP',
    demo_otp: 'Demo OTP',
    verify_continue: 'Verify & Continue',
    verifying: 'Verifying…',
    change_number: 'Change number',
    invalid_number: 'Invalid number',
    invalid_number_msg: 'Enter a valid 10-digit phone number.',
    error: 'Error',

    hello: 'Hello,',
    civic_points: 'Civic points',
    civic_points_en: 'नागरिक अंक',
    rank_in: 'Rank in Bhopal',
    contributions: 'contributions',
    report_violation: 'Report a violation',
    report_violation_sub: 'Takes about 30 seconds',
    my_reports: 'My reports',
    my_reports_en: 'मेरी रिपोर्ट',
    view_all: 'View all',
    no_reports: 'No reports yet. Be a Road Guardian!',
    points_suffix: 'pts',

    report_title: 'Report a violation',
    step_of: 'Step',
    of: 'of',
    evidence_and_type: 'Evidence & type',
    gps_locked: 'GPS locked',
    locating: 'Locating…',
    violation_type: 'Violation type',
    violation_type_en: 'उल्लंघन का प्रकार',
    more_types: 'See more types',
    auto: 'Auto',
    cam_required: 'Camera access is required to capture evidence.',
    grant_access: 'Grant Camera & Mic Access',
    mode_video: 'Video',
    mode_photo: 'Photo',
    hint_video: 'Tap to start/stop recording (max 30s)',
    hint_photo: 'Tap to capture photo',

    location: 'Location',
    not_available: 'Not available',
    date_time: 'Date & time',
    note_optional: 'Note (optional)',
    note_placeholder: 'Add any details to help the officer…',
    submit_report: 'Submit report',
    submitting: 'Submitting…',
    uploading: 'Uploading…',
    video_ready: 'Video evidence ready',
    submit_failed: 'Submission failed',
    submit_failed_msg: 'Could not submit. Is the backend running?',

    report_submitted: 'Report submitted',
    report_submitted_en: 'रिपोर्ट जमा हो गई',
    case_number: 'Case number',
    plate_auto_detected: 'Number plate auto-detected',
    ocr_confidence: 'OCR confidence',
    no_plate_detected: 'No plate detected — an officer will review manually.',
    vehicle_owner_vahan: 'Vehicle owner (VAHAN)',
    vehicle: 'Vehicle',
    what_next: 'What happens next',
    what_next_en: 'आगे क्या होगा',
    step_evidence_secured: 'Evidence secured',
    step_evidence_secured_sub: 'Verified with SHA-256 hash',
    step_officer_review: 'Reviewed by an officer',
    step_officer_review_sub: 'A traffic officer checks within 24 hours',
    step_challan_issued: 'e-Challan issued',
    step_challan_issued_sub: 'You earn points on approval',
    points_on_approval: '+50 civic points on approval',
    points_on_approval_sub: 'Your contribution to safer roads',
    view_status: 'View status',
    done: 'Done',

    rewards_title: 'Rewards & rank',
    rewards_sub: 'इनाम व रैंक',
    your_tier: 'Your tier',
    rank_label: 'Rank',
    next_tier_in: 'To next tier',
    points_needed: 'more points',
    how_points_work: 'How points work',
    how_points_1: 'Up to +50 points per approved report',
    how_points_2: 'New achievements as you level up',
    how_points_3: 'Climb the Bhopal leaderboard',
    tiers: 'Tiers',

    total_reports: 'Total reports',
    accepted: 'Accepted',
    rejected: 'Rejected',
    sign_out: 'Sign out',
    language: 'Language',
    demo_note: 'DEMO build · MP Nagrik Traffic Seva (Phase 0)',

    status_PENDING: 'Pending',
    status_UNDER_REVIEW: 'Under review',
    status_CHALLAN_ISSUED: 'Challan issued',
    status_REJECTED: 'Rejected',
  },
};

const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('hi');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'hi') setLang(saved);
      setReady(true);
    })();
  }, []);

  const change = useCallback(async (next) => {
    setLang(next);
    await AsyncStorage.setItem(LANG_KEY, next);
  }, []);

  const toggle = useCallback(() => change(lang === 'hi' ? 'en' : 'hi'), [lang, change]);

  const t = useCallback((key) => STRINGS[lang][key] ?? STRINGS.hi[key] ?? key, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang: change, toggle, t, ready }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
