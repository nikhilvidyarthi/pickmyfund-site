# PickMyFund animated logo (end card)

The closing animation from the PickMyFund launch video (v20), exported on its own so any video, reel or deck can reuse it.

## What it does (8.0 s, 30 fps, silent)

| Time | What happens |
|---|---|
| 0.25 s | The gold play-mark outline draws in |
| 0.6 s | Three gold bullish candles rise inside the mark, one by one |
| 1.4 s | `pickmyfund.com` types out beside the mark ("my" in gold), with a blinking gold cursor |
| 2.6 s | **SIMPLE.** slams in |
| 3.1 s | **CLEAR.** slams in |
| 3.7 s | **INVESTED.** (gold) slams in, with a soft warm flash on each word |
| 4.7 s | Mutual fund disclaimer fades in (versions with a background only) |
| 6.8–8.0 s | Hold on the finished card (cursor keeps blinking) |

## Files

| File | Use |
|---|---|
| `pickmyfund-logo-end_portrait_1080x1920.mp4` | Reels, Stories, Shorts end card. Brand background, includes the MF disclaimer |
| `pickmyfund-logo-end_square_1080x1080.mp4` | Feed posts (Instagram, LinkedIn, X). Brand background, includes the MF disclaimer |
| `pickmyfund-logo-end_portrait_alpha_1080x1920.webm` | Transparent (VP9 with alpha), for web pages or editors that read WebM alpha. No background, no disclaimer |
| `pickmyfund-logo-end_square_alpha_1080x1080.webm` | Same, square |
| `*_final.png` | Last frame as a still (backgrounded and transparent) |

Transparent ProRes 4444 `.mov` versions (for Premiere, Final Cut, DaVinci, After Effects) are about 85 MB each, so they are not kept in this repo. Ask for them or regenerate them (below).

## Rules when reusing

- If the content promotes mutual funds, keep the disclaimer: "Mutual fund investments are subject to market risks, read all scheme related documents carefully." The background versions already include it. When overlaying a transparent version, add it yourself.
- Do not recolour or stretch the logo. Brand colours: gold `#C9A44C`, deep pine background `#0A1517`, white `#FAFAF7`. Typeface: Inter (Bold / Black).
- The original launch video was beat-cut to its music; this export is silent, so place it on a beat in the new soundtrack (the word slams sit 0.52 s apart).

## Regenerating

Rendered with `logo_export.py` in the launch-video project (`/home/claude/reel` in the original session), which reuses the video's own drawing code (`mf.py` / `flow.py`, Skia):

```
python3 logo_export.py portrait | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - -c:v libx264 -crf 16 -pix_fmt yuv420p out.mp4
python3 logo_export.py portrait_alpha | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le out.mov
```

Variants: `portrait`, `square`, `portrait_alpha`, `square_alpha`.
