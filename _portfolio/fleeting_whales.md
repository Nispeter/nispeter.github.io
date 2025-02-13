---
title: "Fleeting Whales"
excerpt: "Cultural RPG using LLMs for enchancing player experience."
header:
  image: /assets/images/fw_hub.png
  teaser: /assets/images/fleeting_front.png
sidebar:
  - title: "Role: Solo Dev"
    image: /assets/images/fw_hub.png
    image_alt: "logo"
  - text: "Genres: FPS, RPG "
  - text: "Year: 2023"
  - text: "Studio: Indie"
gallery:
  - url: /assets/images/fw_dynamic.png
    image_path: assets/images/fw_dynamic.png
    alt: "placeholder image 3"
  - url: /assets/images/fw_static.png
    image_path: assets/images/fw_static.png
    alt: "placeholder image 1"
  - url: /assets/images/fw_mm.png
    image_path: assets/images/fw_mm.png
    alt: "placeholder image 2"
---
[GitHub Repo](https://github.com/Nispeter/FloorClearer_v2){: .btn .btn--primary}
[Itch.io Demo](https://nisp.itch.io/fleeting-whales){: .btn .btn--primary}

## Game Description  
**Fleeting Whales** is an immersive RPG and exploration game where NPC interactions shape your experience. Dive into a world full of challenges and discover how different types of NPCs can influence your adventure.  

This game was developed as part of my cornerstone project and study at Universidad de Concepción, serving as a proof of concept for an alternative approach to traditional NPC interactions. While conventional NPC dialogue systems are typically constrained by pre-scripted dialogue trees, this project explores the integration of Natural Language Processing models to enable dynamic and context-aware conversations between players and NPCs. 

By integrating Retrieval-Augmented Generation and structured dialogue trees, the system allows NPCs to adapt their responses based on in-game situations and prior interactions. This approach enhances immersion and provides a more engaging and fluid narrative experience. Additionally, the project addresses the growing demand for innovation and efficiency in game development, especially considering the industry's current employment challenges.  

{% include gallery %}  

## Tech Stack  
- **Language:** C#  
- **Graphics & Audio Library:** Unity Engine  
- **Additional Dependencies:**  
  - `UnityOpenAI` – Simple package for using OpenAI API.
  - `GraphEditor` – Library for creating the dialogue tree editor tool. 
- **Visuals:** Low-poly aesthetic made with Blender  

## Features Developed  
I was responsible for implementing key systems, including:  
- **Advanced 3D movement system** – Smooth movement with multiple jumps, speeds, and directional evasion.  
- **NPCs interactions and reponses** - 4 Types of NPCs and their behaviour.
  - **Expository NPC**: Introduces the story and game objectives.  
  - **Static NPC**: Has a fixed set of dialogues with selectable responses.  
  - **Dynamic NPC**: Uses AI to respond adaptively and contextually.  
  - **Immersive Mode**: Activated via a red button in the text box, allowing voice input for 5 seconds.  
- **Time system** – Manages level-based time cycles.  
- **First-person combat system** – Includes shooting mechanics and elemental combination abilities.  
- **Enemy system** – Defines AI behavior, attack patterns, and an enemy creator system.  
- **Enemy Spawner and Scoring system** – Spawns enemies as a spender system and tracks and displays player scores.  
- **Scene management system** – Ensures seamless level transitions.  
- **Everything else** - Posprosessing, game saving, SFX, particles, etc.

## Cultural Context  
The world of **Fleeting Whales** is inspired by Mapuche culture, telling the story of a warrior after death. The NPCs reflect Mapuche history and traditions, enhancing narrative depth and player immersion.  

This culturally rich environment serves as a demonstration of NPCs designed with authentic elements to create meaningful player connections.  

itch.io password: whales

<iframe width="560" height="315" src="https://www.youtube.com/embed/mPapwbrV82I?si=959S_J3LIrhmZJsZ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


