---
title: "MorphoCat"
excerpt: "Offline desktop program for geometric morphometrics: place landmarks, align specimens, run the analyses, export figures."
sections: [web, cs]
year: 2026
tech: [React, TypeScript, Tauri, Rust, Vite, Tailwind CSS, Three.js, D3, Python, NumPy, SciPy, scikit-learn, pandas]
header:
  teaser: /assets/images/mc_4.png
sidebar:
  - title: "Role: Solo Dev"
    image: /assets/images/mc_4.png
    image_alt: "MorphoCat PCA figure"
  - text: "Year: 2026"
  - text: "Platforms: Windows, Linux"
  - text: "License: MIT"
gallery:
  - url: /assets/images/mc_1.png
    image_path: assets/images/mc_1.png
    alt: "Choosing images and the landmark count for a new session"
  - url: /assets/images/mc_2.png
    image_path: assets/images/mc_2.png
    alt: "Placing landmarks on a fly wing, with progress on the right"
  - url: /assets/images/mc_3.png
    image_path: assets/images/mc_3.png
    alt: "Carving species, family and number out of the specimen IDs"
  - url: /assets/images/mc_4.png
    image_path: assets/images/mc_4.png
    alt: "The PCA figure: points coloured by species, wireframes along both axes"
---
[GitHub Repo](https://github.com/Nispeter/MorphoCat){: .btn .btn--primary}
[Download](https://github.com/Nispeter/MorphoCat/releases){: .btn .btn--primary}

## Overview

A desktop application for **geometric morphometrics**, and a free reimplementation of
MorphoJ. You place landmarks on photographs, align the specimens, run the analyses and
export figures for publication. It installs as a single package on Windows and Linux,
needs nothing else, and makes **no network requests**.

{% include gallery %}

## Features

- **Digitizer** — landmarks and semilandmarks on your own photos, with real-world scale and per-specimen progress.
- **Categories from IDs** — split specimen codes into site, species or level by character range or separator.
- **Analyses** — Procrustes fit, PCA, CVA, LDA with cross-validation, two-block PLS, regression and allometry, modularity, phylogenetic comparative methods and quantitative genetics.
- **Outlier detection** — ranks specimens by distance from the mean shape to catch digitizing slips, and corrects swapped landmarks across the whole dataset.
- **Publication figures** — colour by one category, symbols by another, shape wireframes along the axes, export to PNG or SVG.
- **Formats** — imports TPS, NTS and Morphologika; exports TPS and CSV; one project file holds data, categories, alignment and styling.

## Tech Stack

- **Front-end:** React, TypeScript, Vite, Tailwind CSS, Three.js, D3
- **Shell:** Tauri (Rust), packaged as installer, MSI, `.deb` and AppImage
- **Compute:** Python sidecar — NumPy, SciPy, scikit-learn, statsmodels, pandas
