// Bygger site/aterforsaljare.json från data/aterforsaljare.csv.
// Saknade koordinater slås upp i OpenStreetMap (Nominatim) och sparas i data/geokod-cache.json,
// så varje adress slås bara upp en gång. Kör: node scripts/bygg.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(rot, 'data', 'aterforsaljare.csv');
const CACHE = join(rot, 'data', 'geokod-cache.json');
const UT = join(rot, 'site', 'aterforsaljare.json');

// --- CSV (semikolonseparerad, som Excel sparar på svenska) ---
function lasCsv(text) {
  text = text.replace(/^﻿/, '');
  const rader = [];
  let rad = [], falt = '', iCitat = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (iCitat) {
      if (c === '"' && text[i + 1] === '"') { falt += '"'; i++; }
      else if (c === '"') iCitat = false;
      else falt += c;
    } else if (c === '"') iCitat = true;
    else if (c === ';') { rad.push(falt); falt = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      rad.push(falt); falt = '';
      if (rad.some((f) => f.trim() !== '')) rader.push(rad);
      rad = [];
    } else falt += c;
  }
  rad.push(falt);
  if (rad.some((f) => f.trim() !== '')) rader.push(rad);
  const [huvud, ...data] = rader;
  const nycklar = huvud.map((h) => h.trim().toLowerCase());
  return data.map((r) => Object.fromEntries(nycklar.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const formateraPostnr = (p) => {
  const d = String(p).replace(/\D/g, '');
  return d.length === 5 ? `${d.slice(0, 3)} ${d.slice(3)}` : String(p).trim();
};
const tal = (s) => (s === '' || s == null ? NaN : Number(String(s).replace(',', '.')));

const sov = (ms) => new Promise((r) => setTimeout(r, ms));
async function geokoda(r) {
  const forsok = [
    { street: r.adress, postalcode: r.postnr.replace(' ', ''), city: r.ort },
    { street: r.adress, city: r.ort },
    { postalcode: r.postnr.replace(' ', ''), city: r.ort },
  ];
  for (const q of forsok) {
    if (Object.values(q).some((v) => !v)) continue;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v);
    url.searchParams.set('country', 'Sweden');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    await sov(1100); // Nominatim tillåter max 1 anrop/sekund
    const svar = await fetch(url, { headers: { 'User-Agent': 'rooh-aterforsaljare-build/1.0' } });
    if (!svar.ok) throw new Error(`Nominatim ${svar.status}`);
    const [traff] = await svar.json();
    if (traff) return { lat: +(+traff.lat).toFixed(6), lng: +(+traff.lon).toFixed(6), precision: q.street ? 'adress' : 'postnummer' };
  }
  return null;
}

const rader = lasCsv(readFileSync(CSV, 'utf8'));
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const ut = [];
const varningar = [];

for (const r of rader) {
  if (/^(nej|n|0|false)$/i.test(r.visa ?? '')) continue;
  if (!r.namn) continue;
  r.postnr = formateraPostnr(r.postnr);
  let lat = tal(r.lat), lng = tal(r.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    const nyckel = `${r.adress}|${r.postnr}|${r.ort}`.toLowerCase();
    if (!(nyckel in cache)) {
      process.stdout.write(`Slår upp ${r.namn} … `);
      cache[nyckel] = await geokoda(r);
      console.log(cache[nyckel] ? cache[nyckel].precision : 'HITTADES INTE');
    }
    const g = cache[nyckel];
    if (!g) { varningar.push(`${r.namn}: adressen hittades inte, fyll i lat/lng för hand`); continue; }
    if (g.precision !== 'adress') varningar.push(`${r.namn}: placerad på postnumret, inte gatuadressen`);
    ({ lat, lng } = g);
  }
  let hemsida = r.hemsida || null;
  if (hemsida && !/^https?:\/\//i.test(hemsida)) hemsida = `https://${hemsida}`;
  ut.push({ namn: r.namn, adress: r.adress, postnr: r.postnr, ort: r.ort, telefon: r.telefon || null, hemsida, lat, lng });
}

ut.sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));
writeFileSync(CACHE, JSON.stringify(cache, null, 1) + '\n');
writeFileSync(UT, JSON.stringify(ut, null, 1) + '\n');
console.log(`\n${ut.length} återförsäljare skrivna till site/aterforsaljare.json`);
if (varningar.length) console.log('\nAtt kontrollera:\n- ' + varningar.join('\n- '));
