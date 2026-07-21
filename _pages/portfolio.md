---
title: "All Projects"
permalink: /portfolio/
layout: page
body_class: theme-web
---
<p class="page__lead">Every project in one place. Or explore by world:
  <a href="{{ '/gamedev/' | relative_url }}">Gamedev</a> ·
  <a href="{{ '/web/' | relative_url }}">Web &amp; Tools</a> ·
  <a href="{{ '/cs/' | relative_url }}">Computer Science</a>.
</p>

<div class="card-grid">
  {% for item in site.portfolio %}{% include project-card.html item=item %}{% endfor %}
</div>
