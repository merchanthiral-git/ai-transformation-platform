#!/bin/bash
SOURCE_DIR="frontend/public/audio/source"
OUTPUT_DIR="frontend/public/audio/optimized"

mkdir -p "$OUTPUT_DIR"

for f in "$SOURCE_DIR"/*.mp3; do
  name=$(basename "$f" .mp3)
  echo "Processing: $name..."
  
  # Opus (primary — best quality/size ratio)
  ffmpeg -i "$f" -c:a libopus -b:a 96k \
    "$OUTPUT_DIR/${name}.opus" -y -loglevel error
  
  # Compressed MP3 fallback
  ffmpeg -i "$f" -c:a libmp3lame -b:a 128k \
    "$OUTPUT_DIR/${name}.mp3" -y -loglevel error
    
  echo "✓ $name done"
done

echo ""
echo "=== Audio optimization complete ==="
ls -lh "$OUTPUT_DIR"
