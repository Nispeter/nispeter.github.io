---
title: "Posts"
permalink: /posts/
layout: page
---
<ul class="post-list">
  {% for post in site.posts %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <time>{{ post.date | date: "%b %Y" }}</time>
  </li>
  {% endfor %}
</ul>
