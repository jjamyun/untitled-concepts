# Untitled Concepts

Mobile-first PWA for uncommon visual/cultural subjects.

## Supported target layouts
- iPhone 16 Pro portrait (~402 CSS px wide)
- iPad 9.7-inch portrait (768×1024 CSS px)
- iPad 9.7-inch landscape (1024×768 CSS px)
- Responsive browser widths down to 320px

## Local development
Use VS Code Live Server, or:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages
1. Push this folder to the repository root.
2. Settings → Pages → Deploy from a branch.
3. Choose `main` and `/ (root)`.
4. Open the Pages URL in Safari.
5. Share → Add to Home Screen.

## Data model
`topics.json` is the curated subject catalog. **Never change an existing topic `id`** if you want IndexedDB seen/saved history to remain attached to it. Adding new IDs automatically makes them eligible as unseen subjects.

## Local persistence
IndexedDB database: `field-note`.
- seen state persists locally
- saved state persists locally
- no backend/account required

## Release QA notes
- Single keyboard navigation controller
- Single touch swipe navigation controller
- Navigation locked through complete animation
- Responsive hero thumbnail requests: ~900px phone / ~1400px larger displays
- Natural-aspect hero images (no crop/letterbox)
- Secondary sheets constrained inside dynamic viewport
- Safe-area support for iOS
- Reduced-motion support
- Explicit service-worker cache invalidation
- PWA icons + Apple touch icon
- Noto Serif JP loaded for 無題 mark

Wikimedia media have individual licenses; retain displayed attribution/license information when distributing publicly.


## 1,000-topic catalog
This build contains 1,000 stable prompt records derived from 200 curated source subjects × five visual lenses (Form, Material, Detail, Context, System). Each lens has its own stable ID for Seen/Saved history while resolving details to the source Wikipedia article. This avoids fragile invented article URLs while creating a large concept-art exploration pool.


## Rabbit-hole expansion
Added 500 unique canonical subjects spanning Internet culture, lost media, obscure technologies, unusual places, cryptography, outsider art, visual perception, folklore, scientific curiosities, experimental communities, maps, interfaces, and conceptual rabbit holes. Catalog total: 924 canonical subjects.
