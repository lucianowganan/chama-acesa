// Ofertas Chama Acesa (palestras.html e ofertas.html).
// Catalogo vem da RPC publica chama_ofertas() (so produtos com oferta_ativa). Pedido fecha no WhatsApp.
(function () {
  var SB = 'https://gbbjpltqmbhlfluqhrmg.supabase.co', KEY = 'sb_publishable_a_t-5SMQWML0AQ8muZv6Qg_jYYEIFeP';
  var WHATS = '5535984493997';
  var TEMAS = { libido_hormonios: 'Libido e hormônios', pele_beleza: 'Pele e beleza', bem_estar: 'Bem-estar' };

  // numero da inscricao chega pelo link do WhatsApp (?c=CA-0012) e fica guardado
  var q = new URLSearchParams(location.search);
  var codigo = /^CA-\d{3,7}$/.test(q.get('c') || '') ? q.get('c') : null;
  try { if (codigo) localStorage.setItem('chama_ca', codigo); else codigo = localStorage.getItem('chama_ca'); } catch (e) {}

  var brl = function (n) { return 'R$ ' + Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var cache;
  function load() {
    cache = cache || fetch(SB + '/rest/v1/rpc/chama_ofertas', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var g = {};
        rows.forEach(function (p) {
          var k = p.nome; g[k] = g[k] || { nome: p.nome, tema: p.tema, desc: p.descricao_curta, itens: [] };
          g[k].itens.push(p);
        });
        return Object.values(g);
      });
    return cache;
  }

  function msg(prod, item) {
    var nome = prod.nome + (item.variante ? ' (' + item.variante + ')' : '');
    return 'Oi! Quero aproveitar a oferta do Chama Acesa: ' + nome + ' por ' + brl(item.preco_oferta) + '.' + (codigo ? ' Minha inscrição: ' + codigo + '.' : '');
  }

  function card(prod) {
    var it = prod.itens[0];
    var img = prod.itens.find(function (i) { return i.imagem_url; });
    var variants = prod.itens.length > 1 ? '<div class="of-var">' + prod.itens.map(function (i, k) {
      return '<button type="button" data-k="' + k + '" class="' + (k ? '' : 'on') + '">' + (i.cor_hex ? '<i style="background:' + esc(i.cor_hex) + '"></i>' : '') + esc(i.variante) + '</button>';
    }).join('') + '</div>' : '';
    return '<article class="of-card" data-nome="' + esc(prod.nome) + '">' +
      '<div class="of-img">' + (img ? '<img loading="lazy" src="' + esc(img.imagem_url) + '" alt="' + esc(prod.nome) + '">' : '<svg viewBox="395 285 240 270"><use href="#of-flame"/></svg>') + '</div>' +
      '<div class="of-body"><span class="of-tema">' + esc(TEMAS[prod.tema] || '') + '</span>' +
      '<h4>' + esc(prod.nome) + '</h4>' + (prod.desc ? '<p class="of-desc">' + esc(prod.desc) + '</p>' : '') + variants +
      '<div class="of-preco"><s>' + brl(it.preco_cheio) + '</s><b>' + brl(it.preco_oferta) + '</b></div>' +
      '<a class="of-btn" target="_blank" rel="noopener" href="#">Quero</a></div></article>';
  }

  function wire(el, prods) {
    el.querySelectorAll('.of-card').forEach(function (c) {
      var prod = prods.find(function (p) { return p.nome === c.dataset.nome; }); var k = 0;
      var set = function () {
        var it = prod.itens[k];
        c.querySelector('.of-preco').innerHTML = '<s>' + brl(it.preco_cheio) + '</s><b>' + brl(it.preco_oferta) + '</b>';
        if (it.imagem_url) { var im = c.querySelector('.of-img img'); if (im) im.src = it.imagem_url; }
        c.querySelector('.of-btn').href = 'https://wa.me/' + WHATS + '?text=' + encodeURIComponent(msg(prod, it));
      };
      c.querySelectorAll('.of-var button').forEach(function (b) {
        b.onclick = function () { k = +b.dataset.k; c.querySelectorAll('.of-var button').forEach(function (x) { x.classList.toggle('on', x === b); }); set(); };
      });
      c.querySelector('.of-btn').addEventListener('click', function () { if (window.track) track('Contact', { content_name: 'oferta', produto: prod.nome }); });
      set();
    });
  }

  /** Renderiza ofertas em `el`. temas: lista de temas para filtrar (vazio = todos). */
  window.renderOfertas = function (el, temas) {
    el.innerHTML = '<div class="of-loading">Carregando ofertas…</div>';
    return load().then(function (prods) {
      var list = prods.filter(function (p) { return !temas || !temas.length || temas.indexOf(p.tema) >= 0; });
      el.innerHTML = list.length ? list.map(card).join('') : '<div class="of-loading">Ofertas em breve.</div>';
      wire(el, list);
      return list.length;
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute"><symbol id="of-flame" viewBox="395 285 240 270"><path fill="currentColor" d="M457.02,546.87c-29.05-6.09-48.55-32.55-51.82-61.09-.71-6.19-.55-12.48-.04-18.68,1.85-22.51,12.16-41.7,26.06-59.11l18.67-23.38c19.66-24.61,30.67-50.17,30.54-82.45,7.56,14.58,10.76,30.45,11.6,46.71.66,12.83-1.55,24.82-7.1,36.39-4,8.01-8.63,15.33-14.1,22.47l-16.59,21.66c-5.82,7.59-10.75,15.36-14.74,24.06-15.04,32.84-1.14,64.64,17.51,93.41Z"/><path fill="currentColor" d="M497.79,546.68c-17.15-11.36-27.01-29.72-28.7-50.03-.84-10.04.15-19.28,5.08-28.29,3.85-7.53,8.62-14.3,13.78-21.1l17.43-23.03c16.71-23.42,27.38-46.61,27.56-75.48,9.04,16.85,12.93,35.36,11.19,54.16-1.01,10.83-5.04,20.29-10.29,29.58-9.16,15.05-21.08,27.66-29.75,42.95-7.98,14.04-11.82,29.39-10.75,45.6.52,8.72,2.12,16.59,4.45,25.64Z"/><path fill="currentColor" d="M538.78,546.83c-4.53-3.73-7.69-8.57-9.48-14.15-6.49-20.24,1.59-37.34,14.39-53.17l15.63-19.33c15.66-19.58,19.61-40.55,19.85-66.11,8.08,12.33,14.68,26.73,15.95,40.7,1.06,11.67-3.19,20.97-9.94,30.64-3.67,5.27-8.58,11.32-12.67,16.32l-13.13,17.55c-11.26,13.43-15.44,30.28-20.61,47.54Z"/></symbol></svg>');
  });
})();
