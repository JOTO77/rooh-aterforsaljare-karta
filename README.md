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

## Bädda in på rooh.se

Lägg ett **Rooh text**-block på sidan och klistra in följande i redigerarens källkodsläge:

```html
<iframe src="https://<github-pages-adress>/" title="Hitta återförsäljare" style="width:100%;height:700px;border:0" loading="lazy"></iframe>
```

Sidan fyller ut iframens höjd. I mobil visas kartan överst och listan under, och listan går att scrolla.

## Tekniskt

- Kartan använder Leaflet och OpenStreetMap. Det behövs ingen API-nyckel och kartan sätter inga cookies.
- Sökning på ort eller postnummer använder Nominatim (OpenStreetMap). Medan man skriver filtreras listan på namn, ort och postnummer.
- Vägbeskrivningen öppnas i Google Maps.
