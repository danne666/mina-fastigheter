# Mina fastigheter

Webbapp för Dans fyra fastigheter: dokument, löpande kostnader, förbrukning, lån, underhåll, projekt och bygglov.
Den kan installeras som app på dator och mobil (PWA).

## Köra lokalt

```bash
npm install
npm run dev      # utvecklingsserver på http://localhost:5173
npm run build    # bygger till dist/
```

## Teknik

- React 19, TypeScript och Vite.
- Data sparas i webbläsarens IndexedDB via Dexie (`src/db.ts`). Uppladdade filer sparas som blobbar i samma databas.
- Inloggningen är lokal (`src/lib/auth.ts`): en PBKDF2-hash av lösenordet sparas i webbläsaren.
- Startdata ligger i `src/seed/`. `rv33-dokument.json` är genererad ur Dropbox-mappen för Ringvägen 33 (bara namn, mapp och länk, inga filer).
- Hash-baserad routing så att appen fungerar på vilken statisk webbhost som helst.

## Data

Inga personliga uppgifter finns i koden. Första gången appen öppnas läser du in en startfil eller en säkerhetskopia (ZIP) under Kom igång. Allt sparas sedan i webbläsarens IndexedDB. Ta säkerhetskopior under Inställningar. Startfiler och säkerhetskopior ska aldrig läggas i repot (de är undantagna i `.gitignore`).

## Publicering

`.github/workflows/pages.yml` bygger och publicerar appen på GitHub Pages vid varje push till `main`. Slå på Pages under Settings → Pages → Source: GitHub Actions.

## Versionshantering

- Versionsnumret står i `package.json` och visas i appen. Ändringar beskrivs i `CHANGELOG.md`.
- Varje release får en git-tagg, t.ex. `v0.1.0`.

## Nästa steg

- Server med riktig inloggning och synk mellan enheter (förslag: Supabase med Postgres och fillagring).
- Direktkoppling till Dropbox så att nya filer i fastighetsmapparna dyker upp automatiskt.
- Påminnelser för bindningstider, besiktningar och avtal.
