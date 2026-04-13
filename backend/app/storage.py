"""File storage abstraction — Cloudflare R2 (production) or local filesystem (development).

Usage:
    from app.storage import storage
    url = storage.upload_file(file_bytes, "data.xlsx")
    data = storage.get_file("data.xlsx")
    storage.delete_file("data.xlsx")

All files are stored under the "uploads/" prefix.

Environment variables (all optional — falls back to local disk):
    R2_ACCESS_KEY_ID     — Cloudflare R2 access key
    R2_SECRET_ACCESS_KEY — Cloudflare R2 secret key
    R2_ENDPOINT          — R2 endpoint URL (e.g. https://<account_id>.r2.cloudflarestorage.com)
    R2_BUCKET            — R2 bucket name
    R2_PUBLIC_URL        — Public URL base for the bucket (e.g. https://pub-xxx.r2.dev)
"""

import os
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

PREFIX = "uploads"


class _R2Storage:
    """Cloudflare R2 storage via S3-compatible API."""

    def __init__(self) -> None:
        import boto3
        self.bucket_name = os.environ["R2_BUCKET"]
        self.public_url = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")
        self._client = boto3.client(
            "s3",
            endpoint_url=os.environ["R2_ENDPOINT"],
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            region_name="auto",
        )

    def _key(self, filename: str) -> str:
        return f"{PREFIX}/{filename}"

    def upload_file(self, file_bytes: bytes, filename: str) -> str:
        """Upload file bytes to R2. Returns the public URL."""
        key = self._key(filename)
        content_type = "application/octet-stream"
        if filename.endswith(".xlsx"):
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif filename.endswith(".xls"):
            content_type = "application/vnd.ms-excel"
        elif filename.endswith(".csv"):
            content_type = "text/csv"

        self._client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        if self.public_url:
            return f"{self.public_url}/{key}"
        return f"r2://{self.bucket_name}/{key}"

    def get_file(self, filename: str) -> Optional[bytes]:
        """Download file bytes from R2. Returns None if not found."""
        try:
            resp = self._client.get_object(Bucket=self.bucket_name, Key=self._key(filename))
            return resp["Body"].read()
        except self._client.exceptions.NoSuchKey:
            return None
        except Exception:
            return None

    def delete_file(self, filename: str) -> bool:
        """Delete a file from R2. Returns True if successful."""
        try:
            self._client.delete_object(Bucket=self.bucket_name, Key=self._key(filename))
            return True
        except Exception:
            return False

    def list_files(self, prefix: str = "") -> list[str]:
        """List files under the uploads prefix. Returns filenames (without prefix)."""
        full_prefix = f"{PREFIX}/{prefix}" if prefix else f"{PREFIX}/"
        try:
            resp = self._client.list_objects_v2(Bucket=self.bucket_name, Prefix=full_prefix)
            contents = resp.get("Contents", [])
            return [obj["Key"].replace(f"{PREFIX}/", "", 1) for obj in contents]
        except Exception:
            return []


class _LocalStorage:
    """Local filesystem fallback for development."""

    def __init__(self) -> None:
        self.base_dir = Path(__file__).parent.parent / "data" / PREFIX
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload_file(self, file_bytes: bytes, filename: str) -> str:
        """Save file to local data/uploads/ directory. Returns the file path."""
        path = self.base_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(file_bytes)
        return f"file://{path.resolve()}"

    def get_file(self, filename: str) -> Optional[bytes]:
        """Read file from local storage. Returns None if not found."""
        path = self.base_dir / filename
        if path.is_file():
            return path.read_bytes()
        return None

    def delete_file(self, filename: str) -> bool:
        """Delete a file from local storage."""
        path = self.base_dir / filename
        try:
            path.unlink(missing_ok=True)
            return True
        except Exception:
            return False

    def list_files(self, prefix: str = "") -> list[str]:
        """List files in local storage."""
        search_dir = self.base_dir / prefix if prefix else self.base_dir
        if not search_dir.is_dir():
            return []
        return [str(p.relative_to(self.base_dir)) for p in search_dir.rglob("*") if p.is_file()]


def _make_unique_filename(original_name: str, user_id: str = "") -> str:
    """Generate a unique filename preserving the original extension."""
    ext = Path(original_name).suffix.lower()
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    h = hashlib.sha256(f"{user_id}:{original_name}:{ts}".encode()).hexdigest()[:8]
    stem = Path(original_name).stem[:50]  # Truncate long names
    return f"{user_id}/{ts}_{stem}_{h}{ext}" if user_id else f"{ts}_{stem}_{h}{ext}"


def _init_storage():
    """Initialize the appropriate storage backend."""
    r2_key = os.environ.get("R2_ACCESS_KEY_ID", "")
    r2_secret = os.environ.get("R2_SECRET_ACCESS_KEY", "")
    r2_endpoint = os.environ.get("R2_ENDPOINT", "")
    r2_bucket = os.environ.get("R2_BUCKET", "")

    if r2_key and r2_secret and r2_endpoint and r2_bucket:
        try:
            s = _R2Storage()
            print(f"[Storage] Cloudflare R2 configured (bucket: {r2_bucket})")
            return s
        except Exception as e:
            print(f"[Storage] R2 init failed ({e}), falling back to local filesystem")

    print("[Storage] Using local filesystem (data/uploads/)")
    return _LocalStorage()


# Module-level singleton
storage = _init_storage()
make_unique_filename = _make_unique_filename
