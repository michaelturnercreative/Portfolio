#!/usr/bin/env python3
"""Scan organized project image folders and generate the browser manifest."""

from __future__ import annotations

import json
import re
import struct
from datetime import datetime, timezone
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parents[1]
PROJECTS_ROOT = SITE_ROOT / "content" / "projects"
OUTPUT_FILE = SITE_ROOT / "content" / "generated-images.js"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
SECTIONS = (
    ("art-direction", "Art direction"),
    ("graphic-design", "Graphic design"),
    ("photography", "Photography"),
    ("digital-web", "Digital & web"),
    ("motion-video", "Motion & video"),
    ("process", "Process"),
)

BIRCH_GOLD_IMAGE_LABELS = {
    "01-Screenshot-2026-09-14-at-9.54.08-AM.png": "2026 Birch Gold information kit front and back cover",
    "02-Screenshot-2026-09-14-at-9.58.png": "2026 Birch Gold information kit shown in print, tablet, and mobile formats",
    "Screenshot-2026-09-14-at-9.57.03-AM.png": "Birch Gold silver referral print design",
    "Screenshot-2026-09-14-at-9.59.14-AM.png": "Learn and Earn event graphic on a dark background",
    "Screenshot-2026-09-14-at-9.59.25-AM.png": "Learn and Earn event graphic with course preview",
    "Screenshot-2026-09-14-at-9.59.38-AM.png": "Learn and Earn last-chance event graphic",
    "Screenshot-2026-09-14-at-9.59.52-AM.png": "Learn and Earn event graphic on a light background",
}


def project_field(source: str, field: str) -> str | None:
    pattern = rf'(?:^|\n)\s*"?{re.escape(field)}"?\s*:\s*"([^"]+)"'
    match = re.search(pattern, source)
    return match.group(1) if match else None


def image_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return sorted(
        (
            path
            for path in directory.iterdir()
            if path.is_file()
            and not path.name.startswith(".")
            and path.suffix.lower() in SUPPORTED_EXTENSIONS
        ),
        key=lambda path: path.name.casefold(),
    )


def image_size(path: Path) -> tuple[int, int] | None:
    try:
        with path.open("rb") as source:
            data = source.read(1024 * 1024)

        if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
            return struct.unpack(">II", data[16:24])

        if data[:6] in (b"GIF87a", b"GIF89a") and len(data) >= 10:
            return struct.unpack("<HH", data[6:10])

        if data.startswith(b"\xff\xd8"):
            index = 2
            sof_markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
            while index + 8 < len(data):
                if data[index] != 0xFF:
                    index += 1
                    continue
                while index < len(data) and data[index] == 0xFF:
                    index += 1
                if index >= len(data):
                    break
                marker = data[index]
                index += 1
                if marker in (0xD8, 0xD9):
                    continue
                if index + 2 > len(data):
                    break
                segment_length = struct.unpack(">H", data[index:index + 2])[0]
                if marker in sof_markers and index + 7 <= len(data):
                    height, width = struct.unpack(">HH", data[index + 3:index + 7])
                    return width, height
                index += max(segment_length, 2)

        if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
            chunk = data[12:16]
            if chunk == b"VP8X" and len(data) >= 30:
                width = 1 + int.from_bytes(data[24:27], "little")
                height = 1 + int.from_bytes(data[27:30], "little")
                return width, height
            if chunk == b"VP8 ":
                marker = data.find(b"\x9d\x01\x2a", 20)
                if marker >= 0 and marker + 7 <= len(data):
                    width = int.from_bytes(data[marker + 3:marker + 5], "little") & 0x3FFF
                    height = int.from_bytes(data[marker + 5:marker + 7], "little") & 0x3FFF
                    return width, height
            if chunk == b"VP8L" and len(data) >= 25:
                b0, b1, b2, b3 = data[21:25]
                width = 1 + (((b2 & 0x3F) << 8) | b1)
                height = 1 + ((b3 << 6) | (b2 >> 6))
                return width, height
    except (OSError, ValueError, struct.error):
        return None

    return None


def layout_for(path: Path) -> str:
    dimensions = image_size(path)
    if not dimensions or not dimensions[1]:
        return "landscape"
    ratio = dimensions[0] / dimensions[1]
    if ratio < 0.85:
        return "portrait"
    if ratio <= 1.15:
        return "square"
    if ratio > 1.65:
        return "wide"
    return "landscape"


def alt_text(path: Path) -> str:
    if path.parent.parent.parent.name == "birch-gold-digital-marketing":
        label = BIRCH_GOLD_IMAGE_LABELS.get(path.name)
        if label:
            return label
    text = re.sub(r"^\d+[-_]", "", path.stem)
    text = re.sub(r"[-_]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:1].upper() + text[1:] if text else "Project image"


def relative_url(path: Path) -> str:
    # The revision changes whenever an image is replaced or recropped, even if
    # its filename stays the same. This keeps browser previews from showing an
    # older cached version of the artwork.
    revision = path.stat().st_mtime_ns
    return f"{path.relative_to(SITE_ROOT).as_posix()}?v={revision}"


def discover_projects() -> dict[str, dict[str, object]]:
    projects: dict[str, dict[str, object]] = {}

    for project_directory in sorted(PROJECTS_ROOT.iterdir()):
        if not project_directory.is_dir() or project_directory.name.startswith("_"):
            continue
        content_file = project_directory / "content.js"
        if not content_file.is_file():
            continue

        source = content_file.read_text(encoding="utf-8")
        project_id = project_field(source, "id")
        folder = project_field(source, "folder") or project_directory.name
        if not project_id:
            print(f"Skipped {project_directory.name}: no project id found")
            continue

        images_root = project_directory / "images"
        featured = image_files(images_root / "featured")
        gallery: list[dict[str, str]] = []

        for section_folder, section_label in SECTIONS:
            for image in image_files(images_root / section_folder):
                gallery.append(
                    {
                        "src": relative_url(image),
                        "alt": alt_text(image),
                        "layout": layout_for(image),
                        "section": section_label,
                    }
                )

        projects[project_id] = {
            "folder": folder,
            "cover": relative_url(featured[0]) if featured else None,
            "gallery": gallery,
        }

    return projects


def media_fingerprint() -> tuple[tuple[str, int, int], ...]:
    records: list[tuple[str, int, int]] = []
    for path in PROJECTS_ROOT.glob("*/images/*/*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            stat = path.stat()
            records.append((str(path.relative_to(SITE_ROOT)), stat.st_mtime_ns, stat.st_size))
    return tuple(sorted(records))


def sync() -> int:
    projects = discover_projects()
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "projects": projects,
    }
    output = (
        "/* Generated by tools/sync_portfolio_images.py. Do not edit by hand. */\n"
        f"window.folderMedia = {json.dumps(payload, ensure_ascii=False, indent=2)};\n"
    )
    OUTPUT_FILE.write_text(output, encoding="utf-8")
    image_count = sum(
        (1 if project["cover"] else 0) + len(project["gallery"])
        for project in projects.values()
    )
    print(f"Portfolio image list refreshed: {image_count} organized image(s) across {len(projects)} project(s).")
    return image_count


if __name__ == "__main__":
    sync()
