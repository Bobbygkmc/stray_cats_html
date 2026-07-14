# Stray Cats Locator

A GitHub Pages-friendly prototype for a community cat map.

Goal: let neighbors report missing, found, stray, or sighted cats, tag each report, and view everything on an interactive map.

## Current MVP

- Static HTML/CSS/JavaScript app
- Leaflet + OpenStreetMap map
- Local browser storage for reports
- Missing/found/stray/sighted statuses
- Tags for urgent, injured, friendly, feral, kitten, collar, food needs, and microchip unknown
- Search/filter by text, status, and tag
- Click map to copy approximate coordinates into the report form
- Safety copy reminding users not to publish exact private addresses or chase/trap cats unsafely

## Run locally

```bash
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/
```

## Test

```bash
npm test
```

The tests use Node's built-in test runner and validate the report creation/filtering logic in `app.js`.

## Future upgrades

- Backend database with moderation queue
- Image uploads
- Public share pages for individual cat reports
- Alert radius / neighborhood notifications
- Printable missing-cat flyer generator
- Rescue/shelter/admin dashboard
