(function () {
  'use strict';

  var SVERIGE = [[55.2, 10.9], [69.1, 24.2]];
  var lista = document.querySelector('.af-lista');
  var status = document.querySelector('.af-status');
  var falt = document.getElementById('sok');
  var form = document.querySelector('.af-sok');

  var karta = L.map('karta', { scrollWheelZoom: false, zoomControl: true }).fitBounds(SVERIGE);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(karta);
  // Scrollzoom först när användaren klickat i kartan, så sidan går att scrolla förbi den
  karta.on('click', function () { karta.scrollWheelZoom.enable(); });
  karta.on('mouseout', function () { karta.scrollWheelZoom.disable(); });

  var kluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
  karta.addLayer(kluster);

  var alla = [];
  var aktiv = null;
  var duMarkor = null;
  var fran = null; // {lat,lng} att mäta avstånd från

  function pin(klass) {
    return L.divIcon({ className: 'af-pin ' + (klass || ''), html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -10] });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function vagbeskrivning(b) {
    var q = b.adress + ', ' + b.postnr + ' ' + b.ort;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q);
  }

  function lankar(b) {
    var h = '<div class="af-lankar">';
    h += '<a href="' + esc(vagbeskrivning(b)) + '" target="_blank" rel="noopener">Vägbeskrivning</a>';
    if (b.hemsida) h += '<a href="' + esc(b.hemsida) + '" target="_blank" rel="noopener">Hemsida</a>';
    if (b.telefon) h += '<a href="tel:' + esc(b.telefon.replace(/[^\d+]/g, '')) + '">' + esc(b.telefon) + '</a>';
    return h + '</div>';
  }

  function popup(b) {
    return '<h3>' + esc(b.namn) + '</h3><p>' + esc(b.adress) + '<br>' + esc(b.postnr + ' ' + b.ort) + '</p>' + lankar(b);
  }

  function km(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function formatKm(d) {
    return d < 10 ? d.toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' km';
  }

  function normalisera(s) {
    return String(s).toLowerCase().replace(/\s+/g, '');
  }

  function textMatch(q) {
    var n = normalisera(q);
    if (!n) return alla;
    return alla.filter(function (b) {
      return normalisera(b.namn + b.ort + b.postnr + b.adress).indexOf(n) !== -1;
    });
  }

  function valj(b, oppna) {
    if (aktiv) aktiv.markor.setIcon(pin());
    aktiv = b;
    b.markor.setIcon(pin('aktiv'));
    Array.prototype.forEach.call(lista.children, function (li) { li.classList.toggle('aktiv', li._b === b); });
    if (oppna) {
      kluster.zoomToShowLayer(b.markor, function () { b.markor.openPopup(); });
    }
  }

  function rita(poster) {
    lista.innerHTML = '';
    if (!poster.length) {
      lista.innerHTML = '<li class="af-tom">Ingen återförsäljare matchar sökningen.</li>';
      skickaHojd();
      return;
    }
    poster.forEach(function (b) {
      var li = document.createElement('li');
      li.className = 'af-post';
      li.tabIndex = 0;
      li._b = b;
      var avst = fran ? '<span class="af-avstand">' + formatKm(km(fran, b)) + '</span>' : '';
      li.innerHTML = '<h3><span>' + esc(b.namn) + '</span>' + avst + '</h3>' +
        '<p class="af-adress">' + esc(b.adress + ', ' + b.postnr + ' ' + b.ort) + '</p>' + lankar(b);
      li.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        valj(b, true);
        if (window.matchMedia('(max-width: 760px)').matches) {
          document.getElementById('karta').scrollIntoView({ behavior: 'smooth' });
        }
      });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter') valj(b, true); });
      lista.appendChild(li);
    });
    skickaHojd();
  }

  function sorteraFran(punkt, rubrik) {
    fran = punkt;
    var sorterade = alla.slice().sort(function (a, b) { return km(punkt, a) - km(punkt, b); });
    rita(sorterade);
    if (duMarkor) karta.removeLayer(duMarkor);
    duMarkor = L.marker([punkt.lat, punkt.lng], { icon: pin('af-du'), interactive: false, keyboard: false }).addTo(karta);
    // Zooma så att de tre närmaste syns
    var narmast = sorterade.slice(0, 3).map(function (b) { return [b.lat, b.lng]; });
    karta.fitBounds(L.latLngBounds(narmast.concat([[punkt.lat, punkt.lng]])), { padding: [40, 40], maxZoom: 13 });
    status.textContent = 'Närmast ' + rubrik + ' först.';
    lista.scrollTop = 0;
  }

  function aterstall() {
    fran = null;
    if (duMarkor) { karta.removeLayer(duMarkor); duMarkor = null; }
    status.textContent = alla.length + ' återförsäljare';
    rita(alla);
    karta.fitBounds(kluster.getBounds(), { padding: [20, 20] });
  }

  // Filtrera listan direkt medan man skriver
  falt.addEventListener('input', function () {
    var q = falt.value.trim();
    if (!q) { aterstall(); return; }
    fran = null;
    var traffar = textMatch(q);
    status.textContent = traffar.length ? traffar.length + ' träffar – tryck Sök för att se närmaste' : 'Tryck Sök för att hitta närmaste återförsäljare';
    rita(traffar);
  });

  // Sök: slå upp orten/postnumret och sortera på avstånd
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = falt.value.trim();
    if (!q) { aterstall(); return; }
    status.textContent = 'Söker …';
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=se&accept-language=sv&q=' + encodeURIComponent(q);
    fetch(url).then(function (r) { return r.ok ? r.json() : []; }).then(function (svar) {
      if (svar && svar[0]) {
        var namn = svar[0].name || q;
        sorteraFran({ lat: +svar[0].lat, lng: +svar[0].lon }, namn);
      } else {
        // Ingen plats hittades – visa textträffar istället
        var traffar = textMatch(q);
        status.textContent = traffar.length ? traffar.length + ' träffar' : 'Hittade inte "' + q + '". Prova en ort eller ett postnummer.';
        rita(traffar);
        if (traffar.length) karta.fitBounds(L.latLngBounds(traffar.map(function (b) { return [b.lat, b.lng]; })), { padding: [40, 40], maxZoom: 13 });
      }
    }).catch(function () {
      status.textContent = 'Sökningen misslyckades. Försök igen.';
    });
  });

  // Låt sidan som bäddar in oss anpassa iframens höjd (se embed.js)
  function skickaHojd() {
    if (window.parent === window) return;
    requestAnimationFrame(function () {
      window.parent.postMessage({ typ: 'rooh-af-hojd', hojd: document.documentElement.scrollHeight }, '*');
    });
  }
  window.addEventListener('resize', skickaHojd);

  fetch('aterforsaljare.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      alla = data;
      alla.forEach(function (b) {
        b.markor = L.marker([b.lat, b.lng], { icon: pin(), title: b.namn, alt: b.namn }).bindPopup(popup(b));
        b.markor.on('click', function () { valj(b, false); });
        kluster.addLayer(b.markor);
      });
      aterstall();
    })
    .catch(function () {
      status.textContent = 'Kunde inte läsa in återförsäljarna.';
    });
})();
