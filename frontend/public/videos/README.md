# Video Backgrounds

## Adding a new video

1. Place source MP4 in `public/videos/source/{name}.mp4`
2. Run: `bash scripts/optimize-videos.sh`
3. Add entry to `frontend/lib/videos.ts`
4. Use in component:
   ```tsx
   import { VideoBackground } from "./components/VideoBackground";
   import { VIDEO_BACKGROUNDS } from "../lib/videos";

   <VideoBackground {...VIDEO_BACKGROUNDS.LOGIN}>
     <YourContent />
   </VideoBackground>
   ```

## File size targets

| Format | Target |
|--------|--------|
| Source MP4 | any size |
| Optimized MP4 | < 3MB |
| Optimized WebM | < 2MB |
| Poster JPG | < 100KB |

## Requirements

- ffmpeg (`brew install ffmpeg`)
- Source videos should be 1080p or higher, 10-30 seconds, looping-friendly

## Fallback behavior

When no video file exists, the component shows a CSS gradient placeholder.
Each module has a unique gradient defined in `frontend/lib/videos.ts`.

## Current videos

(none yet — add entries here as videos are added)
