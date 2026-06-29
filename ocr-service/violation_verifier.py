"""Visual violation verification using a local YOLO object detector.

DEMO ONLY. Before we read a plate and create a case, we sanity-check that the
uploaded media actually shows what the citizen claims:
  - is a vehicle present?
  - is a person present?
  - does the stated violation plausibly hold, and are there other violations?

This is a SOFT, advisory step. It never blocks a submission and never throws —
on any failure (model missing, offline, bad frame) it returns an "unverified"
result and the backend flags the case for officer review.

Detection model: Ultralytics YOLOv8 on the COCO classes. COCO directly gives us
people and vehicles (person / bicycle / motorcycle / car / bus / truck). It does
NOT have helmet/seatbelt classes, so violations that need those are reported as
"needs officer review" rather than auto-confirmed — except the cases COCO *can*
decide (e.g. triple riding = 3+ people on a two-wheeler). An optional helmet
model can be plugged in via the YOLO_HELMET_WEIGHTS env var.
"""

import os
import time

import cv2

# COCO class ids we care about.
_PERSON = 0
_VEHICLE_CLASSES = {
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}
_TWO_WHEELER = {"bicycle", "motorcycle"}

# Minimum detection confidence to count an object as present.
_CONF_THRESHOLD = float(os.environ.get("YOLO_CONF", "0.35"))
_MODEL_NAME = os.environ.get("YOLO_WEIGHTS", "yolov8n.pt")

# Optional helmet/no-helmet model — makes NO_HELMET (the most common MP violation)
# auto-decidable instead of always deferring to the officer. Any Ultralytics model
# whose class names distinguish helmeted vs. bare heads works; set the weights path
# in YOLO_HELMET_WEIGHTS. Class names vary across community models, so we classify
# by substring ("no helmet"/"without"/"head" => bare; "helmet"/"with" => helmeted).
_HELMET_WEIGHTS = os.environ.get("YOLO_HELMET_WEIGHTS")
_HELMET_CONF = float(os.environ.get("YOLO_HELMET_CONF", "0.35"))

_model = None
_model_failed = False
_helmet_model = None
_helmet_failed = False


def get_model():
    """Lazily construct and cache the YOLO model. Returns None if it can't load
    (e.g. ultralytics not installed, or weights can't be downloaded offline)."""
    global _model, _model_failed
    if _model is not None or _model_failed:
        return _model
    try:
        from ultralytics import YOLO  # heavy import (pulls torch) — done lazily
        print(f"[verify] loading YOLO model '{_MODEL_NAME}' (first call may download weights)...")
        _model = YOLO(_MODEL_NAME)
        print("[verify] YOLO ready.")
    except Exception as exc:  # noqa: BLE001 — demo resilience
        print(f"[verify] could not load YOLO ({exc}); verification will be skipped.")
        _model_failed = True
        _model = None
    return _model


def get_helmet_model():
    """Lazily load the optional helmet model (None unless YOLO_HELMET_WEIGHTS set)."""
    global _helmet_model, _helmet_failed
    if not _HELMET_WEIGHTS or _helmet_failed:
        return None
    if _helmet_model is not None:
        return _helmet_model
    try:
        from ultralytics import YOLO
        print(f"[verify] loading helmet model '{_HELMET_WEIGHTS}'...")
        _helmet_model = YOLO(_HELMET_WEIGHTS)
        print("[verify] helmet model ready.")
    except Exception as exc:  # noqa: BLE001 — demo resilience
        print(f"[verify] helmet model unavailable ({exc}); NO_HELMET stays officer-decided.")
        _helmet_failed = True
        _helmet_model = None
    return _helmet_model


