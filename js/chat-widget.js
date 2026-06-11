/* Junoon Trip Guide — chat widget (plain JS, no dependencies).
   Conversation history lives only in memory; nothing is stored or logged.
   The API key never touches the client — all requests go to /api/chat. */

(function () {
  'use strict';

  var ENDPOINT = '/api/chat';
  var MAX_USER_MESSAGES = 20;   // session cap
  var MAX_CHARS = 1000;

  var APPLY_URL = 'https://tally.so/r/xXNDY9';
  var EMAIL = 'saad@junoonjourneys.com';

  var GREETING = "I'm the Junoon Trip Guide — an AI assistant for this expedition. Ask me about the route, what's included, who it's for, or how to apply.";
  var CAP_MESSAGE = "That's a lot of road covered. For the rest: apply at " + APPLY_URL + " or email " + EMAIL + ".";
  var FALLBACK_MESSAGE = "The guide is offline right now. Email " + EMAIL + " — replies resume late July — or apply at " + APPLY_URL + ".";

  var CHIPS = ['Is Pakistan safe?', "What's included?", 'How do I apply?'];

  // conversation history sent to the API: [{role, content}]
  var history = [];
  var userMessageCount = 0;
  var busy = false;
  var built = false;

  // ── DOM refs (assigned in build) ──
  var root, panel, log, input, sendBtn, chipsRow;

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // Escape HTML, then turn the apply URL and email into safe links.
  function renderText(text) {
    var safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Linkify URLs (http/https).
    safe = safe.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
    });
    // Linkify the support email.
    safe = safe.replace(new RegExp(EMAIL.replace(/[.]/g, '\\.'), 'g'),
      '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>');
    return safe;
  }

  function addMessage(role, text) {
    var m = el('div', 'jn-msg ' + (role === 'user' ? 'jn-msg-user' : 'jn-msg-bot'));
    if (role === 'user') {
      m.textContent = text;
    } else {
      m.innerHTML = renderText(text);
    }
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function showTyping() {
    var m = el('div', 'jn-msg jn-msg-bot');
    var t = el('span', 'jn-typing');
    t.innerHTML = '<span></span><span></span><span></span>';
    m.appendChild(t);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function setBusy(state) {
    busy = state;
    input.disabled = state;
    sendBtn.disabled = state;
  }

  function hideChips() {
    if (chipsRow) chipsRow.style.display = 'none';
  }

  function capReached() {
    addMessage('bot', CAP_MESSAGE);
    input.disabled = true;
    sendBtn.disabled = true;
    input.placeholder = 'Session ended — apply or email above.';
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);
    if (userMessageCount >= MAX_USER_MESSAGES) { capReached(); return; }

    hideChips();
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    userMessageCount++;
    input.value = '';
    input.style.height = 'auto';

    setBusy(true);
    var typing = showTyping();

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12) })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        setBusy(false);
        if (!data || data.error || !data.reply) {
          addMessage('bot', FALLBACK_MESSAGE);
          return;
        }
        addMessage('bot', data.reply);
        history.push({ role: 'assistant', content: data.reply });
        if (userMessageCount >= MAX_USER_MESSAGES) capReached();
        else input.focus();
      })
      .catch(function () {
        typing.remove();
        setBusy(false);
        addMessage('bot', FALLBACK_MESSAGE);
      });
  }

  function open() {
    if (!built) build();
    root.classList.add('open');
    if (log.childElementCount === 0) {
      addMessage('bot', GREETING);
    }
    setTimeout(function () { if (!input.disabled) input.focus(); }, 60);
  }

  function close() {
    root.classList.remove('open');
  }

  function build() {
    built = true;
    root = el('div', null, { id: 'jn-chat' });

    // Launcher
    var launch = el('button', null, { id: 'jn-chat-launch', 'aria-label': 'Open the Trip Guide' });
    launch.innerHTML = '<span class="jn-launch-dot"></span>Trip Guide';
    launch.addEventListener('click', open);

    // Panel
    panel = el('div', null, { id: 'jn-chat-panel', role: 'dialog', 'aria-label': 'Junoon Trip Guide' });

    var header = el('div', null, { id: 'jn-chat-header' });
    var titleWrap = el('div');
    titleWrap.innerHTML = '<span class="jn-h-title">Trip Guide</span><span class="jn-h-sub">AI assistant</span>';
    var closeBtn = el('button', null, { id: 'jn-chat-close', 'aria-label': 'Close' });
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', close);
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    log = el('div', null, { id: 'jn-chat-log' });

    chipsRow = el('div', null, { id: 'jn-chat-chips' });
    CHIPS.forEach(function (c) {
      var chip = el('button', 'jn-chip');
      chip.textContent = c;
      chip.addEventListener('click', function () { send(c); });
      chipsRow.appendChild(chip);
    });

    var inputRow = el('div', null, { id: 'jn-chat-input-row' });
    input = el('textarea', null, {
      id: 'jn-chat-input', rows: '1', maxlength: String(MAX_CHARS),
      placeholder: 'Ask about the expedition…'
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
    });
    sendBtn = el('button', null, { id: 'jn-chat-send', 'aria-label': 'Send' });
    sendBtn.innerHTML = '&rarr;';
    sendBtn.addEventListener('click', function () { send(input.value); });
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    var disclaimer = el('div', null, { id: 'jn-chat-disclaimer' });
    disclaimer.textContent = 'AI guide · not a booking system · verify details before you commit';

    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(chipsRow);
    panel.appendChild(inputRow);
    panel.appendChild(disclaimer);

    root.appendChild(launch);
    root.appendChild(panel);
    document.body.appendChild(root);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('open')) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
