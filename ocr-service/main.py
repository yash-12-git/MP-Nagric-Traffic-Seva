"""MP Nagrik Traffic Seva — OCR microservice (FastAPI).

Runs on port 8001. Reads a number plate from an uploaded image or video and
returns a watermarked thumbnail. This is a SEPARATE process from the Node API so
it can be scaled / swapped independently.
"""

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

import plate_reader

app = FastAPI(title="MP Traffic OCR Service", version="1.0.0")


@app.get("/health")
def health():
    return {"ok": True, "service": "mp-traffic-ocr"}


@app.post("/ocr/plate")
async def ocr_plate(
    file: UploadFile = File(...),
    # Optional metadata used only to watermark the thumbnail.
    case_number: str = Form(None),
    gps: str = Form(None),
    timestamp: str = Form(None),
    # Stated violation code (e.g. 'NO_HELMET') — drives the YOLO verification step.
    violation_code: str = Form(None),
):
    """Read a plate from the uploaded media. Never 500s on bad media — returns an
    empty-plate result so the backend can fall back to manual officer entry."""
    try:
        contents = await file.read()
        print(f"[ocr] received {file.filename} ({len(contents)} bytes) violation={violation_code}")
        result = plate_reader.process(
            contents, file.filename, case_number=case_number, gps=gps,
            timestamp=timestamp, violation_code=violation_code,
        )
        print(f"[ocr] -> best_plate={result.get('best_plate')} "
              f"confidence={result.get('best_confidence')} "
              f"({result.get('processing_time_ms')}ms)")
        return JSONResponse(result)
    except Exception as exc:  # noqa: BLE001 — demo resilience
        print(f"[ocr] ERROR: {exc}")
        return JSONResponse(
            status_code=200,
            content={
                "plates": [],
                "best_plate": None,
                "best_confidence": 0,
                "frame_extracted": False,
                "processing_time_ms": 0,
                "thumbnail_b64": None,
                "verification": {"available": False, "notes": f"OCR failed: {exc}."},
                "message": f"OCR failed: {exc}. Officer manual entry required.",
            },
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