def _detect_helmets(image):
    """Detect helmeted vs. bare heads with the optional helmet model.

    Returns {available, helmet, no_helmet, dets}. `available=False` when no helmet
    model is configured, in which case NO_HELMET stays officer-decided (as before).
    """
    blank = {"available": False, "helmet": False, "no_helmet": False, "dets": []}
    model = get_helmet_model()
    if model is None or image is None:
        return blank
    try:
        names = getattr(model, "names", {}) or {}
        results = model(image, verbose=False, conf=_HELMET_CONF)
        helmet = no_helmet = False
        dets = []
        for r in results:
            boxes = getattr(r, "boxes", None)
            if boxes is None:
                continue
            for b in boxes:
                conf = float(b.conf[0])
                if conf < _HELMET_CONF:
                    continue
                raw = str(names.get(int(b.cls[0]), int(b.cls[0]))).lower()
                is_no = (("no" in raw or "without" in raw) and "helmet" in raw) \
                    or raw in ("head", "nohelmet", "no_helmet", "bare", "bareheaded")
                is_yes = (not is_no) and ("helmet" in raw or raw in ("with", "withhelmet"))
                if is_no:
                    no_helmet = True
                elif is_yes:
                    helmet = True
                dets.append({
                    "label": "no_helmet" if is_no else "helmet" if is_yes else raw,
                    "confidence": round(conf, 3),
                    "bbox": [float(v) for v in b.xyxy[0]],
                })
        return {"available": True, "helmet": helmet, "no_helmet": no_helmet, "dets": dets}
    except Exception as exc:  # noqa: BLE001 — demo resilience
        print(f"[verify] helmet detect error: {exc}")
        return blank


def _detect(image):
    """Run YOLO on a BGR frame. Returns a list of {label, confidence, bbox}."""
    model = get_model()
    if model is None or image is None:
        return None
    results = model(image, verbose=False)
    dets = []
    for r in results:
        boxes = getattr(r, "boxes", None)
        if boxes is None:
            continue
        for b in boxes:
            cls = int(b.cls[0])
            conf = float(b.conf[0])
            if conf < _CONF_THRESHOLD:
                continue
            label = None
            if cls == _PERSON:
                label = "person"
            elif cls in _VEHICLE_CLASSES:
                label = _VEHICLE_CLASSES[cls]
            if label is None:
                continue
            xyxy = [float(v) for v in b.xyxy[0]]
            dets.append({"label": label, "confidence": round(conf, 3), "bbox": xyxy})
    return dets


def _infer_violations(stated_code, person_count, vehicle_type, vehicle_labels, helmet=None):
    """Best-effort violation inference from the detections.

    Returns (detected_codes, stated_confirmed) where:
      - detected_codes: violation codes we could affirmatively infer (TRIPLE_RIDING
        from COCO geometry; NO_HELMET when the optional helmet model is present).
      - stated_confirmed: True / False / None (None = needs an officer / specialised
        model).
    """
    detected = []

    # Triple riding is fully decidable from COCO: a two-wheeler + 3 or more people.
    if vehicle_type in _TWO_WHEELER and person_count >= 3:
        detected.append("TRIPLE_RIDING")

    # Helmet model (optional) makes NO_HELMET decidable. helmet_verdict: True = a bare
    # head was found, False = only helmeted heads, None = no helmet model / no call.
    helmet_verdict = None
    if helmet and helmet.get("available"):
        on_two_wheeler = (vehicle_type in _TWO_WHEELER
                          or any(v in _TWO_WHEELER for v in (vehicle_labels or [])))
        if helmet.get("no_helmet"):
            helmet_verdict = True
            if (on_two_wheeler or person_count > 0) and "NO_HELMET" not in detected:
                detected.append("NO_HELMET")
        elif helmet.get("helmet"):
            helmet_verdict = False

    # Violations COCO cannot see directly (seatbelt, phone, signal, etc.) are left to
    # the officer (stated_confirmed = None).
    if stated_code == "TRIPLE_RIDING":
        stated_confirmed = "TRIPLE_RIDING" in detected
    elif stated_code == "NO_HELMET":
        # Decidable only when the helmet model is present and made a call.
        stated_confirmed = True if helmet_verdict is True else (
            False if helmet_verdict is False else None)
    elif stated_code in ("NO_SEATBELT", "MOBILE_USE", "OVERLOADING"):
        # Plausible if the right kind of vehicle + a person are present, but the
        # actual violation isn't visible to COCO — officer decides.
        stated_confirmed = None
    elif stated_code in ("SIGNAL_JUMP", "WRONG_WAY"):
        # Scene/temporal violations — not decidable from a single-frame detector.
        stated_confirmed = None
    else:
        stated_confirmed = None

    return detected, stated_confirmed


