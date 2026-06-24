"""License plate reading: frame extraction, OCR, and watermarked thumbnail.

DEMO ONLY. Uses EasyOCR on CPU. The EasyOCR reader is loaded lazily and cached
because model load is slow (a few seconds the first time).
"""

import io
import re
import base64
import time

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Indian number plate pattern: 2 letters + 2 digits + 1-2 letters + 4 digits
#   e.g. MP04AB1234  /  MP04A1234
PLATE_PATTERN = re.compile(r"[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{4}")

_reader = None


def get_reader():
    """Lazily construct and cache the EasyOCR reader (CPU)."""
    global _reader
    if _reader is None:
        import easyocr  # imported here so the module loads even if easyocr is heavy
        print("[ocr] loading EasyOCR model (first call may take a few seconds)...")
        _reader = easyocr.Reader(["en"], gpu=False)
        print("[ocr] EasyOCR ready.")
    return _reader


def extract_best_frame(video_path):
    """Extract the sharpest frame from a video (highest Laplacian variance)."""
    cap = cv2.VideoCapture(video_path)
    best_frame = None
    best_laplacian = -1.0

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    step = max(1, 10)
    indices = range(0, frame_count, step) if frame_count > 0 else range(0, 300, step)

    for i in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var > best_laplacian:
            best_laplacian = laplacian_var
            best_frame = frame

    cap.release()
    return best_frame


def load_image(file_bytes, filename):
    """Load image bytes (or first/best video frame) as a BGR numpy array."""
    lower = (filename or "").lower()
    is_video = lower.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm"))

    if is_video:
        # OpenCV needs a path for video; write to a temp file.
        import tempfile
        import os
        suffix = os.path.splitext(lower)[1] or ".mp4"
        tf = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        try:
            tf.write(file_bytes)
            tf.close()
            frame = extract_best_frame(tf.name)
            return frame, True
        finally:
            try:
                os.unlink(tf.name)
            except OSError:
                pass

    # Image path.
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img, False


def _clean(text):
    """Strip separators and upper-case OCR text for plate matching."""
    return re.sub(r"[^A-Z0-9]", "", (text or "").upper())


def _normalise_variants(s):
    """Yield the raw string plus an O/0 + I/1 corrected variant.

    EasyOCR commonly confuses the letter O with zero and the letter I with one.
    The Indian plate format is positional, so a single global swap is too blunt;
    instead we try both the raw and the swapped string and let the regex pick a
    valid match from either.
    """
    yield s
    swapped = s.replace("O", "0").replace("I", "1")
    if swapped != s:
        yield swapped


# Restrict EasyOCR to the characters that can appear on a plate. This stops it
# emitting junk tokens ("Dia", "VONI", ...) from backgrounds and holographic
# "INDIA" watermarks printed over high-security (HSRP) plates.
PLATE_ALLOWLIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# OCR confusions resolved BY POSITION. An Indian plate is structured
# [2 letters][1-2 digits][1-2 letters][4 digits], so we know which zones must be
# digits and which must be letters. A character read in a digit zone that is really
# a confusable letter (Z↔7, L↔4, O↔0, ...) is coerced to its digit, and vice-versa.
_LETTER_TO_DIGIT = {"O": "0", "Q": "0", "D": "0", "I": "1", "J": "1", "L": "4",
                    "A": "4", "Z": "7", "T": "7", "S": "5", "B": "8", "G": "6"}
_DIGIT_TO_LETTER = {"0": "O", "1": "I", "2": "Z", "4": "A", "5": "S", "6": "G",
                    "7": "T", "8": "B"}


def _coerce(seg, want):
    """Coerce a segment to all-letters ('alpha') or all-digits ('digit') using the
    positional confusion maps. Returns None if a character can't plausibly fit."""
    out = []
    for ch in seg:
        if want == "digit":
            if ch.isdigit():
                out.append(ch)
            elif ch in _LETTER_TO_DIGIT:
                out.append(_LETTER_TO_DIGIT[ch])
            else:
                return None
        else:  # alpha
            if ch.isalpha():
                out.append(ch)
            elif ch in _DIGIT_TO_LETTER:
                out.append(_DIGIT_TO_LETTER[ch])
            else:
                return None
    return "".join(out)


