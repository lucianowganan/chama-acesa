// Rastreamento Chama Acesa (Meta Pixel + GA4). Preencha os IDs; vazio = nao carrega nada.
(function () {
  var META_PIXEL_ID = '314834854408031';   // ex: '1234567890123456' (Gerenciador de Eventos > Fontes de dados)
  var GA4_ID = 'G-EWL438EXY0';          // ex: 'G-XXXXXXXXXX' (Google Analytics > Fluxos de dados)

  // Eventos padrao do Meta; o resto vai como customizado.
  var STANDARD = { PageView: 1, ViewContent: 1, Lead: 1, CompleteRegistration: 1, Contact: 1 };

  if (META_PIXEL_ID) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
  }
  if (GA4_ID) {
    var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    // Mesma propriedade do site da Farmácia: content_group separa o Chama Acesa nos relatórios.
    gtag('config', GA4_ID, { content_group: 'chama-acesa' });
  }

  window.track = function (name, params) {
    params = params || {};
    if (window.fbq) fbq(STANDARD[name] ? 'track' : 'trackCustom', name, params);
    if (window.gtag) gtag('event', name, Object.assign({ projeto: 'chama-acesa' }, params));
  };
})();
