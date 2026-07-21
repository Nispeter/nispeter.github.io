---
title: "This Portfolio"
excerpt: "The site you're on: a custom Jekyll theme with an interactive 3D 'cosmic observatory' home built in Three.js."
sections: [web]
year: 2025
header:
  teaser:   # no image — shows the themed placeholder
sidebar:
  - title: "Role: Design & Development"
  - text: "Year: 2025"
  - text: "Stack: Jekyll, Three.js, vanilla CSS"
---
[GitHub Repo](https://github.com/Nispeter/nispeter.github.io){: .btn .btn--primary}
[Live Site](https://nispeter.github.io/){: .btn .btn--primary}

## Overview

This portfolio is itself a project. It started as a generic themed template and was
rebuilt from the ground up into a **custom, lightweight Jekyll theme** with an
immersive **3D landing page** — a "cosmic observatory" where each planet is a
discipline you can explore: Gamedev, Web & Tools, and Computer Science.

## What went into it

- **Custom Jekyll theme** — hand-written layouts and includes (no framework), replacing
  the previous off-the-shelf theme while keeping all content authored in Markdown.
- **3D home scene** — a self-contained [Three.js](https://threejs.org/) solar system:
  procedural low-poly planets, an orbiting layout, a starfield, mouse parallax, and a
  camera "warp" transition on click.
- **Accessible by design** — the 3D scene degrades gracefully to real, keyboard-navigable
  links when WebGL is unavailable, and honours `prefers-reduced-motion`.
- **One cohesive stylesheet** — a small, dependency-free CSS design system (palette,
  starfield, gallery + lightbox, responsive nav) that themes every page consistently.

## Tech Stack

- **Site generator:** Jekyll (GitHub Pages)
- **3D:** Three.js (vendored, pinned)
- **Styling:** Vanilla CSS (custom properties, grid/flex)
- **Hosting:** GitHub Pages
