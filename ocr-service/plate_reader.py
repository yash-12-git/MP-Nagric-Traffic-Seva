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


def read_plate(image):
    """Run EasyOCR and return plate candidates matching the Indian plate pattern.

    Matches per-box AND against the concatenation of all boxes, because EasyOCR
    often splits a plate across boxes (e.g. "MP04" + "AB1234").
    """
    reader = get_reader()
    results = reader.readtext(image)

    plates = []
    seen = set()

    def add(text, confidence, bbox=None):
        for variant in _normalise_variants(_clean(text)):
            m = PLATE_PATTERN.search(variant)
            if m and m.group(0) not in seen:
                seen.add(m.group(0))
                plates.append({
                    "text": m.group(0),
                    "confidence": float(confidence),
                    "bbox": [int(c) for coord in bbox for c in coord] if bbox else None,
                })
                return

    # 1. Per-box (keeps an accurate per-detection confidence + bbox).
    for (bbox, text, confidence) in results:
        add(text, confidence, bbox)

    # 2. Concatenation of all boxes, left-to-right, to recover split plates.
    #    Use the mean confidence of the contributing detections as an estimate.
    if results:
        joined = "".join(_clean(t) for (_, t, _) in results)
        mean_conf = sum(c for (_, _, c) in results) / len(results)
        add(joined, mean_conf)

    # Sort best-first.
    plates.sort(key=lambda p: p["confidence"], reverse=True)
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
