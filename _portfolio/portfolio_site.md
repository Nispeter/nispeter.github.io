---
title: "This Portfolio"
excerpt: "The site you're on: a custom Jekyll theme with an interactive 3D 'cosmic observatory' home built in Three.js."
sections: [web]
year: 2025
tech: [Jekyll, Three.js, JavaScript, CSS]
header:
  teaser: /assets/images/ptf_1.png
sidebar:
  - title: "Role: Design & Development"
    image: /assets/images/ptf_1.png
    image_alt: "The cosmic observatory home page with the idle game panel open"
  - text: "Year: 2025"
gallery:
  - url: /assets/images/ptf_1.png
    image_path: assets/images/ptf_1.png
    alt: "The 3D observatory home page, with the Space Automation idle game running alongside it"
---
[GitHub Repo](https://github.com/Nispeter/nispeter.github.io){: .btn .btn--primary}
[Live Site](https://nispeter.github.io/){: .btn .btn--primary}

## Overview

This portfolio is itself a project. It started as a generic themed template and was
rebuilt from the ground up into a **custom, lightweight Jekyll theme** with an
immersive **3D landing page** — a "cosmic observatory" where each planet is a
discipline you can explore: Gamedev, Web & Tools, and Computer Science.

{% include gallery %}

## What went into it

- **Custom Jekyll theme** — hand-written layouts and includes (no framework), replacing
  the previous off-the-shelf theme while keeping all content authored in Markdown.
- **3D home scene** — a self-contained [Three.js](https://threejs.org/) solar system:
  procedural low-poly planets, an orbiting layout, a starfield, mouse parallax, and a
  camera "warp" transition on click.
- **A hidden idle game** — mine the asteroid belt and "Space Automation" unfolds in the
  same scene: fleets, an energy economy and a research tree, all rendered as real ships
  orbiting the star.
- **Accessible by design** — the 3D scene degrades gracefully to real, keyboard-navigable
  links when WebGL is unavailable, and honours `prefers-reduced-motion`.
- **One cohesive stylesheet** — a small, dependency-free CSS design system (palette,
  starfield, gallery + lightbox, responsive nav) that themes every page consistently.