def verify(image, violation_code=None):
    """Verify an uploaded frame against the stated violation.

    Never raises. Returns a dict describing what was detected and whether the
    stated violation is plausible. `available=False` means verification could not
    run (model unavailable) and the backend should flag the case for review.
    """
    start = time.time()

    base = {
        "available": True,
        "stated_violation": violation_code,
        "vehicle_present": False,
        "person_present": False,
        "person_count": 0,
        "vehicle_type": None,
        "stated_violation_confirmed": None,
        "detected_violations": [],
        "objects": [],
        "verification_confidence": 0.0,
        "model": _MODEL_NAME,
        "helmet_check": None,
        "notes": "",
        "processing_time_ms": 0,
    }

    try:
        dets = _detect(image)
        if dets is None:
            base["available"] = False
            base["notes"] = "Verification model unavailable — officer review required."
            base["processing_time_ms"] = int((time.time() - start) * 1000)
            return base

        persons = [d for d in dets if d["label"] == "person"]
        vehicles = [d for d in dets if d["label"] != "person"]
        # Pick the dominant vehicle by detector confidence.
        top_vehicle = max(vehicles, key=lambda d: d["confidence"], default=None)
        vehicle_type = top_vehicle["label"] if top_vehicle else None
        vehicle_labels = sorted({d["label"] for d in vehicles})

        # Optional helmet model (only runs when YOLO_HELMET_WEIGHTS is configured).
        helmet = _detect_helmets(image)

        detected_codes, stated_confirmed = _infer_violations(
            violation_code, len(persons), vehicle_type, vehicle_labels, helmet
        )

        # Overall verification confidence: how sure we are about the *presence*
        # checks (vehicle + person), which is what this step really establishes.
        presence_confs = [d["confidence"] for d in dets]
        verification_confidence = round(max(presence_confs), 3) if presence_confs else 0.0

        base.update(
            {
                "vehicle_present": bool(vehicles),
                "person_present": bool(persons),
                "person_count": len(persons),
                "vehicle_type": vehicle_type,
                "vehicle_types": vehicle_labels,
                "stated_violation_confirmed": stated_confirmed,
                "detected_violations": detected_codes,
                # Keep the payload small — top 10 detections by confidence.
                "objects": sorted(dets, key=lambda d: d["confidence"], reverse=True)[:10],
                "verification_confidence": verification_confidence,
                "helmet_check": (
                    None if not helmet.get("available")
                    else "no_helmet" if helmet.get("no_helmet")
                    else "helmet" if helmet.get("helmet")
                    else "unclear"
                ),
                "notes": _summarise(vehicles, persons, vehicle_type, detected_codes,
                                    violation_code, stated_confirmed),
                "processing_time_ms": int((time.time() - start) * 1000),
            }
        )
        return base
    except Exception as exc:  # noqa: BLE001 — demo resilience
        print(f"[verify] ERROR: {exc}")
        base["available"] = False
        base["notes"] = f"Verification failed: {exc}. Officer review required."
        base["processing_time_ms"] = int((time.time() - start) * 1000)
        return base


def _summarise(vehicles, persons, vehicle_type, detected_codes, stated_code, stated_confirmed):
    """Build a short human-readable summary for the officer note."""
    parts = []
    if vehicles:
        parts.append(f"vehicle detected ({vehicle_type})")
    else:
        parts.append("NO vehicle detected")
    if persons:
        parts.append(f"{len(persons)} person(s) detected")
    else:
        parts.append("NO person detected")
    if stated_code:
        if stated_confirmed is True:
            parts.append(f"stated violation {stated_code} CONFIRMED")
        elif stated_confirmed is False:
            parts.append(f"stated violation {stated_code} NOT supported by detection")
        else:
            parts.append(f"stated violation {stated_code} could not be auto-verified")
    extra = [c for c in detected_codes if c != stated_code]
    if extra:
        parts.append("other possible violations: " + ", ".join(extra))
    return "; ".join(parts) + "."
