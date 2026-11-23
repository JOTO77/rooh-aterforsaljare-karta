// Läggs på sidan som bäddar in kartan. Anpassar iframens höjd efter innehållet (främst i mobil).
// <iframe id="rooh-af" src="https://…/" title="Hitta återförsäljare" style="width:100%;height:640px;border:0" loading="lazy"></iframe>
// <script src="https://…/embed.js" async></script>
(function () {
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.typ !== 'rooh-af-hojd') return;
    var ramar = document.querySelectorAll('iframe');
    for (var i = 0; i < ramar.length; i++) {
      if (ramar[i].contentWindow === e.source) ramar[i].style.height = e.data.hojd + 'px';
    }
  });
})();
