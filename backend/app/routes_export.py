"""Export routes — datasets, download, summary, docx generation."""

from io import BytesIO
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.store import store
from app.helpers import get_series, safe_value_counts, dataframe_to_excel_bytes
from app.shared import _safe, _j, _f

router = APIRouter(prefix="/api", tags=["export"])


@router.get("/export/datasets")
def get_export_datasets(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    labels = {"workforce": "Workforce", "job_catalog": "Job Catalog", "work_design": "Work Design", "org_design": "Org Design", "operating_model": "Operating Model", "change_management": "Change Mgmt"}
    exports = {}
    total_rows = 0
    available_count = 0
    for name, df in data.items():
        avail = not df.empty
        rows = int(len(df))
        if avail:
            available_count += 1
            total_rows += rows
        exports[name] = {"label": labels.get(name, name), "available": avail, "rows": rows, "cols": int(len(df.columns)) if avail else 0, "preview": _j(df, 5)}
    return _safe({"exports": exports, "summary": {"available": available_count, "total_rows": total_rows, "model_id": model_id}})


@router.get("/export/download/{dataset_name}")
def download_dataset(dataset_name: str, model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    if dataset_name not in data or data[dataset_name].empty:
        raise HTTPException(404, "Dataset empty")
    return StreamingResponse(BytesIO(dataframe_to_excel_bytes(data[dataset_name], dataset_name[:31])),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={model_id}_{dataset_name}.xlsx"})
