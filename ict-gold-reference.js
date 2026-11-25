(function () {
  'use strict';
  const panel = document.getElementById('dc-gold-reference');
  if (!panel) return;

  const market = document.getElementById('dc-market');
  const symbol = document.getElementById('dc-symbol');
  const prices = panel.querySelector('[data-gold-prices]');
  const updated = panel.querySelector('time');
  const status = panel.querySelector('[role="status"]');
  const formatPrice = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const formatTime = new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  const maxAge = 30000;
  const refreshInterval = 16000;
  let session, refresh, expiry;

  function showStatus(message) {
    prices.hidden = true;
    if (status.textContent !== message) status.textContent = message;
  }

  function resetReading() {
    clearTimeout(expiry);
    updated.hidden = true;
    updated.removeAttribute('datetime');
  }

  function parseQuote(data) {
    const gold = Array.isArray(data?.metals) && data.metals.find(item => item?.symbol === 'XAU');
    const time = Date.parse(data?.updated);
    if (data?.source !== 'Standard Bullion' || data.unit !== 'USD per troy ounce' ||
        !Number.isFinite(gold?.bid) || gold.bid <= 0 || !Number.isFinite(gold?.ask) || gold.ask < gold.bid ||
        !Number.isFinite(time) || time > Date.now()) return null;
    return { bid: gold.bid, ask: gold.ask, time };
  }

  async function poll(signal) {
    try {
      const response = await fetch('https://standardbullion.com/spot-prices.json', {
        cache: 'no-store', credentials: 'omit',
        signal: AbortSignal.any([signal, AbortSignal.timeout(7000)])
      });
      if (!response.ok) throw new Error('Gold quote unavailable');
      const quote = parseQuote(await response.json());
      if (signal.aborted) return;

      resetReading();
      if (!quote) {
        showStatus('تعذّر التحقق من سعر الذهب المرجعي.');
        return;
      }
      updated.dateTime = new Date(quote.time).toISOString();
      updated.textContent = 'وقت القراءة: ' + formatTime.format(quote.time);
      updated.hidden = false;
      const remaining = quote.time + maxAge - Date.now();
      if (remaining <= 0) {
        showStatus('القراءة قديمة. السعر غير متاح حاليًا.');
        return;
      }

      prices.querySelector('[data-gold-bid]').textContent = formatPrice.format(quote.bid);
      prices.querySelector('[data-gold-ask]').textContent = formatPrice.format(quote.ask);
      prices.hidden = false;
      if (status.textContent) status.textContent = '';
      expiry = setTimeout(() => showStatus('القراءة قديمة. السعر غير متاح حاليًا.'), remaining);
    } catch {
      if (signal.aborted) return;
      resetReading();
      showStatus('تعذّر الاتصال بمصدر سعر الذهب المرجعي.');
    } finally {
      if (!signal.aborted) refresh = setTimeout(() => poll(signal), refreshInterval);
    }
  }

  function update() {
    session?.abort();
    clearTimeout(refresh);
    resetReading();
    panel.hidden = market.value !== 'metals' || symbol.value !== 'XAUUSD';
    showStatus(document.hidden || panel.hidden ? '' : 'جارٍ جلب سعر الذهب المرجعي…');
    if (panel.hidden || document.hidden) return;
    if (!navigator.onLine) {
      showStatus('الاتصال بالإنترنت غير متاح.');
      return;
    }
    session = new AbortController();
    poll(session.signal);
  }

  market.addEventListener('change', update);
  symbol.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
})();
