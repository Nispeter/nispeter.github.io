---
title: "Rhythm Tetris"
excerpt: "A fresh take on the classic Tetris experience."
header:
  image: /assets/images/tt_game.png
  teaser: /assets/images/tetris_front.png
sidebar:
  - title: "Systems programmer, Design"
    image: /assets/images/tetris_front.png
    image_alt: "logo"
    text: "Puzzle"
    text: "2020"
gallery:
  - url: /assets/images/tt_game.png
    image_path: assets/images/tt_game.png
    alt: "placeholder image 3"
  - url: /assets/images/tt_controls.png
    image_path: assets/images/tt_controls.png
    alt: "placeholder image 1"
  - url: /assets/images/tt_game_over.png
    image_path: assets/images/tt_game_over.png
    alt: "placeholder image 2"

---

## Game Description
**Rhythm Tetris** is a fresh take on the classic Tetris experience. While the core gameplay remains—aligning falling tetrominoes to clear lines and earn points—players must also synchronize their movements with the rhythm of the music. 

{% include gallery %}

## Tech Stack
- **Language:** C
- **Graphics & Audio Library:** SDL2
- **Additional Dependencies:**
  - `SDL_image` (handling image assets)
  - `SDL_ttf` (rendering text with fonts)
  - `SDL_mixer` (music and sound effects)
- **Visuals:** Aseprite

## Features Developed
I was responsible for implementing key mechanics and UI elements, including:
- **Border collision detection** – Ensuring tetrominoes respect the game boundaries.
- **Score assignment** – Points are awarded based on successful line clears.
- **Block rotation system** – Smooth and accurate rotation of tetrominoes.
- **User interface** – Implemented menus, score display, and game controls.
- **Line deletion mechanics** – Detecting and removing completed lines while adjusting remaining blocks.

{% include video id="ssAJCIUWsxs&t" provider="youtube" %}
<iframe src="https://www.youtube.com/watch?v=ssAJCIUWsxs&t" allow="autoplay;"></iframe>

**Credits:**

Tomas Bravo \
Jesús Gómez 