-- MP Nagrik Traffic Seva — Reference seed data
-- DEMO ONLY. Officer password hashes are injected by init.js (real bcrypt of "officer123").

-- Seed violation types
INSERT OR IGNORE INTO violation_types (id, code, label_en, label_hi, fine_amount, mv_act_section, points_for_reporter) VALUES
(1, 'SIGNAL_JUMP', 'Red light jumping', 'लाल बत्ती तोड़ना', 1000, 'Section 119 MV Act 2019', 15),
(2, 'NO_HELMET', 'Riding without helmet', 'बिना हेलमेट', 1000, 'Section 129 MV Act 2019', 10),
(3, 'TRIPLE_RIDING', 'Triple riding on two-wheeler', 'ट्रिपल राइडिंग', 1000, 'Section 128 MV Act 2019', 10),
(4, 'WRONG_WAY', 'Wrong-way driving', 'गलत दिशा में चलाना', 5000, 'Section 112 MV Act 2019', 20),
(5, 'MOBILE_USE', 'Mobile phone use while driving', 'चलाते वक्त मोबाइल', 5000, 'Section 184 MV Act 2019', 15),
(6, 'NO_SEATBELT', 'Not wearing seatbelt', 'बिना सीटबेल्ट', 1000, 'Section 138(3) MV Act 2019', 10),
(7, 'OVERLOADING', 'Vehicle overloading', 'ओवरलोडिंग', 2000, 'Section 113 MV Act 2019', 12);

-- Seed demo citizen user (Aadhaar/OTP are mocked)
INSERT OR IGNORE INTO users (id, phone, full_name, aadhaar_last4, is_verified, points, total_reports, accepted_reports) VALUES
(1, '+919876543210', 'Rahul Sharma', '4521', 1, 45, 4, 3);
