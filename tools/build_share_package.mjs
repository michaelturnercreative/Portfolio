#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(scriptDirectory, "..");
const outputFlagIndex = process.argv.indexOf("--output");
const requestedOutput = outputFlagIndex >= 0 ? process.argv[outputFlagIndex + 1] : null;
if (outputFlagIndex >= 0 && !requestedOutput) {
  throw new Error("Provide a folder path after --output.");
}
const outputRoot = requestedOutput
  ? path.resolve(requestedOutput)
  : path.resolve(sourceRoot, "..", "Michael_Turner_Portfolio_Share");
const outputImages = path.join(outputRoot, "assets", "images");

const contentFiles = [
  "content/site.js",
  "content/experience.js",
  "content/projects/somatic-living-creative-system/content.js",
  "content/projects/birch-gold-digital-marketing/content.js",
  "content/projects/france-luxe-art-direction/content.js",
  "content/projects/france-luxe-campaigns/content.js",
  "content/projects/zumiez-ecommerce-design/content.js",
  "content/generated-images.js",
  "content/apply-folder-media.js",
  "content/archive.js"
];

if (fs.existsSync(outputRoot)) {
  throw new Error(`Share folder already exists: ${outputRoot}`);
}

const context = { window: {} };
for (const file of contentFiles) {
  const source = fs.readFileSync(path.join(sourceRoot, file), "utf8");
  vm.runInNewContext(source, context, { filename: file });
}

const siteData = JSON.parse(JSON.stringify(context.window.siteData));
const copiedSources = new Map();
const usedNames = new Map();

function sanitizeSegment(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function availableName(folder, sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase();
  const base = sanitizeSegment(path.basename(sourcePath, path.extname(sourcePath)));
  const used = usedNames.get(folder) || new Set();
  let candidate = `${base}${extension}`;
  let index = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${index}${extension}`;
    index += 1;
  }
  used.add(candidate);
  usedNames.set(folder, used);
  return candidate;
}

function copyImage(relativeSource, preferredFolder) {
  if (copiedSources.has(relativeSource)) return copiedSources.get(relativeSource);

  const absoluteSource = path.resolve(sourceRoot, relativeSource);
  if (!absoluteSource.startsWith(`${sourceRoot}${path.sep}`) || !fs.existsSync(absoluteSource)) {
    throw new Error(`Missing or invalid image reference: ${relativeSource}`);
  }

  const folder = sanitizeSegment(preferredFolder);
  const fileName = availableName(folder, absoluteSource);
  const destinationDirectory = path.join(outputImages, folder);
  const destination = path.join(destinationDirectory, fileName);
  fs.mkdirSync(destinationDirectory, { recursive: true });
  fs.copyFileSync(absoluteSource, destination);

  const publicPath = path.posix.join("assets", "images", folder, fileName);
  copiedSources.set(relativeSource, publicPath);
  return publicPath;
}

fs.mkdirSync(path.join(outputRoot, "content"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "assets"), { recursive: true });

for (const project of siteData.projects) {
  const imageFolder = project.folder || project.id;
  project.cover = copyImage(project.cover, imageFolder);
  project.gallery = project.gallery.map((image) => ({
    ...image,
    src: copyImage(image.src, imageFolder)
  }));
}

siteData.archive = siteData.archive.map((item) => ({
  ...item,
  image: copyImage(item.image, "additional-work")
}));

const siteDataSource = `/* Portable site content. Edit text between quotation marks carefully. */\nwindow.siteData = ${JSON.stringify(siteData, null, 2)};\n`;
fs.writeFileSync(path.join(outputRoot, "content", "site-data.js"), siteDataSource, "utf8");

for (const file of ["style.css", "app.js"]) {
  fs.copyFileSync(path.join(sourceRoot, file), path.join(outputRoot, file));
}

fs.copyFileSync(
  path.join(sourceRoot, "assets", "Michael-Turner-Resume.pdf"),
  path.join(outputRoot, "assets", "Michael-Turner-Resume.pdf")
);

const indexLines = fs.readFileSync(path.join(sourceRoot, "index.html"), "utf8").split("\n");
const portableIndex = [];
for (const line of indexLines) {
  if (line.includes("Editable content files")) continue;
  if (line.includes('<script src="content/')) continue;
  if (line.includes('<script src="app.js"')) {
    portableIndex.push('  <script src="content/site-data.js"></script>');
  }
  portableIndex.push(line);
}
fs.writeFileSync(path.join(outputRoot, "index.html"), portableIndex.join("\n"), "utf8");

const imageCount = copiedSources.size;
const imageBytes = [...copiedSources.values()].reduce((total, publicPath) => {
  return total + fs.statSync(path.join(outputRoot, publicPath)).size;
}, 0);
const readme = `# Michael Turner Portfolio — Share Copy

This is a self-contained copy of the portfolio website.

- Open \`index.html\` to view the website.
- Keep the complete folder together when moving or sharing it.
- The package includes only the ${imageCount} image files used by the exported website.
- Portfolio copy and image paths are stored in \`content/site-data.js\`.
- The résumé PDF is stored in \`assets\`.

The working website and its larger source-image library were not modified or included.
`;
fs.writeFileSync(path.join(outputRoot, "README.md"), readme, "utf8");

console.log(JSON.stringify({
  output: outputRoot,
  projects: siteData.projects.length,
  galleryImages: siteData.projects.reduce((count, project) => count + project.gallery.length, 0),
  archiveCards: siteData.archive.length,
  uniqueImages: imageCount,
  imageMegabytes: Number((imageBytes / 1024 / 1024).toFixed(1))
}, null, 2));
