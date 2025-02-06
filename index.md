---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
 layout: splash
 author_profile: false
 header:
  overlay_color: "#000"
  overlay_filter: "0.5"
  overlay_image: /assets/images/bio-photo.jpg
  actions:
    - label: "Download"
      url: "https://github.com/mmistakes/minimal-mistakes/"
  caption: "Photo credit: [**Unsplash**](https://unsplash.com)"
 excerpt: "Bacon ipsum dolor sit amet salami ham hock ham, hamburger corned beef short ribs kielbasa biltong t-bone drumstick tri-tip tail sirloin pork chop."
 intro: 
   - excerpt: 'Nullam suscipit et nam, tellus velit pellentesque at malesuada, enim eaque. Quis nulla, netus tempor in diam gravida tincidunt, *proin faucibus* voluptate felis id sollicitudin. Centered with `type="center"`'

 feature_row:
   - image_path: /assets/images/bio-photo.jpg
     alt: "placeholder image 1"
     title: "Placeholder 1"
     excerpt: "This is some sample content that goes here with **Markdown** formatting."
   - image_path: /assets/images/bio-photo.jpg
     image_caption: "Image courtesy of [Unsplash](https://unsplash.com/)"
     alt: "placeholder image 2"
     title: "Placeholder 2"
     excerpt: "This is some sample content that goes here with **Markdown** formatting."
     url: "#test-link"
     btn_label: "Read More"
     btn_class: "btn--primary"
   - image_path: /assets/images/bio-photo.jpg
     title: "Placeholder 3"
     excerpt: "This is some sample content that goes here with **Markdown** formatting."
 feature_row2:
   - image_path: /assets/images/bio-photo.jpg
     alt: "placeholder image 2"
     title: "Placeholder Image Left Aligned"
     excerpt: 'This is some sample content that goes here with **Markdown** formatting. Left aligned with `type="left"`'
     url: "#test-link"
     btn_label: "Read More"
     btn_class: "btn--primary"
 feature_row3:
   - image_path: /assets/images/bio-photo.jpg
     alt: "placeholder image 2"
     title: "Placeholder Image Right Aligned"
     excerpt: 'This is some sample content that goes here with **Markdown** formatting. Right aligned with `type="right"`'
     url: "#test-link"
     btn_label: "Read More"
     btn_class: "btn--primary"
 feature_row4:
   - image_path: /assets/images/bio-photo.jpg
     alt: "placeholder image 2"
     title: "Placeholder Image Center Aligned"
     excerpt: 'This is some sample content that goes here with **Markdown** formatting. Centered with `type="center"`'
     url: "#test-link"
     btn_label: "Read More"
     btn_class: "btn--primary"
   - image_path: /assets/images/bio-photo.jpg
     alt: "placeholder image 2"
     title: "Placeholder Image Center Aligned"
     excerpt: 'This is some sample content that goes here with **Markdown** formatting. Centered with `type="center"`'
     url: "#test-link"
     btn_label: "Read More"
     btn_class: "btn--primary"
   - image_path: /assets/images/bio-photo.jpg
     alt: "placeholder image 2"
     title: "Placeholder Image Center Aligned"
     excerpt: 'This is some sample content that goes here with **Markdown** formatting. Centered with `type="center"`'
     url: "#test-link"
     btn_label: "Read More"
     btn_class: "btn--primary"
     
 gallery2:
  - url: https://flic.kr/p/8a6Ven
    image_path: /assets/images/bio-photo.jpg
    alt: "Black and grays with a hint of green"
  - url: https://flic.kr/p/8a738X
    image_path: /assets/images/bio-photo.jpg
    alt: "Made for open text placement"
  - url: https://flic.kr/p/8a6VXP
    image_path: https://farm5.staticflickr.com/4046/4697502929_72c612c636_q.jpg
    alt: "Fog in the trees"

header:
  video:
    id: -PVofD2A9t8
    provider: youtube

     
 # You don't need to edit this file, it's empty on purpose.
 # Edit theme's home layout instead if you wanna make some changes
 # See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
 # layout: home
 # author_profile: false

---
{% include feature_row id="intro" type="center" %}

{% include feature_row %}

{% include gallery id="gallery2" caption="This is a second gallery example with images hosted externally." %}

{% include feature_row id="feature_row2" type="left" %}

{% include feature_row id="feature_row3" type="right" %}

{% include feature_row id="feature_row4" type="center" %}

{% include video id="-PVofD2A9t8" provider="youtube" %}
