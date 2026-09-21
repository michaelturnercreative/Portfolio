# Portfolio content guide

The website layout lives in `index.html`, `style.css`, and `app.js`. For normal copy and image updates, you only need the files inside this `content` folder.

## Where to edit

- `site.js` — homepage headline, introduction, About copy, contact details, capabilities, and focus areas.
- `experience.js` — each expandable employer row and its longer description.
- `archive.js` — the smaller cards under Additional Work. New thumbnails can go in `archive-images`.
- `projects/[project-name]/content.js` — all copy and images for one featured project page.

The current project folders are:

- `france-luxe-art-direction`
- `france-luxe-campaigns`
- `birch-gold-digital-marketing`
- `somatic-living-creative-system`
- `zumiez-ecommerce-design`

## Editing copy safely

Edit the words between quotation marks. Keep the field names, quotation marks, brackets, and commas in place.

```js
title: "Your updated project title",
summary: "Your updated summary.",
```

If the page becomes blank after an edit, the most common cause is a missing quote or comma in the file you just changed.

## Replacing or adding images

Each project now has organized image folders for `featured`, `art-direction`, `graphic-design`, `photography`, `digital-web`, `motion-video`, and `process`.

### Finder folder workflow

1. Open `content/projects` in Finder.
2. Open the project you want to update, then open its `images` folder.
3. Drop JPG, PNG, WebP, or GIF files into the appropriate named section.
4. Double-click `Refresh Portfolio Images.command` at the top level of `Final_Website`.
5. Refresh the portfolio in your browser.

The first image alphabetically inside `featured` becomes the project cover. Images inside the other six sections are added to the gallery in section order. Their portrait, square, landscape, or wide layout is detected automatically from the image dimensions.

For a continuously updating local preview, double-click `Start Portfolio.command`. It opens the portfolio and watches the organized image folders while it runs. After dropping in images, wait a couple of seconds and refresh the browser.

`editor.html` is now a visual reference for this Finder-based workflow; it does not request browser write access.

### Curated content files

Each project's `content.js` holds its title, summary, role, links, and descriptive copy. The displayed cover and gallery come from the organized image folders after `Refresh Portfolio Images.command` updates `generated-images.js`. Change the image files and refresh the list to update the displayed artwork.

The optional `results` list creates a row of concise outcomes on a project page. Use only specific, supportable facts. If a project has no reliable result to feature, remove the entire `results` block.

## Adding project links

Each project's `content.js` includes an optional `links` block:

```js
links: {
  website: "https://example.com",
  youtube: "https://youtube.com/@example",
  instagram: "https://instagram.com/example",
  tiktok: "https://tiktok.com/@example",
  twitter: "https://x.com/example",
  linkedin: "https://linkedin.com/company/example"
},
```

Paste the full public URL beside the appropriate service. Website, YouTube, Instagram, TikTok, X/Twitter, and LinkedIn links appear with their icons below the project details. Leave a value empty, or omit it, and that link will not appear.

## Changing featured project order

Project order is controlled by the project `<script>` lines near the bottom of `index.html`. Move those lines into the order you want, then update each project's `number` field to match.

## Adding a featured project

1. Duplicate the `_project-template` folder and rename it with short lowercase words separated by hyphens.
2. Fill in its `content.js` and add images to its `images` folder.
3. Give the project a unique `id`.
4. Add a matching script line in `index.html` before `content/archive.js`:

```html
<script src="content/projects/your-project-folder/content.js"></script>
```

5. To link an experience row or Additional Work card to it, use the same project `id` in that item's `project` field.

This format uses regular JavaScript content files so the portfolio still works when `index.html` is opened directly from your computer.


## September 2026 curation

The five project galleries now use `folderGalleryOnly: true`: the organized folders are the single source for their displayed images. Refreshing replaces the gallery rather than appending older selections. Unselected previous assets and uncompressed originals are preserved in the sibling `Portfolio_Source_Archive` folder, outside the publishable website.

Use a numeric filename prefix (`01-`, `02-`) to control order within each section. The prefix is omitted from generated alternative text. Featured artwork uses `coverFit: "contain"` to preserve embedded typography, or `"cover"` for editorial photography. `coverCaption` optionally provides context beneath the project’s lead image.

The current featured order is France Luxe Art Direction, Birch Gold, Somatic Living, and France Luxe Digital Campaigns. Zumiez remains accessible through Additional Work and Experience, with its own curated cover and gallery.
