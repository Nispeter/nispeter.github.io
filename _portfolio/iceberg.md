---
title: "Iceberg"
excerpt: "Local-first personal finance app for Chile: the waterline splits committed spending from what you can decide on."
sections: [web, cs]
year: 2026
tech: [React Native, Expo, TypeScript, React, SQLite, Drizzle ORM, Vitest, GitHub Actions]
header:
  teaser: /assets/images/ib_cover.jpg
sidebar:
  - title: "Role: Solo Dev"
    image: /assets/images/ib_cover.jpg
    image_alt: "The waterline splitting committed from variable spending"
  - text: "Platforms: Android, Web"
  - text: "Year: 2026"
  - text: "License: MIT"
gallery:
  - url: /assets/images/ib_1.jpg
    image_path: assets/images/ib_1.jpg
    alt: "Monthly summary: available balance and the iceberg splitting committed from variable spending"
  - url: /assets/images/ib_2.jpg
    image_path: assets/images/ib_2.jpg
    alt: "Category breakdown, with month-over-month variation"
  - url: /assets/images/ib_3.jpg
    image_path: assets/images/ib_3.jpg
    alt: "Day by day: spending calendar and running balance for the month"
  - url: /assets/images/ib_4.jpg
    image_path: assets/images/ib_4.jpg
    alt: "Adding a movement by hand, with the committed/variable toggle"
---
[GitHub Repo](https://github.com/Nispeter/IcebergBillTracker){: .btn .btn--primary}
[Download APK](https://github.com/Nispeter/IcebergBillTracker/releases/latest/download/iceberg.apk){: .btn .btn--primary}

## Overview

A personal-finance app built around one idea: above the waterline goes **committed**
spending — rent, bills, instalments, the things that arrive whether you like it or not —
and below it goes the **variable** spending, the only part you can decide on. The line is
computed so the *area* above it is the exact proportion, not eyeballed.

**Local-first**: the data lives on the phone and never leaves it unless you export it.
There is no server and no account.

{% include gallery class="gallery--phone" %}

## Features

- **Bank statement import** — Banco de Chile `.xls`, with manual mapping for other banks. Reimporting the same file duplicates nothing.
- **Automatic categorization** by merchant, with your own rules on top of twelve built-in categories.
- **Recurring bills** — detects periodic charges in your history and offers to create them.
- **Outlier flagging** with median and MAD instead of averages, so one big month doesn't move the baseline.
- **Sync between phones** through a shared folder, with optional encryption. Each device writes its own file and reads the others'.
- **Separate books** — a shared one and a personal one, and you choose which travels.

## Engineering Notes

- **Money is integers.** The Chilean peso has no decimals, and `0.1 + 0.2` in a balance is unacceptable.
- **Dates are `YYYY-MM-DD` with UTC arithmetic**, to sidestep daylight saving.
- **Nothing is really deleted** — every row carries a tombstone, which is what makes a deletion travel when syncing.
- **Ordering comes from an HLC** — the lexicographic order of `updatedAt` is the causal order, and that is why the merge converges.

## Tech Stack

- **App:** Expo, React Native, expo-router — Android and web from the same code
- **Data:** SQLite via Drizzle ORM, in an npm-workspaces monorepo where the logic knows nothing about React
- **Testing & delivery:** Vitest (658 tests), typecheck, and a GitHub Actions workflow that builds and publishes the APK from a tag
