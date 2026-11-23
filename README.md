# ROOH – Hitta återförsäljare

En fristående karta med sökning över ROOH:s återförsäljare. Den bäddas in på rooh.se med en iframe och är inte kopplad till Litium.

## Uppdatera listan

1. Öppna `data/aterforsaljare.csv` i Excel. Filen är semikolonseparerad och UTF-8.
2. Ändra, lägg till eller dölj butiker. Om en butik har `nej` i kolumnen `visa` syns den inte på kartan.
3. Spara som CSV (semikolon) och pusha till `main`, eller redigera filen direkt på GitHub.
4. GitHub Actions slår upp koordinater för nya adresser och publicerar sidan på GitHub Pages.

| Kolumn | Används till |
|---|---|
| `visa` | Skriv `ja` eller `nej`. |
| `namn` | Namnet som visas, alltså det butiken själv använder. |
| `adress`, `postnr`, `ort` | Butikens besöksadress. |
| `telefon`, `hemsida` | Kan lämnas tomma. |
| `lat`, `lng` | Kan lämnas tomma. Fyll i dem för hand om adressen hamnar fel på kartan. |

## Bygga lokalt

```bash
node scripts/bygg.mjs     # CSV → site/aterforsaljare.json (slår upp nya adresser)
node scripts/server.mjs   # förhandsvisning på http://localhost:5179
```

## Köra som Docker-container

Webbappen finns som en färdig image som byggs och testas av GitHub Actions vid varje push:

```bash
docker run -d -p 8080:8080 --restart unless-stopped --name rooh-aterforsaljare ghcr.io/joto77/rooh-aterforsaljare-karta:latest
```

Du kan också bygga imagen själv från repot med `docker compose up -d --build`. Sidan svarar på http://localhost:8080 och har en hälsokontroll på `/halsa`.

Imagen innehåller nginx (som körs utan root) och den byggda sidan. Sidan får bara bäddas in på rooh.se och i Litiums förhandsvisning, vilket styrs av `frame-ancestors` i `docker/nginx.conf`. När listan ändras byggs en ny image. På servern hämtar du den med `docker pull` och startar om containern.

## Bädda in på rooh.se

Lägg ett **Rooh text**-block på sidan och klistra in följande i redigerarens källkodsläge ("Source"). Växla sedan tillbaka till vanligt läge innan du sparar, annars sparas inte ändringen.

```html
<style>.content:has(> .rooh-af){max-width:none!important;width:100%}.rooh-af{height:85vh!important;min-height:700px}</style><object class="rooh-af" type="text/html" data="https://joto77.github.io/rooh-aterforsaljare-karta/" title="Hitta återförsäljare" style="display:block;width:100%;height:700px;border:0"></object>
```

Varför `<object>` och inte `<iframe>`: Litiums CKEditor lägger automatiskt till `sandbox=""` på alla iframes, och det stänger av JavaScript så att kartan blir tom. `<object>` lämnas orört.

`<style>`-raden behövs för att "Rooh text"-blocket annars bara visar innehållet i en högerspalt som är 46 % bred på dator.

Sidan fyller ut sin höjd. I mobil visas kartan överst och listan under, och listan går att scrolla.

## Tekniskt

- Kartan använder Leaflet och OpenStreetMap. Det behövs ingen API-nyckel och kartan sätter inga cookies.
- Sökning på ort eller postnummer använder Nominatim (OpenStreetMap). Medan man skriver filtreras listan på namn, ort och postnummer.
- Vägbeskrivningen öppnas i Google Maps.