def _canonicalise_exact(s):
    """Coerce an exactly-plate-length string (8-10) to canonical form, or None."""
    if not (8 <= len(s) <= 10):
        return None
    # district = 1-2 digits, series = 1-2 letters; prefer the common (2,2) split.
    for dlen in (2, 1):
        for slen in (2, 1):
            if 2 + dlen + slen + 4 != len(s):
                continue
            a = _coerce(s[0:2], "alpha")
            b = _coerce(s[2:2 + dlen], "digit")
            c = _coerce(s[2 + dlen:2 + dlen + slen], "alpha")
            d = _coerce(s[2 + dlen + slen:], "digit")
            if a and b and c and d:
                return a + b + c + d
    return None


def _canonicalise(s):
    """Read a cleaned string as a full Indian plate, fixing positional OCR confusions.
    Returns the canonical plate (e.g. 'UP32FH7224') or None.

    Tries the whole string first, then slides a window so leading/trailing noise —
    the 'IND' country logo, a stray edge detection — can be shed. e.g. the two-line
    read 'UP32F'+'HZ224' = 'UP32FHZ224' becomes 'UP32FH7224' (Z in the trailing digit
    zone must be 7); 'INDUP32FHZ224' is recovered via the window."""
    direct = _canonicalise_exact(s)
    if direct:
        return direct
    # Slide a plate-length window over longer strings (prefer longer plates).
    for size in (10, 9, 8):
        if len(s) <= size:
            continue
        for i in range(0, len(s) - size + 1):
            cand = _canonicalise_exact(s[i:i + size])
            if cand:
                return cand
    return None


# Logo / country tokens that appear on plates but are never part of the number.
_IGNORE_TOKENS = {"IND", "INDIA"}


