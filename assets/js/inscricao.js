/* Chama Acesa 2a edicao: lote atual, reserva de vaga (24h) e pagamento Pix/cartao.
   Usado por index.html (lotes publicos) e lote0.html (lote do grupo).
   Requer qrcodejs (window.QRCode) e tracking.js (window.track). */
(function () {
  const CFG = {
    supabaseUrl: 'https://gbbjpltqmbhlfluqhrmg.supabase.co',
    supabaseKey: 'sb_publishable_a_t-5SMQWML0AQ8muZv6Qg_jYYEIFeP',
    pixChave: '04002546000132',          // CNPJ Bioflora (mesma chave da 1a edicao)
    pixNome: 'FARMACIA BIOFLORA',        // ate 25 caracteres, sem acento
    pixCidade: 'ITAJUBA',
    whatsapp: '5535984493997',
    storageKey: 'chama2_reserva',
  };
  const t = (n, p) => (window.track ? window.track(n, p) : null);
  const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

  async function rpc(fn, body) {
    const r = await fetch(CFG.supabaseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(txt);
    const j = JSON.parse(txt);
    return Array.isArray(j) ? j[0] : j;
  }

  /* ---------- Pix "copia e cola" estatico (padrao EMV do Banco Central) ---------- */
  const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
  function crc16(s) {
    let c = 0xffff;
    for (let i = 0; i < s.length; i++) {
      c ^= s.charCodeAt(i) << 8;
      for (let k = 0; k < 8; k++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1;
    }
    return (c & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  }
  function pixPayload(valor, txid) {
    const p = f('00', '01') + f('26', f('00', 'br.gov.bcb.pix') + f('01', CFG.pixChave)) +
      f('52', '0000') + f('53', '986') + f('54', Number(valor).toFixed(2)) + f('58', 'BR') +
      f('59', CFG.pixNome) + f('60', CFG.pixCidade) + f('62', f('05', txid.replace(/[^A-Za-z0-9]/g, ''))) + '6304';
    return p + crc16(p);
  }

  /* ---------- Validacao e mascaras ---------- */
  function cpfValido(cpf) {
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    for (const n of [9, 10]) {
      let s = 0;
      for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i);
      if (((s * 10) % 11) % 10 !== +d[n]) return false;
    }
    return true;
  }
  function mask(el, fmt) {
    el.addEventListener('input', () => {
      const d = el.value.replace(/\D/g, '').slice(0, fmt === 'cpf' ? 11 : 11);
      el.value = fmt === 'cpf'
        ? d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        : d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    });
  }

  /* ---------- Lote atual ---------- */
  function renderLote(l) {
    const set = (sel, v) => document.querySelectorAll(sel).forEach((e) => (e.textContent = v));
    if (!l || !l.lote_id) {
      document.documentElement.classList.add('esgotado');
      set('[data-lote-nome]', 'Esgotado');
      set('[data-lote-restantes]', '0');
      return;
    }
    const pct = Math.round(100 * (l.vagas - l.restantes) / l.vagas);
    set('[data-lote-nome]', l.nome);
    set('[data-lote-preco]', brl(l.preco));
    set('[data-lote-restantes]', l.restantes);
    set('[data-lote-vagas]', l.vagas);
    document.querySelectorAll('[data-lote-bar]').forEach((e) => (e.style.width = Math.max(pct, 4) + '%'));
    document.documentElement.classList.toggle('poucas-vagas', l.restantes <= 10);
  }
  async function carregarLote(lote) {
    try {
      const l = await rpc('chama_lote_atual', { p_lote: lote || null });
      renderLote(l);
      return l;
    } catch (e) {
      console.error(e);
    }
  }

  /* ---------- Tela de pagamento ---------- */
  function mostrarPagamento(box, r, nome) {
    const pix = pixPayload(r.valor, r.codigo);
    const expira = new Date(r.expira_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const primeiro = (nome || '').split(' ')[0];
    const wa = (msg) => 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(msg);
    const pago = r.status === 'pago';
    box.innerHTML = `
      <div class="pay">
        <p class="pay-eyebrow">${pago ? 'Inscrição confirmada' : 'Vaga reservada por 24 horas'}</p>
        <h2>${pago ? 'Tudo certo' : 'Falta só o pagamento'}${primeiro ? ', ' + primeiro : ''}!</h2>
        <div class="pay-code">Sua inscrição <strong>${r.codigo}</strong> · ${r.lote_nome}</div>
        ${pago ? '<p class="pay-note">Seu pagamento já foi confirmado. Nos vemos dia 25 de novembro!</p>' : `
        <div class="pay-valor">${brl(r.valor)}</div>
        <div class="pay-qr" id="payQr"></div>
        <p class="pay-label">Pix copia e cola</p>
        <div class="pay-copy"><input readonly value="${pix}" id="payPix"><button type="button" id="payCopy">Copiar</button></div>
        <ol class="pay-steps">
          <li>Abra o app do seu banco e pague com o QR Code ou o Pix copia e cola. O valor já vem preenchido.</li>
          <li>Envie o comprovante no WhatsApp. Pronto, sua vaga está garantida.</li>
        </ol>
        <a class="btn btn-primary pay-wa" id="payWa" target="_blank" rel="noopener" href="${wa('Oi! Paguei minha inscrição ' + r.codigo + ' do Chama Acesa (' + brl(r.valor) + '). Segue o comprovante:')}">Enviar comprovante no WhatsApp</a>
        <a class="pay-card" id="payCard" target="_blank" rel="noopener" href="${wa('Oi! Quero pagar minha inscrição ' + r.codigo + ' do Chama Acesa (' + brl(r.valor) + ') no cartão de crédito.')}">Prefiro pagar no cartão de crédito</a>
        <p class="pay-note">Reserva válida até ${expira}. Sem o pagamento nesse prazo, a vaga volta para o lote.</p>`}
      </div>`;
    if (pago) return;
    if (window.QRCode) new QRCode(document.getElementById('payQr'), { text: pix, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    document.getElementById('payCopy').onclick = async () => {
      const inp = document.getElementById('payPix');
      try { await navigator.clipboard.writeText(inp.value); } catch (e) { inp.select(); document.execCommand('copy'); }
      document.getElementById('payCopy').textContent = 'Copiado!';
      t('PixCopiado', { codigo: r.codigo });
    };
    document.getElementById('payWa').addEventListener('click', () => t('Contact', { content_name: 'comprovante', codigo: r.codigo }));
    document.getElementById('payCard').addEventListener('click', () => t('Contact', { content_name: 'cartao', codigo: r.codigo }));
  }

  /* ---------- Pagamento pela Pagar.me (Pix + cartao ate 3x) ---------- */
  // Devolve a URL do link de pagamento, ou null se a Pagar.me estiver desligada/fora (cai no Pix manual).
  async function linkPagarme(r, whatsapp) {
    try {
      const resp = await fetch(CFG.supabaseUrl + '/functions/v1/chama-checkout', {
        method: 'POST',
        headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: r.codigo, whatsapp }),
      });
      const j = await resp.json();
      return j.url || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  function mostrarCheckout(box, r, nome, url) {
    const expira = new Date(r.expira_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const primeiro = (nome || '').split(' ')[0];
    box.innerHTML = `
      <div class="pay">
        <p class="pay-eyebrow">Vaga reservada por 24 horas</p>
        <h2>Falta só o pagamento${primeiro ? ', ' + primeiro : ''}!</h2>
        <div class="pay-code">Sua inscrição <strong>${r.codigo}</strong> · ${r.lote_nome}</div>
        <div class="pay-valor">${brl(r.valor)}</div>
        <a class="btn btn-primary" id="payGo" href="${url}">Pagar agora</a>
        <p class="pay-metodos">Pix ou cartão de crédito em até ${Number(r.valor) >= 150 ? '3x' : Number(r.valor) >= 100 ? '2x' : '1x'} sem juros</p>
        <ol class="pay-steps">
          <li>Você vai para o ambiente seguro da Pagar.me (Stone).</li>
          <li>Assim que o pagamento é aprovado, sua vaga é confirmada e o convite chega no seu e-mail.</li>
        </ol>
        <a class="pay-card" id="payManual" href="#">Prefiro pagar com Pix direto para a Bioflora</a>
        <p class="pay-note">Reserva válida até ${expira}. Sem o pagamento nesse prazo, a vaga volta para o lote.</p>
      </div>`;
    document.getElementById('payGo').addEventListener('click', () => t('AddPaymentInfo', { content_name: r.lote_id, value: Number(r.valor), currency: 'BRL', codigo: r.codigo }));
    document.getElementById('payManual').onclick = (e) => { e.preventDefault(); mostrarPagamento(box, r, nome); };
  }
  async function abrirPagamento(box, r, nome, whatsapp) {
    if (r.status === 'pago') return mostrarPagamento(box, r, nome);
    const url = await linkPagarme(r, whatsapp);
    if (url) mostrarCheckout(box, r, nome, url);
    else mostrarPagamento(box, r, nome);
  }

  /* ---------- Formulario ---------- */
  function montarFormulario({ form, box, lote }) {
    const q = (id) => form.querySelector('#' + id);
    mask(q('cpf'), 'cpf');
    mask(q('whatsapp'), 'tel');
    const btn = form.querySelector('button[type="submit"]');
    const err = document.createElement('p');
    err.className = 'form-err';
    form.appendChild(err);
    const erro = (m) => { err.textContent = m; err.style.display = 'block'; };

    // quem ja reservou neste aparelho volta direto para o pagamento
    try {
      const salvo = JSON.parse(localStorage.getItem(CFG.storageKey) || 'null');
      if (salvo && (salvo.r.status === 'pago' || new Date(salvo.r.expira_em) > new Date())) abrirPagamento(box, salvo.r, salvo.nome, salvo.whatsapp);
    } catch (e) {}

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.style.display = 'none';
      const nome = q('nome').value.trim();
      const cpf = q('cpf').value.replace(/\D/g, '');
      const whatsapp = q('whatsapp').value.replace(/\D/g, '');
      if (nome.split(' ').filter(Boolean).length < 2) return erro('Digite seu nome completo.');
      if (!cpfValido(cpf)) return erro('Confira o CPF.');
      if (whatsapp.length < 10 || whatsapp.length > 11) return erro('Confira o WhatsApp com DDD.');
      if (!q('aceite').checked) return erro('Marque a autorização para continuar.');
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Reservando sua vaga...';
      try {
        const r = await rpc('chama_ingresso_reservar', {
          p_nome: nome, p_cpf: cpf, p_whatsapp: whatsapp, p_email: q('email').value.trim(), p_aceite: true, p_lote: lote || null,
        });
        try { localStorage.setItem(CFG.storageKey, JSON.stringify({ r, nome, whatsapp })); } catch (e2) {}
        t('InitiateCheckout', { content_name: r.lote_id, value: Number(r.valor), currency: 'BRL', codigo: r.codigo });
        btn.textContent = 'Preparando o pagamento...';
        await abrirPagamento(box, r, nome, whatsapp);
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        carregarLote(lote);
      } catch (e3) {
        console.error(e3);
        btn.disabled = false;
        btn.textContent = label;
        if (String(e3.message).includes('esgotado')) { carregarLote(lote); return erro('As vagas deste lote acabaram de esgotar.'); }
        erro('Não conseguimos reservar agora. Confira os dados e tente de novo.');
      }
    });
  }

  window.ChamaInscricao = { carregarLote, montarFormulario, pixPayload, cpfValido };
})();
