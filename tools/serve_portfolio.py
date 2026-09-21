#!/usr/bin/env python3
"""Serve the portfolio locally and keep the folder-image manifest current."""

from __future__ import annotations

import sys
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from sync_portfolio_images import media_fingerprint, sync


SITE_ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
PORT = 4173


class PortfolioHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        if self.path.split("?", 1)[0].endswith("/content/generated-images.js"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def watch_images() -> None:
    previous = media_fingerprint()
    while True:
        time.sleep(2)
        current = media_fingerprint()
        if current != previous:
            try:
                sync()
            except Exception as error:  # Keep the preview alive if a file is mid-copy.
                print(f"Image refresh delayed: {error}")
            previous = current


def main() -> None:
    sync()
    handler = partial(PortfolioHandler, directory=str(SITE_ROOT))
    try:
        server = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as error:
        print(f"Could not start the portfolio at http://{HOST}:{PORT}/: {error}")
        print("Close the other local preview window, then try again.")
        raise SystemExit(1) from error

    watcher = threading.Thread(target=watch_images, daemon=True)
    watcher.start()
    url = f"http://{HOST}:{PORT}/"
    print(f"Portfolio running at {url}")
    print("Drop images into the project folders, then refresh the browser.")
    print("Press Control-C in this window when you are finished.")

    if "--open" in sys.argv:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nPortfolio preview stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