def _ocr_passes(image):
    """Yield (label, image) grayscale variants to OCR, each downscaled so its longest
    side is at most the given target width.

    Multiple scales make detection robust: smaller scales blur away fine high-contrast
    textures — notably the repeating 'INDIA' hologram on HSRP plates — that otherwise
    dominate detection and hide the large embossed characters. We never run OCR at the
    raw camera resolution (e.g. 4080px): it is slow and, on holographic plates, mostly
    detects the watermark."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    h, w = gray.shape[:2]
    longest = max(h, w)
    seen_w = set()
    for target in (1600, 1000, 640):
        if target >= longest:
            scale = 1.0
        else:
            scale = target / longest
        nw, nh = int(w * scale), int(h * scale)
        if min(nw, nh) < 40 or nw in seen_w:
            continue
        seen_w.add(nw)
        out = gray if scale == 1.0 else cv2.resize(gray, (nw, nh), interpolation=cv2.INTER_AREA)
        yield f"w{nw}", out


def _reading_order(results):
    """Return OCR detections as a flat list of (text, confidence) in reading order
    (top line left-to-right, then next line), dropping logo tokens (IND/INDIA).

    Boxes are clustered into lines by vertical proximity so a two-line plate reads
    top-then-bottom. Reading order matters because plate candidates are built from
    contiguous runs of boxes (see read_plate)."""
    def y_center(b):
        return sum(pt[1] for pt in b) / len(b)

    def x_center(b):
        return sum(pt[0] for pt in b) / len(b)

    def height(b):
        ys = [pt[1] for pt in b]
        return max(ys) - min(ys)

    boxes = [r for r in results if _clean(r[1]) not in _IGNORE_TOKENS]
    if not boxes:
        return []
    ordered = sorted(boxes, key=lambda r: y_center(r[0]))
    median_h = sorted(height(r[0]) for r in ordered)[len(ordered) // 2] or 1
    lines = []
    for r in ordered:
        if lines and abs(y_center(r[0]) - y_center(lines[-1][-1][0])) <= 0.7 * median_h:
            lines[-1].append(r)
        else:
            lines.append([r])
    flat = []
    for line in lines:
        for r in sorted(line, key=lambda r: x_center(r[0])):
            flat.append((r[1], r[2]))
    return flat


def read_plate(image):
    """Read Indian plate candidates from a frame.

    Handles single-line AND two-line plates (most motorcycles / HSRP plates), and
    embossed plates with holographic overlays, by:
      1. OCR-ing the frame at several scales with a plate-character allowlist;
      2. building candidates from contiguous runs of 1-3 boxes in reading order, so a
         plate split across boxes/lines ("RJ41S" + "H7917") is reassembled without
         pulling in an overlapping hologram misread;
      3. matching the plate regex, then canonicalising with position-aware confusion
         correction (Z->7, A->4, ...). Best by confidence wins.
    Officer-in-the-loop reviews every plate, and the confidence is surfaced.
    """
    reader = get_reader()

    # Per distinct plate: how many candidates produced it (votes) and its best conf.
    votes = {}
    conf = {}

    def add(text, confidence):
        cleaned = _clean(text)
        cand = None
        for variant in _normalise_variants(cleaned):   # exact substring match first
            m = PLATE_PATTERN.search(variant)
            if m:
                cand = m.group(0)
                break
        if cand is None:                                # else try structural fixup
            cand = _canonicalise(cleaned)
        if cand:
            votes[cand] = votes.get(cand, 0) + 1
            conf[cand] = max(conf.get(cand, 0.0), confidence)

    for _label, variant in _ocr_passes(image):
        results = reader.readtext(variant, allowlist=PLATE_ALLOWLIST)
        if not results:
            continue
        boxes = _reading_order(results)   # [(text, conf), ...] logo tokens dropped
        n = len(boxes)
        # Candidates = contiguous runs of 1-3 boxes (a plate spans at most two lines,
        # each line at most a couple of OCR boxes).
        for i in range(n):
            for size in (1, 2, 3):
                if i + size > n:
                    break
                chunk = boxes[i:i + size]
                joined = "".join(_clean(t) for (t, _) in chunk)
                mean_conf = sum(c for (_, c) in chunk) / size
                add(joined, mean_conf)

    # Rank: prefer the most complete plate (a full 10-char plate beats a truncated
    # 9-char read that dropped a character), then recurrence across scales/positions,
    # then OCR confidence.
    plates = [{"text": p, "confidence": float(conf[p]), "votes": votes[p], "bbox": None}
              for p in votes]
    plates.sort(key=lambda p: (len(p["text"]), p["votes"], p["confidence"]), reverse=True)
    return plates


def make_watermarked_thumbnail(image, case_number=None, gps=None, timestamp=None, max_w=640):
    """Produce a watermarked JPEG thumbnail (base64) from a BGR frame.

    Watermarks: case number (top-left), GPS (bottom-left), timestamp (bottom-right),
    and a red diagonal "MP TRAFFIC DEPT - DEMO" banner.
    """
    if image is None:
        return None

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)

    # Downscale.
    w, h = pil.size
    if w > max_w:
        pil = pil.resize((max_w, int(h * max_w / w)))
    w, h = pil.size

    draw = ImageDraw.Draw(pil, "RGBA")
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 18)
        small = ImageFont.truetype("DejaVuSans.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
        small = ImageFont.load_default()

    def text_with_bg(xy, txt, fnt, anchor="la"):
        draw.text(xy, txt, font=fnt, fill=(255, 255, 255, 255), anchor=anchor,
                  stroke_width=2, stroke_fill=(0, 0, 0, 200))

    if case_number:
        text_with_bg((10, 8), str(case_number), font)
    if gps:
        text_with_bg((10, h - 24), str(gps), small)
    if timestamp:
        text_with_bg((w - 10, h - 24), str(timestamp), small, anchor="ra")

    # Diagonal demo banner.
    draw.text((w / 2, h / 2), "MP TRAFFIC DEPT - DEMO", font=font, fill=(220, 40, 40, 200),
              anchor="mm", stroke_width=1, stroke_fill=(255, 255, 255, 120))

    buf = io.BytesIO()
    pil.convert("RGB").save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def process(file_bytes, filename, case_number=None, gps=None, timestamp=None):
    """Full pipeline: load -> read plate -> watermark thumbnail. Returns a dict."""
    start = time.time()
    image, frame_extracted = load_image(file_bytes, filename)

    if image is None:
        return {
            "plates": [],
            "best_plate": None,
            "best_confidence": 0,
            "frame_extracted": frame_extracted,
            "processing_time_ms": int((time.time() - start) * 1000),
            "thumbnail_b64": None,
            "message": "Could not decode media. Officer manual entry required.",
        }

    plates = read_plate(image)
    thumb = make_watermarked_thumbnail(image, case_number, gps, timestamp)

    best = plates[0] if plates else None
    result = {
        "plates": plates,
        "best_plate": best["text"] if best else None,
        "best_confidence": best["confidence"] if best else 0,
        "frame_extracted": frame_extracted,
        "processing_time_ms": int((time.time() - start) * 1000),
        "thumbnail_b64": thumb,
    }
    if not plates:
        result["message"] = "No plate detected. Officer manual entry required."
    return result
