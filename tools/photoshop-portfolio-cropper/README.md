# Portfolio Image Cropper for Photoshop

This event-driven Photoshop script walks recursively through JPG and JPEG files in one parent folder. Images may live in separate project subfolders. It is designed for Photoshop 2026 and does not depend on a floating legacy ScriptUI palette.

For every image, it lets you select one of these portfolio presets:

- Featured project cover — 4:3 — 2000 × 1500
- Additional Work thumbnail — 4:5 — 1600 × 2000
- Square artwork — 1:1 — 1800 × 1800
- Standard landscape gallery — 3:2 — 2400 × 1600
- Wide/full-width gallery — 16:9 — 2560 × 1440
- Portrait gallery — 4:5 — 1600 × 2000
- Vertical story/mobile — 9:16 — 1440 × 2560

## Run it

1. Open Photoshop.
2. Choose **File → Scripts → Browse…**.
3. Select `Portfolio Image Cropper.jsx` from this folder.
4. Choose the single parent folder that contains the images. The script searches its subfolders automatically.
5. In the **Portfolio Image Cropper** dialog, select a preset and click **Start crop**.
6. Reposition or resize the crop on the canvas, then press **Return/Enter** to commit it.
7. The crop-completion handler automatically resizes to the exact preset dimensions, overwrites the JPG, opens the next image, and displays the next preset dialog.

Use **Skip** to leave an image unchanged. Use **Stop batch** to end the batch and leave the current image open. If a batch is interrupted, browse to `Portfolio Image Cropper.jsx` again and choose **Resume** when prompted.

## Backups and exclusions

The backup checkbox is enabled by default. Before the first overwrite, the original is copied to `_portfolio_crop_backups` inside the parent folder, preserving its subfolder path. Existing backups are never replaced, so they remain the first uncropped versions.

The recursive scan deliberately ignores `_portfolio_crop_backups` and `_alternates` folders.

Only JPG and JPEG files are processed. PNG, WebP, GIF, PSD, and other files are left untouched.

## Notes

- JPEG quality is set to 10/12 with the color profile embedded.
- Photoshop warns before enlarging a crop whose source pixels are smaller than the selected output size.
- Keep `Portfolio Cropper Handler.jsx` and `Portfolio Cropper Common.jsx` in the same folder as the launcher. Photoshop registers the handler for the Crop event while a batch is active and removes it when the batch stops or completes.
- If Photoshop cannot set the Crop tool ratio automatically, the script tells you which ratio to enter manually in the Crop tool options bar.
