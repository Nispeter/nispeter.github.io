---
# ──────────────────────────────────────────────────────────────────────
# PROJECT TEMPLATE
# Copy this file to  _portfolio/<your-slug>.md
# The file name becomes the URL:  _portfolio/my-game.md  →  /portfolio/my-game/
# (this template file itself is excluded from the build)
# ──────────────────────────────────────────────────────────────────────

title: "Project Name"
excerpt: "One-line summary shown on the card and at the top of the page."

# Which planet(s) this belongs to. One or more of: gamedev, web, cs
sections: [gamedev]

# Orders projects (newest first). Just the year as a number.
year: 2025

header:
  # Card / cover image. Put the file in assets/images/<your-slug>/ and point here.
  # Leave blank to show an automatic themed placeholder instead.
  teaser: /assets/images/your-slug/cover.png

# Right-hand info panel. The first item may include an image (logo/cover).
sidebar:
  - title: "Role: Solo Dev"
    image: /assets/images/your-slug/cover.png   # optional
    image_alt: "Project logo"
  - text: "Genres: XX"
  - text: "Year: 2025"
  - text: "Studio: XX"

# Optional image gallery (grid + lightbox). Delete this block if you don't need it.
gallery:
  - image_path: /assets/images/your-slug/shot1.png
    alt: "Screenshot 1"
  - image_path: /assets/images/your-slug/shot2.png
    alt: "Screenshot 2"
---

<!-- Buttons: repeat or delete as needed. -->
[GitHub Repo](https://github.com/USER/REPO){: .btn .btn--primary}
[Live Demo](https://example.com){: .btn .btn--primary}

## Overview

Describe the project here.

<!-- Renders the gallery defined above. Delete if you have no gallery. -->
{% include gallery %}

## Tech Stack

- **Language:** X
- **Engine / Framework:** X

## Features

- **A** – what it does.
- **B** – what it does.
