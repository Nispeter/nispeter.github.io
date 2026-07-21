# nispeter.github.io — Cosmic Observatory portfolio

Personal portfolio built with **Jekyll** and a small custom theme. The home page is an
interactive **3D "cosmic observatory"** (Three.js); each planet is a discipline:
**Gamedev**, **Web & Tools**, and **Computer Science**.

## Layout of the repo

| Path | What it is |
|---|---|
| `_portfolio/*.md` | **One file per project/work** — the content you edit most. |
| `_pages/section-*.md` | The three section (planet) landing pages. |
| `_pages/*.md` | About, all-projects, posts, 404. |
| `_layouts/`, `_includes/` | The custom theme (default, observatory, single, section, page…). |
| `assets/css/cosmic.css` | The single stylesheet (colors, layout, everything). |
| `assets/js/observatory.js` | The 3D home scene (Three.js is vendored in `assets/js/vendor/`). |
| `base_portfolio_template.md` | Copy this to add a new project. |

## Add a new project

1. Copy `base_portfolio_template.md` to `_portfolio/<slug>.md`
   (the slug becomes the URL: `/portfolio/<slug>/`).
2. Fill in `title`, `excerpt`, `sections` (any of `gamedev`, `web`, `cs`), and `year`.
3. Add photos (see below), or leave `teaser` blank for an automatic themed placeholder.
4. Write the body: description, buttons, tech stack, and `` `{% include gallery %}` `` if you added a gallery.

It then appears automatically on the right planet(s) and on `/portfolio/`, ordered by `year`.

> **Skills are automatic.** Add a `tech: [Unity, "C#", …]` list to the front matter — it
> renders as chips on the project page **and** feeds the Skills cloud on `/about/`
> automatically. That's the single source of truth; there is no separate skills list to keep
> in sync.

## Add photos

- Put images in **`assets/images/<slug>/`** (e.g. `assets/images/my-game/cover.png`).
- `header.teaser` → the card / cover image.
- `gallery:` → a list of `image_path` entries; renders a responsive grid with a lightbox.

## Change sections or order

- Edit `sections:` to move a project between planets (a project can live on several).
- Edit `year:` to reorder within a section (higher year = shown first).

## Translations (English / Spanish)

The site is written in English with a **language toggle** (the `ES`/`EN` button in the top
bar; the choice is remembered). To translate any piece of text, add a `data-es="…"`
attribute to its element — English stays as the element's normal content, Spanish lives in
`data-es`. Add `data-html` as well when the value contains markup. Central spots:

- **Nav labels** → `_data/navigation.yml` (`title_es`)
- **Section titles / blurbs** → `_pages/section-*.md` (`title_es`, `blurb_es`)
- **Achievements** → `_data/achievements.yml` (`title_es`, `detail_es`)
- **Page titles** → front-matter `title_es`
- **Anything else** → inline `data-es` on the element

Project titles and descriptions stay in English.

## Run locally

Requires Ruby. From the repo folder:

```bash
gem install bundler
bundle install
bundle add webrick        # needed on Ruby 3+
bundle exec jekyll serve --livereload
```

Then open <http://localhost:4000>.
