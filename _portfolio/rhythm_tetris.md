---
title: "Rhythm Tetris"
excerpt: "A fresh take on the classic Tetris experience."
header:
  teaser: /assets/images/tetris_front.png
sidebar:
  - title: "Role: Systems programmer, Design."
    image: /assets/images/tetris_front.png
    image_alt: "logo"
  - text: "Genres: Puzzle."
  - text: "Year: 2020."
  - text: "Studio: Caleuche Studios."
  - label: "GitHub"
    icon: "fab fa-fw fa-github"
    url: "https://github.com/Nispeter"
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
[Github Repo](#https://github.com/Nispeter/Rhythm_tetris){: .btn .btn--success}
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

<iframe width="560" height="315" src="https://www.youtube.com/embed/ssAJCIUWsxs?si=iWQgT9do4eURuu35" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

**Credits:**

Tomas Bravo \
Jesús Gómez 