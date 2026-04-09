"""Low-level data helpers used across the platform."""

import pandas as pd
from app.schemas_definitions import COMMON_ALIASES, MODEL_ID_CANDIDATES, GLOBAL_FILTER_MAP, SCHEMAS


def normalize_column_names(df):
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def dedupe_columns(df):
    return df.loc[:, ~df.columns.duplicated()].copy()


def apply_aliases(df, alias_map=None):
    if alias_map is None:
        alias_map = COMMON_ALIASES
    df = df.copy()
    for old_col, new_col in alias_map.items():
        if old_col in df.columns:
            if new_col not in df.columns:
                df[new_col] = df[old_col]
            else:
                left = df[new_col]
                right = df[old_col]
                left_clean = left.astype(str).replace("nan", "").replace("None", "").str.strip()
                df[new_col] = left.where(left_clean != "", right)
    return dedupe_columns(df)


def get_series(df, col_name):
    if col_name not in df.columns:
        return pd.Series(dtype="object")
    result = df[col_name]
    if isinstance(result, pd.DataFrame):
        return result.iloc[:, 0] if result.shape[1] > 0 else pd.Series(dtype="object")
    return result


def clean_options(series_or_df):
    if isinstance(series_or_df, pd.DataFrame):
        if series_or_df.shape[1] == 0:
            return ["All"]
        series = series_or_df.iloc[:, 0]
    else:
        series = series_or_df
    if series is None:
        return ["All"]
    vals = [str(x).strip() for x in series.dropna().tolist() if str(x).strip() not in ("", "nan")]
    return ["All"] + sorted(set(vals))


def safe_value_counts(series):
    if series is None or len(series) == 0:
        return pd.Series(dtype="int64")
    return series.fillna("Unspecified").replace("", "Unspecified").value_counts()


def ensure_model_id(df, fallback_name):
    df = df.copy()
    existing_col = None
    for col in MODEL_ID_CANDIDATES:
        if col in df.columns:
            existing_col = col
            break
    if existing_col is None:
        df["Model ID"] = fallback_name
    else:
        if existing_col != "Model ID":
            df["Model ID"] = df[existing_col]
        df["Model ID"] = df["Model ID"].fillna("").astype(str).str.strip()
        df.loc[df["Model ID"] == "", "Model ID"] = fallback_name
    return dedupe_columns(df)


def apply_filters(df, selections):
    filtered = df.copy()
    for label, col in GLOBAL_FILTER_MAP.items():
        val = selections.get(label, "All")
        if val != "All" and col in filtered.columns:
            filtered = filtered[get_series(filtered, col).astype(str) == str(val)]
    return filtered


def build_filter_dimension_source(*dfs):
    keep = ["Function ID", "Job Family", "Sub-Family", "Geography", "Career Track", "Career Level"]
    frames = []
    for df in dfs:
        if df is not None and not df.empty:
            temp = df.copy()
            for c in keep:
                if c not in temp.columns:
                    temp[c] = ""
            frames.append(temp[keep].copy())
    if not frames:
        return pd.DataFrame(columns=keep)
    return pd.concat(frames, ignore_index=True).drop_duplicates()


def dataframe_to_excel_bytes(df, sheet_name="Data"):
    from io import BytesIO
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name=sheet_name)
    return buf.getvalue()


def empty_bundle():
    return {k: pd.DataFrame() for k in SCHEMAS.keys()}
