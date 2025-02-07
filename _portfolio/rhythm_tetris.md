---
title: "Rhythm Tetris"
excerpt: "AAA"
header:
  image: /assets/images/tetris_front.png
  teaser: /assets/images/tetris_front.png
sidebar:
  - title: "2020"
    image: /assets/images/tetris_front.png
    image_alt: "logo"
    title: "Systems programmer, Design"
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

# Rhythm Tetris

## Game Description
**Rhythm Tetris** is a fresh take on the classic Tetris experience. While the core gameplay remains—aligning falling tetrominoes to clear lines and earn points—players must also synchronize their movements with the rhythm of the music. 

{% include gallery caption="This is a sample gallery to go along with this case study." %}

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


**Credits:**

Tomas Bravo \
Jesús Gómez 