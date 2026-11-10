// Exercicios Extras (listas criadas pelo professor).
// Usa as classes de estilo e as funcoes globais de exercises.js (goHome, openUnit).
(function () {
  var X = { lista: null, exs: [], res: {}, idx: 0, sel: null, respondeu: false, audioLiberado: false };
  var REC = null;   // gravacao em andamento / pronta para enviar
  var MAX_SEG = 60;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function token() {
    var c = window.__sbClient;
    if (!c) return Promise.resolve(null);
    return c.auth.getSession().then(function (r) {
      return r && r.data && r.data.session ? r.data.session.access_token : null;
    });
  }

  function api(url, body) {
    return token().then(function (t) {
      if (!t) return { ok: false, d: {} };
      var opts = { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t } };
      if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); }
      return fetch(url, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
      });
    }).catch(function () { return { ok: false, d: {} }; });
  }

  function progresso(l) {
    if (!l.respondidas) return 'Nao iniciado';
    var t = 'Respondidas: ' + l.respondidas + '/' + l.total + ' - Acertos: ' + l.acertos;
    if (l.pendentes) t += ' - ' + l.pendentes + ' aguardando correcao';
    return t;
  }

  function cartoes(ls) {
    var h = '<div class="units-grid">';
    ls.forEach(function (l) {
      h += '<div class="unit-card" onclick="extrasAbrir(\'' + esc(l.id) + '\')">'
        + '<div class="unit-title">' + esc(l.titulo) + '</div>'
        + '<div class="unit-desc">' + l.total + (l.total === 1 ? ' exercicio' : ' exercicios') + '</div>'
        + '<div class="unit-badge">' + esc(progresso(l)) + '</div></div>';
    });
    return h + '</div>';
  }

  // Tela inicial: listas que NAO estao atreladas a uma unidade
  window.renderExtrasHome = function () {
    var el = document.getElementById('extrasHome');
    if (!el) return;
    api('/api/extras/aluno').then(function (r) {
      var ls = ((r.d && r.d.listas) || []).filter(function (l) { return l.unidade == null; });
      if (!document.getElementById('extrasHome')) return;
      el.innerHTML = ls.length
        ? '<div class="vocab-section" style="margin-top:26px"><h3>Exercicios do Professor</h3>' + cartoes(ls) + '</div>'
        : '';
    });
  };

  // Dentro da unidade: secao "Exercicios Extras"
  window.renderExtrasUnit = function (n) {
    var el = document.getElementById('extrasUnit');
    if (!el) return;
    api('/api/extras/aluno').then(function (r) {
      var ls = ((r.d && r.d.listas) || []).filter(function (l) { return l.unidade === n; });
      var alvo = document.getElementById('extrasUnit');
      if (!alvo || !ls.length) return;
      alvo.innerHTML = '<div class="vocab-section"><h3>Exercicios Extras</h3>' + cartoes(ls) + '</div>';
    });
  };

  window.extrasAbrir = function (id) {
    api('/api/extras/aluno?listaId=' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) { alert((r.d && r.d.error) || 'Nao foi possivel abrir a lista.'); return; }
      X.lista = r.d.lista; X.exs = r.d.exercicios || []; X.res = r.d.resultados || {}; X.audioLiberado = r.d.audioLiberado === true;
      X.idx = 0;
      for (var i = 0; i < X.exs.length; i++) { if (!X.res[X.exs[i].id]) { X.idx = i; break; } X.idx = X.exs.length; }
      X.sel = null; X.respondeu = false;
      var home = document.getElementById('homeScreen');
      if (home) home.classList.remove('active');
      var back = document.getElementById('backBtn');
      if (back) back.style.display = 'block';
      desenhar();
    });
  };

  function topo() {
    var L = X.lista, total = X.exs.length, pct = Math.round(Math.min(X.idx, total) / total * 100);
    return '<div class="unit-hdr"><h2>' + esc(L.titulo) + '</h2><p>'
      + (L.unidade ? 'Exercicios Extras - Unidade ' + L.unidade : 'Exercicios do Professor') + '</p></div>'
      + '<div class="prog-wrap"><div class="prog-bar" style="width:' + pct + '%"></div></div>';
  }

  function desenhar() {
    var cont = document.getElementById('unitContainer');
    if (!cont) return;
    var total = X.exs.length;
    if (!total) { cont.innerHTML = '<div class="screen active">' + topo() + '<p>Esta lista ainda nao tem exercicios.</p></div>'; return; }
    if (X.idx >= total) { resumo(cont); return; }

    var ex = X.exs[X.idx];
    var tags = { mc: ['tag-mc', 'Multipla Escolha'], fill: ['tag-fill', 'Preencha a Lacuna'], translate: ['tag-translate', 'Traducao PT-EN'], livre: ['tag-translate', 'Resposta Livre'], audio: ['tag-translate', 'Resposta em Audio'] };
    var t = tags[ex.tipo] || tags.livre;
    var h = '<div class="screen active">' + topo() + '<div class="prog-label">Exercicio ' + (X.idx + 1) + ' de ' + total + '</div>'
      + '<div class="ex-card" id="xCard"><span class="ex-type-tag ' + t[0] + '">' + t[1] + '</span>'
      + '<div class="ex-question">' + esc(ex.enunciado).replace(/\n/g, '<br>') + '</div>';
    if (ex.tipo === 'mc') {
      h += '<div class="opts-grid">';
      (ex.opcoes || []).forEach(function (o, i) {
        h += '<button class="opt-btn" id="xopt' + i + '" onclick="extrasPick(' + i + ')">' + esc(o) + '</button>';
      });
      h += '</div>';
    } else if (ex.tipo === 'audio') {
      h += audioHtml();
    } else if (ex.tipo === 'livre') {
      h += '<textarea class="fill-input" id="xInp" rows="5" maxlength="2000" placeholder="Escreva a sua resposta..." style="resize:vertical"></textarea>';
    } else {
      h += '<input class="fill-input" id="xInp" type="text" maxlength="300" placeholder="'
        + (ex.tipo === 'translate' ? 'Digite a traducao em ingles...' : 'Digite sua resposta...')
        + '" onkeyup="if(event.keyCode===13)extrasVerificar()">';
    }
    h += '<div class="btn-row"><button class="check-btn" id="xCheck" onclick="extrasVerificar()">'
      + (ex.tipo === 'audio' ? 'Enviar audio' : ex.tipo === 'livre' ? 'Enviar resposta' : 'Verificar') + '</button>'
      + '<button class="next-btn" id="xNext" onclick="extrasProxima()">Proxima</button></div>'
      + '<div class="feedback" id="xFb"></div></div></div>';
    pararGravacao(true);
    cont.innerHTML = h;
    X.sel = null; X.respondeu = false;
    if (ex.tipo === 'audio') { var cb = document.getElementById('xCheck'); if (cb) cb.disabled = true; }
  }

  window.extrasPick = function (i) {
    if (X.respondeu) return;
    X.sel = i;
    var bs = document.querySelectorAll('#xCard .opt-btn');
    for (var j = 0; j < bs.length; j++) bs[j].classList.toggle('selected', j === i);
  };

  function fb(cls, texto) {
    var f = document.getElementById('xFb');
    if (!f) return;
    f.className = 'feedback show ' + cls;
    f.textContent = texto;
  }

  window.extrasVerificar = function () {
    if (X.respondeu) return;
    var ex = X.exs[X.idx], resposta;
    if (ex.tipo === 'audio') { enviarAudio(ex); return; }
    if (ex.tipo === 'mc') {
      if (X.sel === null) { fb('err', 'Selecione uma opcao antes de verificar.'); return; }
      resposta = ex.opcoes[X.sel];
    } else {
      var inp = document.getElementById('xInp');
      resposta = inp ? inp.value.trim() : '';
      if (!resposta) { fb('err', 'Escreva uma resposta antes de enviar.'); return; }
    }
    var btn = document.getElementById('xCheck'); if (btn) btn.disabled = true;
    api('/api/extras/responder', { exercicioId: ex.id, resposta: resposta }).then(function (r) {
      if (!r.ok) { if (btn) btn.disabled = false; fb('err', (r.d && r.d.error) || 'Nao foi possivel enviar a resposta.'); return; }
      X.respondeu = true;
      var d = r.d;
      X.res[ex.id] = { resposta: resposta, respostaCerta: d.respostaCerta, correta: d.correta == null ? null : d.correta, status: d.status };
      var inp2 = document.getElementById('xInp'); if (inp2) inp2.disabled = true;
      if (ex.tipo === 'livre') {
        fb('ok', 'Resposta enviada! Seu professor vai corrigir e voce vera o retorno aqui.');
      } else {
        if (ex.tipo === 'mc') {
          var bs = document.querySelectorAll('#xCard .opt-btn');
          for (var j = 0; j < bs.length; j++) {
            bs[j].disabled = true;
            if (ex.opcoes[j] === d.respostaCerta) bs[j].classList.add('correct');
            else if (j === X.sel && !d.correta) bs[j].classList.add('wrong');
          }
        } else if (inp2) { inp2.classList.add(d.correta ? 'correct' : 'wrong'); }
        var f = document.getElementById('xFb');
        if (f) {
          if (d.correta) { f.className = 'feedback show ok'; f.textContent = 'Correto! Muito bem!'; }
          else { f.className = 'feedback show err'; f.innerHTML = 'Incorreto. Resposta correta: <strong>' + esc(d.respostaCerta) + '</strong>'; }
        }
      }
      var nb = document.getElementById('xNext'); if (nb) nb.classList.add('show');
    });
  };


  function audioHtml() {
    if (!X.audioLiberado) {
      return '<div class="feedback show err" style="margin-bottom:12px">A gravacao de voz ainda nao foi liberada para voce. Fale com o seu professor.</div>';
    }
    return '<div id="xAudio" style="margin-bottom:14px">'
      + '<div class="btn-row"><button class="check-btn" id="xRec" onclick="extrasGravar()">&#127908; Gravar</button>'
      + '<span id="xTimer" style="font-weight:700;color:#1565c0"></span></div>'
      + '<div id="xAudMsg" style="font-size:.85rem;color:#777;margin-top:8px">Voce pode gravar ate ' + MAX_SEG + ' segundos. Ouca antes de enviar.</div>'
      + '<div id="xPrev" style="display:none;margin-top:12px"><audio controls id="xPlayer" style="width:100%"></audio>'
      + '<div style="margin-top:8px"><button class="next-btn show" style="background:#ef6c00" onclick="extrasRegravar()">Regravar</button></div></div></div>';
  }

  function fmt(seg) { var m = Math.floor(seg / 60), s2 = seg % 60; return m + ':' + (s2 < 10 ? '0' : '') + s2; }

  function msgAudio(t, erro) {
    var m = document.getElementById('xAudMsg');
    if (m) { m.textContent = t; m.style.color = erro ? '#c62828' : '#777'; }
  }

  // Para a gravacao e libera o microfone. descartar=true apaga o que foi gravado.
  function pararGravacao(descartar) {
    if (!REC) return;
    try { if (REC.mr && REC.mr.state !== 'inactive') { REC.descartar = !!descartar; REC.mr.stop(); } } catch (e) { /* ok */ }
    try { if (REC.stream) REC.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ok */ }
    if (REC.timer) clearInterval(REC.timer);
    if (descartar) { if (REC.url) URL.revokeObjectURL(REC.url); REC = null; }
  }

  window.extrasGravar = function () {
    var btn = document.getElementById('xRec');
    if (REC && REC.mr && REC.mr.state === 'recording') { pararGravacao(false); return; }   // clique em "Parar"
    if (!navigator.mediaDevices || !window.MediaRecorder) { msgAudio('Seu navegador nao suporta gravacao de audio. Tente o Chrome, Edge, Firefox ou Safari atualizado.', true); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'], mime = '';
      for (var i = 0; i < tipos.length; i++) { if (MediaRecorder.isTypeSupported(tipos[i])) { mime = tipos[i]; break; } }
      var mr;
      try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }); }
      catch (e) { mr = new MediaRecorder(stream); }
      REC = { mr: mr, stream: stream, chunks: [], seg: 0, descartar: false, mime: mr.mimeType || mime || 'audio/webm' };
      mr.ondataavailable = function (e) { if (e.data && e.data.size) REC.chunks.push(e.data); };
      mr.onstop = function () {
        if (!REC || REC.descartar) return;
        var seg = Math.max(1, REC.seg);
        REC.blob = new Blob(REC.chunks, { type: REC.mime.split(';')[0] });
        REC.url = URL.createObjectURL(REC.blob);
        REC.duracao = seg;
        var pl = document.getElementById('xPlayer'); if (pl) pl.src = REC.url;
        var pv = document.getElementById('xPrev'); if (pv) pv.style.display = 'block';
        var rb = document.getElementById('xRec'); if (rb) { rb.innerHTML = '&#127908; Gravar'; rb.style.display = 'none'; }
        var tm = document.getElementById('xTimer'); if (tm) tm.textContent = 'Gravado: ' + fmt(seg);
        var ck = document.getElementById('xCheck'); if (ck) ck.disabled = false;
        msgAudio('Ouca a gravacao. Se estiver boa, clique em "Enviar audio".', false);
      };
      mr.start();
      if (btn) btn.innerHTML = '&#9209; Parar';
      msgAudio('Gravando... fale em ingles.', false);
      REC.timer = setInterval(function () {
        REC.seg++;
        var tm = document.getElementById('xTimer'); if (tm) tm.textContent = fmt(REC.seg) + ' / ' + fmt(MAX_SEG);
        if (REC.seg >= MAX_SEG) pararGravacao(false);
      }, 1000);
    }).catch(function () {
      msgAudio('Nao foi possivel usar o microfone. Permita o acesso ao microfone no navegador e tente de novo.', true);
    });
  };

  window.extrasRegravar = function () {
    pararGravacao(true);
    var pv = document.getElementById('xPrev'); if (pv) pv.style.display = 'none';
    var rb = document.getElementById('xRec'); if (rb) { rb.style.display = ''; rb.innerHTML = '&#127908; Gravar'; }
    var tm = document.getElementById('xTimer'); if (tm) tm.textContent = '';
    var ck = document.getElementById('xCheck'); if (ck) ck.disabled = true;
    msgAudio('Voce pode gravar ate ' + MAX_SEG + ' segundos. Ouca antes de enviar.', false);
  };

  function enviarAudio(ex) {
    if (!REC || !REC.blob) { fb('err', 'Grave a sua resposta antes de enviar.'); return; }
    var btn = document.getElementById('xCheck'); if (btn) btn.disabled = true;
    token().then(function (t) {
      if (!t) { fb('err', 'Sessao expirada. Entre novamente.'); return; }
      return fetch('/api/extras/audio?exercicioId=' + encodeURIComponent(ex.id) + '&duracao=' + REC.duracao, {
        method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': REC.blob.type || 'audio/webm' }, body: REC.blob
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) { if (btn) btn.disabled = false; fb('err', d.error || 'Nao foi possivel enviar o audio.'); return; }
          X.respondeu = true;
          X.res[ex.id] = { resposta: null, correta: null, status: 'pendente', audioUrl: null };
          var rg = document.querySelector('#xPrev .next-btn'); if (rg) rg.style.display = 'none';
          fb('ok', 'Audio enviado! Seu professor vai ouvir e corrigir, e voce vera o retorno aqui.');
          var nb = document.getElementById('xNext'); if (nb) nb.classList.add('show');
        });
      });
    }).catch(function () { if (btn) btn.disabled = false; fb('err', 'Falha de conexao ao enviar o audio.'); });
  }

  window.extrasProxima = function () { X.idx++; desenhar(); };

  window.extrasRefazer = function () { X.res = {}; X.idx = 0; desenhar(); };

  function resumo(cont) {
    var auto = 0, acertos = 0, pend = 0, retornos = '';
    X.exs.forEach(function (ex) {
      var r = X.res[ex.id]; if (!r) return;
      if (ex.tipo === 'livre' || ex.tipo === 'audio') {
        if (r.status === 'pendente') pend++;
        else {
          if (r.correta) acertos++;
          auto++;
        }
        var estado = r.status === 'pendente' ? 'Aguardando correcao do professor'
          : (r.avaliacao === 'adequada' ? 'Adequada' : 'Precisa melhorar');
        retornos += '<div class="ex-card" style="margin-bottom:12px"><span class="ex-type-tag tag-translate">' + (ex.tipo === 'audio' ? 'Resposta em Audio' : 'Resposta Livre') + '</span>'
          + '<div class="ex-question" style="font-size:.95rem">' + esc(ex.enunciado).replace(/\n/g, '<br>') + '</div>'
          + (ex.tipo === 'audio'
            ? (r.audioUrl ? '<audio controls preload="none" src="' + esc(r.audioUrl) + '" style="width:100%"></audio>' : '<div style="color:#888;font-size:.88rem">Gravacao de voz enviada</div>')
            : '<div style="background:#f5f8fc;border-radius:8px;padding:10px 12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.92rem">' + esc(r.resposta) + '</div>')
          + '<div style="margin-top:8px;font-weight:700;color:' + (r.status === 'pendente' ? '#777' : (r.avaliacao === 'adequada' ? '#2e7d32' : '#e65100')) + '">' + estado + '</div>'
          + (r.comentario ? '<div style="margin-top:6px;font-size:.9rem"><b>Comentario do professor:</b> ' + esc(r.comentario) + '</div>' : '')
          + '</div>';
      } else {
        auto++;
        if (r.correta) acertos++;
      }
    });
    var pct = auto ? Math.round(acertos / auto * 100) : 0;
    var h = '<div class="screen active">' + topo()
      + '<div class="score-card show"><div class="score-ring" style="background:linear-gradient(135deg,#0d2157,#42a5f5)">' + (auto ? pct + '%' : '-') + '</div>'
      + '<div class="score-msg">Lista concluida!</div>'
      + '<div class="score-sub">' + (auto ? 'Voce acertou ' + acertos + ' de ' + auto + ' questoes corrigidas.' : 'Suas respostas foram enviadas.')
      + (pend ? ' ' + pend + ' aguardando a correcao do professor.' : '') + '</div><br>'
      + '<button class="retry-btn" onclick="extrasRefazer()">Refazer a lista</button>'
      + (X.lista.unidade ? '<button class="home-btn2" onclick="openUnit(' + X.lista.unidade + ')">Voltar a Unidade</button>' : '')
      + '<button class="home-btn2" onclick="goHome()">Menu Principal</button></div>'
      + (retornos ? '<h3 style="margin:18px 0 10px;color:#0d2157">Suas respostas livres e em audio</h3>' + retornos : '')
      + '</div>';
    cont.innerHTML = h;
  }

  setTimeout(function () { if (window.renderExtrasHome) window.renderExtrasHome(); }, 400);
})();
