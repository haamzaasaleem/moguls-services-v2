# Warehouse video

`warehouse.mp4` (H.264) and `warehouse.webm` (VP9) are the same 16 second clip, muted, 1600 x 900. `warehouse-poster.jpg` shows while it loads. If the video files are missing, the home page video section stays hidden.

The clip is cut from two Pexels stock videos (4292300 and 4292902): a worker walking into a racking aisle, then a close shot of a worker scanning stock with a handheld scanner and tablet, joined with a crossfade.

To replace it with your own footage, export a new `warehouse.mp4` and make the WebM and poster from it (needs ffmpeg):

    ffmpeg -i input.mp4 -t 20 -an -vf "scale=1280:-2" -c:v libx264 -crf 27 -preset slow -movflags +faststart warehouse.mp4
    ffmpeg -i warehouse.mp4 -c:v libvpx-vp9 -crf 38 -b:v 0 -an warehouse.webm
    ffmpeg -ss 0.5 -i warehouse.mp4 -frames:v 1 -q:v 4 warehouse-poster.jpg

## Grocery pack video (Variety Packs page)

Save a clip of grocery or snack items being packed as `grocery-pack.mp4`, plus `grocery-pack.webm` made with the same commands as above. Once the MP4 is here it replaces the 3D pack animation at the top of the Variety Packs page.
