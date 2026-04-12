#!/usr/bin/env bash
#
# Video Optimization Script for AI Transformation Platform
#
# Processes source MP4s into web-optimized formats:
#   - H.264 MP4 (web-optimized, no audio, < 3MB target)
#   - WebM/VP9 (smaller file size for Chrome/Firefox, < 2MB target)
#   - Poster JPG (first frame, < 100KB target)
#
# Usage:
#   bash scripts/optimize-videos.sh
#
# Place source MP4s in: frontend/public/videos/source/
# Output goes to:       frontend/public/videos/optimized/

set -euo pipefail

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed."
    echo ""
    echo "Install via Homebrew:"
    echo "  brew install ffmpeg"
    echo ""
    echo "Or download from: https://ffmpeg.org/download.html"
    exit 1
fi

SOURCE_DIR="frontend/public/videos/source"
OUTPUT_DIR="frontend/public/videos/optimized"

# Find project root (script may be called from any directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$PROJECT_ROOT/$SOURCE_DIR"
OUTPUT_DIR="$PROJECT_ROOT/$OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

if [ -z "$(ls -A "$SOURCE_DIR"/*.mp4 2>/dev/null)" ]; then
    echo "No source MP4 files found in $SOURCE_DIR"
    echo "Place your source videos there and re-run this script."
    exit 0
fi

echo "=== Video Optimization Pipeline ==="
echo "Source: $SOURCE_DIR"
echo "Output: $OUTPUT_DIR"
echo ""

for src in "$SOURCE_DIR"/*.mp4; do
    name=$(basename "$src" .mp4)
    echo "Processing: $name"

    # 1. H.264 MP4 — web-optimized, no audio
    echo "  → MP4 (H.264, CRF 28, faststart)..."
    ffmpeg -y -i "$src" \
        -vcodec libx264 -crf 28 -preset slow \
        -movflags faststart \
        -an \
        -vf "scale=1920:-2" \
        "$OUTPUT_DIR/${name}.mp4" \
        -loglevel warning

    # 2. WebM/VP9 — smaller for Chrome/Firefox
    echo "  → WebM (VP9, CRF 33)..."
    ffmpeg -y -i "$src" \
        -vcodec libvpx-vp9 -crf 33 -b:v 0 \
        -an \
        -vf "scale=1920:-2" \
        "$OUTPUT_DIR/${name}.webm" \
        -loglevel warning

    # 3. Poster JPG — first frame
    echo "  → Poster (JPG, first frame)..."
    ffmpeg -y -i "$src" \
        -vframes 1 -f image2 \
        -q:v 3 \
        "$OUTPUT_DIR/${name}-poster.jpg" \
        -loglevel warning

    # Report sizes
    mp4_size=$(du -h "$OUTPUT_DIR/${name}.mp4" | cut -f1)
    webm_size=$(du -h "$OUTPUT_DIR/${name}.webm" | cut -f1)
    poster_size=$(du -h "$OUTPUT_DIR/${name}-poster.jpg" | cut -f1)
    echo "  ✓ MP4: $mp4_size | WebM: $webm_size | Poster: $poster_size"
    echo ""
done

echo "=== Done ==="
echo "Files are in: $OUTPUT_DIR"
echo "Next: add entries to frontend/lib/videos.ts"
