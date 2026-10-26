# Versioner

## 0.2.0 – 2026-10-26
Förberedd för publicering på en riktig webbadress.

- Inga personliga uppgifter byggs längre in i appen. Fastigheter, dokumentlänkar, belopp och värderingar läses in från en startfil (säkerhetskopia) och sparas bara i webbläsaren.
- Ny startsida när appen är tom, med knapp för att läsa in startfilen.
- Ekonomisidan visar vilka fastigheter som räknas som privata och företag utifrån datan.
- Nytt projekt på en delägd fastighet får samma fördelning som fastighetens tidigare projekt.
- Automatisk publicering till GitHub Pages vid push till main.

## 0.1.0 – 2026-10-26
Första testversionen, byggd efter det godkända GUI-förslaget.

- Inloggning med e-post och lösenord (lokalt i webbläsaren).
- Översikt över alla fyra fastigheter med filter Alla, Privat och Företag.
- Fastighetssida med fakta, el per månad, kostnader per kategori, värde och lån samt underhållsplan.
- Dokumentarkiv: sök, filtrera på fastighet, kategori, år, ägare och källa. Uppladdning med automatisk tolkning av datum, leverantör och belopp ur filnamnet. Versioner per dokument. Öppna, skriv ut, ladda ned och ZIP av markerade.
- Ekonomi: kostnader per månad och kategori, tabell per fastighet, export till Excel (CSV).
- Lån och värde med räknesnurra för ränteändringar (30 % ränteavdrag för privata lån).
- Projekt och bygglov med budget mot utfall och delning mellan delägare.
- Materiallager per plats.
- Säkerhetskopia till ZIP och inläsning av den.
- Ringvägen 33 förifylld från Dropbox: 410 dokument som länkar, fastighetsfakta, elkostnader juni 2024 till oktober 2025, fakturor, renoveringsprojekt, underhåll och material.
- Installerbar som app (PWA) på dator och mobil.
