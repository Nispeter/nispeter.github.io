---
permalink: /about/
title: "About"
---

<div class="about-header">
  <img class="about-photo" src="/assets/images/yo.jpeg" alt="Nicolás Parra">
  <div>
    <h2 class="about-name">Nicolás Parra</h2>
    <p class="about-role">Systems &amp; gameplay developer · MSc Computer Science</p>
  </div>
</div>

I'm a systems and gameplay game developer, passionate and highly motivated, with a Bachelor's in Engineering (Software Engineering) and a Master's in Computer Science. As a hobbyist, indie, and solo developer, I believe that games are works of art capable of crafting unforgettable experiences.

I have a strong interest in good coding practices and optimization, always striving to develop efficient and scalable systems. My focus lies in designing experiences, mechanics, and immersive ambiences that engage players deeply. I am particularly drawn to environmental storytelling and creating games that encourage players to think and explore.

**Favorite Games:** Outer Wilds, Civilization VI, Divinity original sin 2, Dark Souls, Monster Hunter, and Warframe.

## Achievements

<div class="awards">
  {%- for a in site.data.achievements -%}
  <div class="award"><span class="award__medal">{{ a.icon }}</span><div><b>{{ a.title }}</b><span>{{ a.detail }}</span></div></div>
  {%- endfor -%}
</div>

## Skills

<p class="skills-note">Pulled automatically from every project's tech stack — a living map of what I've actually shipped with.</p>

<div class="chips skills-cloud">
{%- assign tech_str = "" -%}
{%- for p in site.portfolio -%}{%- for t in p.tech -%}{%- assign tech_str = tech_str | append: t | append: "||" -%}{%- endfor -%}{%- endfor -%}
{%- assign tech_full = tech_str | split: "||" -%}
{%- assign tech_uniq = tech_full | uniq | sort_natural -%}
{%- for t in tech_uniq -%}{%- unless t == "" -%}<span class="chip">{{ t }}</span>{%- endunless -%}{%- endfor -%}
</div>

## Curriculum

<div class="cv">
  <div class="cv__tabs">
    <input type="radio" name="cv" id="cv-en" checked>
    <label for="cv-en">English</label>
    <input type="radio" name="cv" id="cv-es">
    <label for="cv-es">Español</label>

    <div class="cv__panel cv__panel--en">
      <iframe src="https://docs.google.com/document/d/e/2PACX-1vQh6DtrRrtHB31702Sd-ItwbeIFkLCK42J0tDHwRUUv_9-PfgcNvo2QT6yylUizad4zJPhzHET2nGe0/pub?embedded=true" title="CV — English" loading="lazy"></iframe>
      <p><a class="btn btn--primary" href="https://docs.google.com/document/d/e/2PACX-1vQh6DtrRrtHB31702Sd-ItwbeIFkLCK42J0tDHwRUUv_9-PfgcNvo2QT6yylUizad4zJPhzHET2nGe0/pub" target="_blank" rel="noopener">Open full CV (English) ↗</a></p>
    </div>

    <div class="cv__panel cv__panel--es">
      <iframe src="https://docs.google.com/document/d/e/2PACX-1vS2_igAUlqYozGRwNnq8mu5rx1pE34CV8eF51dco-8kVAMI0HbuLjKFy3iz4qCYWE0ZLnjdLw1_bNDB/pub?embedded=true" title="CV — Español" loading="lazy"></iframe>
      <p><a class="btn btn--primary" href="https://docs.google.com/document/d/e/2PACX-1vS2_igAUlqYozGRwNnq8mu5rx1pE34CV8eF51dco-8kVAMI0HbuLjKFy3iz4qCYWE0ZLnjdLw1_bNDB/pub" target="_blank" rel="noopener">Abrir CV completo (Español) ↗</a></p>
    </div>
  </div>
</div>
