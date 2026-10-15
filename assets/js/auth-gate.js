// Login da equipe (Supabase Auth do Hub Bioflora) para as telas internas (check-in, pedidos).
// Inclua no <head>, DEPOIS do supabase-js e ANTES do script da pagina:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
//   <script src="assets/js/auth-gate.js"></script>
// Toda chamada da pagina para o Supabase espera o login e passa a usar o token da usuaria
// no lugar da chave publica — o codigo da pagina nao precisa mudar.
(function () {
  var URL_SB = 'https://gbbjpltqmbhlfluqhrmg.supabase.co';
  var KEY = 'sb_publishable_a_t-5SMQWML0AQ8muZv6Qg_jYYEIFeP';
  var sb = supabase.createClient(URL_SB, KEY);
  window.sbAuth = sb;

  var resolveReady; var ready = new Promise(function (r) { resolveReady = r; });
  var token = null;
  function setSession(s) { token = s && s.access_token; if (token) { resolveReady(); hideGate(); } }
  sb.auth.onAuthStateChange(function (_e, s) { setSession(s); });
  sb.auth.getSession().then(function (r) { if (r.data.session) setSession(r.data.session); else showGate(); });

  var nativeFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    if (url.indexOf(URL_SB + '/rest/') !== 0) return nativeFetch(input, init);
    await ready;
    init = Object.assign({}, init);
    var h = new Headers(init.headers || {});
    h.set('apikey', KEY); h.set('Authorization', 'Bearer ' + token);
    init.headers = h;
    return nativeFetch(input, init);
  };

  var gate;
  function showGate() {
    if (gate) return;
    gate = document.createElement('div');
    gate.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:#170504;font-family:system-ui,sans-serif';
    gate.innerHTML =
      '<form style="width:100%;max-width:340px;background:#260c0b;border:1px solid rgba(217,171,95,.35);border-radius:18px;padding:28px;text-align:center;color:#f7ece1">' +
      '<div style="font-size:1.3rem;margin-bottom:4px">🔥 Equipe Chama Acesa</div>' +
      '<div style="font-size:.85rem;opacity:.7;margin-bottom:18px">Entre com seu login do Hub Bioflora</div>' +
      '<input name="e" type="email" placeholder="E-mail" required autocomplete="username" style="width:100%;padding:13px;margin-bottom:10px;border-radius:10px;border:1px solid rgba(217,171,95,.4);background:rgba(0,0,0,.25);color:inherit;font-size:1rem">' +
      '<input name="p" type="password" placeholder="Senha" required autocomplete="current-password" style="width:100%;padding:13px;margin-bottom:14px;border-radius:10px;border:1px solid rgba(217,171,95,.4);background:rgba(0,0,0,.25);color:inherit;font-size:1rem">' +
      '<button style="width:100%;padding:14px;border:0;border-radius:10px;background:#e2561a;color:#fff;font-weight:600;font-size:1rem">Entrar</button>' +
      '<div class="err" style="color:#e05a4f;font-size:.82rem;margin-top:10px;min-height:1em"></div></form>';
    var mount = function () { document.body.appendChild(gate); };
    document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);
    gate.querySelector('form').onsubmit = async function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var r = await sb.auth.signInWithPassword({ email: f.e.value.trim(), password: f.p.value });
      if (r.error) f.querySelector('.err').textContent = 'E-mail ou senha incorretos.';
    };
  }
  function hideGate() { if (gate) { gate.remove(); gate = null; } }
})();
