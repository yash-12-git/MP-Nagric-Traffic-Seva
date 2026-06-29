"""License-plate region detector (the ALPR "detect" stage).

DEMO ONLY. Running OCR on a whole frame is the single biggest accuracy killer:
the plate is a tiny, low-contrast region and EasyOCR spends its attention on
backgrounds and HSRP holograms. A dedicated license-plate detector crops the
plate ROI first, so OCR only ever sees a tight, upscaled plate — usually a large
exact-match improvement.

This is a SOFT dependency. If no plate-detection weights are available (the env
var isn't set, the file is missing, ultralytics can't load), `detect()` returns
None and the caller falls back to whole-frame OCR (the previous behaviour). It
never raises.

Provide weights via YOLO_PLATE_WEIGHTS — any Ultralytics-loadable single-class
license-plate model, e.g.:
  - a local `license_plate_detector.pt` (common community weight), or
  - a HuggingFace export such as `keremberke/yolov8m-license-plate`.
"""

import os
import time

_PLATE_WEIGHTS = os.environ.get("YOLO_PLATE_WEIGHTS", "license_plate_detector.pt")
_PLATE_CONF = float(os.environ.get("YOLO_PLATE_CONF", "0.25"))

_model = None
_model_failed = False


def available():
    return get_model() is not None


def get_model():
    """Lazily load and cache the plate detector. Returns None if unavailable."""
    global _model, _model_failed
    if _model is not None or _model_failed:
        return _model
    try:
        from ultralytics import YOLO  # heavy import (torch) — done lazily
        print(f"[plate-det] loading plate detector '{_PLATE_WEIGHTS}'...")
        _model = YOLO(_PLATE_WEIGHTS)
        print("[plate-det] ready.")
    except Exception as exc:  # noqa: BLE001 — demo resilience
        print(f"[plate-det] no plate detector ({exc}); falling back to whole-frame OCR.")
        _model_failed = True
        _model = None
    return _model


def detect(image, max_rois=4):
    """Return plate ROIs as a list of {bbox:[x1,y1,x2,y2], confidence}, best first.

    Returns None when the detector is unavailable (so the caller can fall back),
    and [] when the detector ran but found no plate.
    """
    model = get_model()
    if model is None or image is None:
        return None
    try:
        h, w = image.shape[:2]
        results = model(image, verbose=False, conf=_PLATE_CONF)
        rois = []
        for r in results:
            boxes = getattr(r, "boxes", None)
            if boxes is None:
                continue
            for b in boxes:
                conf = float(b.conf[0])
                x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
                # Clamp to frame bounds.
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                if x2 - x1 < 8 or y2 - y1 < 6:
                    continue
                rois.append({"bbox": [x1, y1, x2, y2], "confidence": round(conf, 3)})
        rois.sort(key=lambda d: d["confidence"], reverse=True)
        return rois[:max_rois]
    except Exception as exc:  # noqa: BLE001 — demo resilience
        print(f"[plate-det] ERROR: {exc}")
        return None


def crop(image, bbox, pad_ratio=0.08):
    """Crop a padded plate ROI from a BGR frame."""
    h, w = image.shape[:2]
    x1, y1, x2, y2 = bbox
    pw = (x2 - x1) * pad_ratio
    ph = (y2 - y1) * pad_ratio
    x1 = int(max(0, x1 - pw)); y1 = int(max(0, y1 - ph))
    x2 = int(min(w, x2 + pw)); y2 = int(min(h, y2 + ph))
    if x2 <= x1 or y2 <= y1:
        return None
    return image[y1:y2, x1:x2]
