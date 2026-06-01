/* ============================================================
   SIMULADOR EDUCACIONAL DE TRANSPARÊNCIA ALGORÍTMICA
   script.js — Lógica da experiência

   ONDE PERSONALIZAR:
   - SIMBOLOS: linha ~20 — altere os emojis dos símbolos
   - DEMO_SCRIPT: linha ~35 — altere resultados, saldos e grids
   - goToStep(): controla a navegação entre etapas
   - SlotAnimator: classe reutilizável para a grade
   ============================================================ */

'use strict';

/* ============================================================
   SÍMBOLOS DO JOGO
   Para trocar os símbolos, edite este array.
   ============================================================ */
const SIMBOLOS = ['😃', '❤', '⭐', '🍀', '💰', '🌵'];

/* ============================================================
   ROTEIRO FIXO DA DEMONSTRAÇÃO
   Todos os resultados são pré-definidos aqui.
   Math.random() é usado APENAS para animar durante o giro,
   nunca para decidir o resultado final.
   ============================================================ */
const DEMO_SCRIPT = {
  initialBalance: 50,

  steps: {
    // Slide 1 — grade inicial (decorativa, antes de girar)
    entrada: {
      balance: 50,
      grid: [
        ['😃', '🍀', '💰'],
        ['⭐', '❤', '🌵'],
        ['💰', '😃', '⭐']
      ]
    },

    // Slide 2 — resultado decidido antes da animação
    // Dois tigres + uma moeda na linha central = derrota
    resultado_decidido: {
      cost: 5,
      payout: 0,
      balance: 45,
      finalGrid: [
        ['🍀', '⭐', '💰'],
        ['😃', '😃', '❤'],   // ← linha do meio: derrota (2 iguais + 1 diferente)
        ['🌵', '💰', '🍀']
      ]
    },

    // Slide 3 — near-miss fabricado
    // Dois tigres na linha central; o terceiro tigre aparece na linha de baixo (fora)
    near_miss: {
      cost: 5,
      payout: 0,
      balance: 40,
      finalGrid: [
        ['🍀', '💰', '⭐'],
        ['😃', '😃', '🍀'],   // ← linha do meio: quase!
        ['🌵', '🌵', '😃']    // ← tigre fabricado fora da linha vencedora
      ],
      // Células que formam o "quase ganhou" (linha central)
      nearCells: [3, 4, 5],
      // Célula do símbolo que deveria ter completado (posição 8 = canto inferior direito)
      missCells: [8]
    },

    // Slide 4 — vitória falsa (3 iguais, mas payout < aposta)
    vitoria_falsa: {
      cost: 5,
      payout: 3,
      balance: 43,
      finalGrid: [
        ['💰', '⭐', '🍀'],
        ['❤', '❤', '❤'],   // ← três iguais = "vitória"
        ['😃', '🌵', '💰']
      ],
      winCells: [3, 4, 5]
    },

    // Slide 5 — acumulado
    acumulado: {
      balance: 10,
      totalApostado: 40,
      totalRecebido: 31,
      diferenca: 9,
      rodadas: 8,
      finalGrid: [
        ['🌵', '🍀', '⭐'],
        ['💰', '😃', '❤'],
        ['⭐', '❤', '🍀']
      ]
    },

    // Slide 6 — encerramento
    encerramento: {
      balance: 0,
      rodadas: 10,
      nearMisses: 4,
      vitoriasFalsas: 2,
      totalApostado: 50,
      totalRecebido: 38,
      casaFicou: 12
    }
  }
};

/* ============================================================
   POPUPS EDUCACIONAIS
   Cada chave corresponde ao índice do slide (Reveal).
   Use `proximo` para encadear popups no mesmo slide.
   Use `onDismiss` para disparar uma ação ao fechar.
   ============================================================ */
const POPUP_DEFINITIONS = {

  /* ---- SLIDE 1: Entrada ---------------------------------------- */
  1: {
    titulo: 'Bem-vindo ao Simulador Educacional',
    corpo: `
    <p>Você vai participar de uma simulação educativa de jogo de aposta digital do tipo caça-níquel, com R$ 5,00 de saldo fictício (sem dinheiro real e sem cadastro).</p>
    <p>O objetivo é revelar, de forma simples, mecanismos que normalmente ficam pouco visíveis ao jogador durante a interação.</p>
    `,
    btnLabel: 'O que vou aprender? →',
    proximo: {
      titulo: 'O que vou aprender?',
      corpo: `
          <p>🔍 O resultado é definido <strong>antes</strong> da animação começar<br> ⚠️ O "quase ganho" pode ser <strong>programado</strong> pelo sistema<br> 🎭 Algumas "vitórias" podem representar <strong>perdas reais</strong><br> 📊 Pequenas perdas podem <strong>se acumular ao longo das rodadas</strong></p> <p>Você apostará <strong>R$ 5,00 fictícios por rodada</strong>. Acompanhe o painel à direita, ele mostra o que acontece por trás da interface.</p>
      `,
      btnLabel: '🎰 Entendi. Vou girar a roleta!'
    }
  },

  /* ---- SLIDE 2: Resultado decidido antes da animação ----------- */
  2: {
    titulo: '🖥️ O algoritmo já decidiu o resultado',
    corpo: `
      <p>Antes de qualquer animação, o sistema já definiu o resultado que será exibido.</p>
      <p>O resultado desta rodada será:<br>
      <strong style="font-size:1.4rem;letter-spacing:4px">😃 😃 ❤</strong><br>
      na linha central uma <strong style="color:#e74c3c">perda</strong>.</p>
      <p>Os símbolos vão girar por alguns segundos.
      Essa animação <strong>não altera o resultado</strong>, ele já foi definido.</p>
    `,
    btnLabel: 'Ver a animação →',
    onDismiss: () => executarGiro()
  },

  /* ---- SLIDE 3: Near-miss -------------------------------------- */
  3: {
      titulo: '⚠️ Próxima rodada: quase ganho (near-miss)',
    corpo: `
      <p>Nesta rodada, o sistema vai apresentar uma situação de
      <strong>"quase ganho"</strong> (<em>near-miss</em>).</p>
      <p>Dois símbolos iguais aparecerão na <strong>linha central</strong>.
      O terceiro ficará logo <strong>abaixo</strong> dela, criando a sensação de que a vitória esteve próxima.</p>
    `,
    btnLabel: 'Por que o algoritmo faz isso? →',
    proximo: {
     titulo: 'O quase ganho (near-miss) pode estimular novas tentativas',
    corpo: `
      <p>Esse símbolo pode ser posicionado para aparecer
      <strong>perto</strong> da linha central, sem formar uma combinação vencedora.</p>
      <p>Esse efeito cria a sensação de que a vitória esteve próxima.
      Mesmo sendo uma <strong>perda</strong>, o jogador pode sentir vontade de tentar de novo.</p>
      <p>Gire a roleta para ver essa situação na prática.</p>
    `,
      btnLabel: '🎰 Girar e ver o near-miss →',
      onDismiss: () => executarGiroNearMiss()
    }
  },

  /* ---- SLIDE 4: Vitória falsa ---------------------------------- */
  4: {
    titulo: '🎭 Atenção: uma vitória falsa está chegando',
    corpo: `
      <p>Na próxima rodada, <strong>três símbolos iguais</strong> vão aparecer
      na linha central.</p>
      <p>O jogo vai reagir com <strong>música e efeitos visuais</strong>,
      criando a sensação de vitória.</p>
      <p>Mas observe os valores:<br>
      Você vai apostar <strong>R$ 5,00 fictícios</strong> e receber de volta apenas <strong>R$ 3,00 fictícios</strong>.</p>
      <p>Apesar da comemoração, isso representa uma <strong style="color:#e74c3c">perda líquida de R$ 2,00 fictícios</strong>.</p>
    `,
    btnLabel: 'Por que comemorar uma perda? →',
    proximo: {
      titulo: 'Vitória falsa: quando a comemoração esconde uma perda',
      corpo: `
        <p>Quando o retorno é menor que o valor apostado, o resultado pode parecer uma vitória,
        mas representa uma <strong>perda líquida</strong>.</p>
        <p>Esse efeito é conhecido como <strong>vitória falsa</strong>.</p>
        <p>Agora gire a roleta e observe como a música e os efeitos visuais podem influenciar
        a percepção do resultado.</p>
      `,
      btnLabel: '🎰 Girar e ver a "vitória" →',
      onDismiss: () => executarGiroVitoria()
    }
  },

  /* ---- SLIDE 5: Acumulado -------------------------------------- */
  5: {
    titulo: '📊 Veja a perda acumulada até aqui',
    corpo: `
      <p>Após <strong>8 rodadas</strong>, os valores acumulados mostram:</p>
      <p>• Total apostado: <strong>R$ 40,00 fictícios</strong><br>
      • Total recebido: <strong>R$ 31,00 fictícios</strong><br>
      • Diferença retida pela plataforma: <strong style="color:#e74c3c">R$ 9,00 fictícios (22,5%)</strong></p>
      <p>O saldo começou em <strong>R$ 50,00 fictícios</strong>
      e agora está em <strong>R$ 10,00 fictícios</strong>.</p>
    `,
    btnLabel: 'O que significa isso? →',
    proximo: {
     titulo: 'A vantagem matemática aparece no longo prazo',
      corpo: `
        <p>O <strong>RTP (Return to Player)</strong> indica quanto o jogo devolve aos jogadores
        ao longo de muitas rodadas.</p>
        <p>A diferença entre o total apostado e o total devolvido representa a
        <strong>vantagem matemática da plataforma</strong>.</p>
        <p>Mesmo que uma rodada pareça positiva, a repetição das apostas pode gerar
        <strong>perdas acumuladas</strong>. Clique em <strong>Finalizar demonstração</strong>
        para ver o desfecho.</p>
      `,
      btnLabel: 'Entendido'
    }
  },

  /* ---- SLIDE 6: Encerramento ----------------------------------- */
  6: {
    titulo: '🔒 Saldo esgotado',
    corpo: `
      <p>Em <strong>10 rodadas</strong>, o saldo fictício chegou a
      <strong>R$ 0,00</strong>.</p>
      <p>A plataforma reteve <strong style="color:#e74c3c">R$ 12,00 fictícios — 24%</strong>
      do total apostado. Isso ocorreu após uma sequência com:</p>
      <p>• situações de quase ganho (<em>near-miss</em>)<br>
      • vitórias falsas<br>
      • resultados definidos antes da animação</p>
      <p><strong>O ponto principal:</strong> as perdas não aparecem de uma só vez.
      Elas podem se acumular ao longo das rodadas.</p>
    `,
    btnLabel: 'Ver a conclusão pedagógica →'
  }

};

/* ============================================================
   GERENCIADOR DE POPUPS
   PopupManager.mostrar(config) — exibe o popup com os dados
   PopupManager.fechar()        — fecha, dispara onDismiss e
                                  abre o próximo popup se houver

   Para encadear popups, use a propriedade `proximo`:
   {
     titulo: '...', corpo: '...', btnLabel: '...',
     proximo: {
       titulo: '...', corpo: '...', btnLabel: '...',
       proximo: { ... }   // encadeamento arbitrário
     }
   }
   ============================================================ */
const PopupManager = {
  _onDismiss: null,
  _proximo:   null,
  _DURACAO_SAIDA: 180, // ms — deve coincidir com popupSaida no CSS

  mostrar(config) {
    document.getElementById('popup-titulo').textContent = config.titulo;
    document.getElementById('popup-corpo').innerHTML   = config.corpo;
    document.getElementById('popup-btn').textContent   = config.btnLabel || 'OK';
    this._onDismiss = config.onDismiss || null;
    this._proximo   = config.proximo   || null;

    // Força replay da animação de entrada mesmo que o popup já esteja visível
    const container = document.querySelector('#global-popup .popup-container');
    container.style.animation = 'none';
    void container.offsetWidth; // reflow — necessário para o browser reconhecer a mudança
    container.style.animation = '';

    show('global-popup');
  },

  fechar() {
    const container = document.querySelector('#global-popup .popup-container');
    const proximo   = this._proximo;
    const onDismiss = this._onDismiss;
    this._proximo   = null;
    this._onDismiss = null;

    container.classList.add('saindo');

    setTimeout(() => {
      container.classList.remove('saindo');
      if (onDismiss) onDismiss();

      if (proximo) {
        this.mostrar(proximo); // popup permanece visível; só troca o conteúdo e replaya a entrada
      } else {
        hide('global-popup');
      }
    }, this._DURACAO_SAIDA);
  }
};

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let isAnimating = false;   // impede cliques duplos durante animação
let currentStep = 0;       // slide atual do Reveal.js

/* ============================================================
   CLASSE SlotAnimator
   Cada coluna é um "reel" independente com scroll vertical real.
   A fita de símbolos translada via CSS transform — o resultado
   final fica na parte inferior da fita e é revelado pela
   desaceleração da transição cubic-bezier.
   ============================================================ */
class SlotAnimator {
  constructor(container, symbols) {
    this.container = container;
    this.symbols   = symbols;
    this.cols      = [];                  // elementos reel-col
    this.strips    = [];                  // elementos reel-strip
    this.cells     = new Array(9).fill(null); // [row*3+col]
    this._buildGrid();
  }

  _buildGrid() {
    this.container.innerHTML = '';
    this.cols   = [];
    this.strips = [];
    this.cells  = new Array(9).fill(null);

    for (let col = 0; col < 3; col++) {
      const colEl  = document.createElement('div');
      colEl.className = 'reel-col';

      const strip  = document.createElement('div');
      strip.className = 'reel-strip';

      for (let row = 0; row < 3; row++) {
        const cell       = document.createElement('div');
        cell.className   = 'slot-cell';
        cell.textContent = this.symbols[(row * 3 + col) % this.symbols.length];
        strip.appendChild(cell);
        this.cells[row * 3 + col] = cell;
      }

      colEl.appendChild(strip);
      this.container.appendChild(colEl);
      this.cols.push(colEl);
      this.strips.push(strip);
    }

    // Fixa a altura das colunas após o layout do navegador
    requestAnimationFrame(() => this._fixarAlturas());
  }

  _fixarAlturas() {
    const strip = this.strips[0];
    if (!strip || strip.children.length < 3) return;
    const top = strip.children[0].getBoundingClientRect().top;
    const bot = strip.children[2].getBoundingClientRect().bottom;
    const h   = Math.round(bot - top);
    if (h > 0) this.cols.forEach(c => (c.style.height = h + 'px'));
  }

  renderGrid(grid) {
    for (let col = 0; col < 3; col++) {
      const strip = this.strips[col];
      // Garante que a fita tem exatamente 3 filhos (estado de repouso)
      while (strip.children.length < 3) strip.appendChild(document.createElement('div'));
      while (strip.children.length > 3) strip.removeChild(strip.lastChild);

      for (let row = 0; row < 3; row++) {
        const cell       = strip.children[row];
        cell.textContent = grid[row][col];
        cell.className   = 'slot-cell';
        this.cells[row * 3 + col] = cell;
      }
      strip.style.transition = 'none';
      strip.style.transform  = 'translateY(0)';
    }
  }

  /* Inicia todas as colunas juntas; para da esquerda para a direita */
  async spinTo(finalGrid, options = {}) {
    const baseDuration = options.duration || 1800;
    const stagger      = options.stagger  || 380;
    await Promise.all(
      [0, 1, 2].map(col =>
        this._spinCol(col, finalGrid, baseDuration + col * stagger)
      )
    );
  }

  async _spinCol(col, finalGrid, duration) {
    const strip  = this.strips[col];
    const EXTRAS = 22;   // símbolos aleatórios antes do resultado
    const EASE   = 'cubic-bezier(0.12, 0.82, 0.3, 1.0)'; // acelera rápido, desacelera suave
    const stride = this._getStride(col); // altura de 1 célula + gap

    // Monta a fita completa: aleatórios ↑ + 3 alvos no final
    strip.innerHTML = '';
    for (let i = 0; i < EXTRAS; i++) {
      const cell       = document.createElement('div');
      cell.className   = 'slot-cell';
      cell.textContent = this.symbols[Math.floor(Math.random() * this.symbols.length)];
      strip.appendChild(cell);
    }
    for (let row = 0; row < 3; row++) {
      const cell       = document.createElement('div');
      cell.className   = 'slot-cell';
      cell.textContent = finalGrid[row][col];
      strip.appendChild(cell);
      this.cells[row * 3 + col] = cell;
    }

    // Posição inicial: topo da fita, com motion-blur ativo
    strip.classList.add('girando');
    strip.style.transition = 'none';
    strip.style.transform  = 'translateY(0)';
    void strip.offsetWidth; // força reflow antes de iniciar a transição

    // Transição: rola até os alvos (translateY negativo = fita sobe = símbolos descem na tela)
    strip.style.transition = `transform ${duration}ms ${EASE}, filter 0.45s ease`;
    strip.style.transform  = `translateY(${-(EXTRAS * stride)}px)`;

    // Remove o blur ~600 ms antes do fim — os símbolos ficam nítidos na desaceleração
    setTimeout(() => strip.classList.remove('girando'), Math.max(100, duration - 600));

    await this._wait(duration);

    // Restaura a fita com apenas as 3 células finais (estado de repouso)
    strip.classList.remove('girando');
    strip.style.transition = 'none';
    strip.style.transform  = 'translateY(0)';
    strip.innerHTML = '';
    for (let row = 0; row < 3; row++) {
      const cell       = document.createElement('div');
      cell.className   = 'slot-cell';
      cell.textContent = finalGrid[row][col];
      strip.appendChild(cell);
      this.cells[row * 3 + col] = cell;
    }
  }

  /* Distância em px de uma célula para a próxima (altura + gap) */
  _getStride(col) {
    const strip = this.strips[col];
    if (!strip || strip.children.length < 2) return 88;
    const r0 = strip.children[0].getBoundingClientRect();
    const r1 = strip.children[1].getBoundingClientRect();
    const s  = r1.top - r0.top;
    return s > 4 ? s : 88;
  }

  highlightCells(indices, className) {
    indices.forEach(i => {
      if (this.cells[i]) this.cells[i].classList.add(className);
    });
  }

  clearHighlights() {
    this.cells.forEach(cell => {
      if (cell) cell.className = 'slot-cell';
    });
  }

  darken() {
    this.cells.forEach(cell => {
      if (cell) cell.className = 'slot-cell escurecido';
    });
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/* ============================================================
   INSTÂNCIAS DOS ANIMADORES
   Cada slide que usa a grade tem sua própria instância.
   ============================================================ */
let animators = {};

function initAnimators() {
  const ids = [
    's1-grid', 's2-grid', 's3-grid',
    's4-grid', 's5-grid', 's6-grid'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) animators[id] = new SlotAnimator(el, SIMBOLOS);
  });
}

/* ============================================================
   ATUALIZAÇÃO DE SALDO
   ============================================================ */
function setSaldo(elementId, valor, tipo = 'normal') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = `R$ ${valor},00`;
  el.className = 'saldo-valor';
  if (tipo === 'diminuindo') el.classList.add('diminuindo');
  if (tipo === 'ganhando')   el.classList.add('ganhando');
}

/* ============================================================
   DOTS DE PROGRESSO e BARRA NARRATIVA
   Os estados visuais são hardcoded no HTML de cada slide,
   pois cada slide tem sua posição fixa na sequência.
   As funções abaixo são mantidas como stubs para compatibilidade.
   ============================================================ */
function updateDots(slideIndex) { /* estado hardcoded no HTML */ }
function updateNarrativaBar(slideIndex) { /* estado hardcoded no HTML */ }

/* ============================================================
   TRANSIÇÃO ENTRE SLIDES
   fade-out (500ms) → tela preta (1000ms) → troca → fade-in (500ms)
   ============================================================ */
const FADE_MS  = 500;   // duração do fade
const PRETO_MS = 500;  // duração da tela preta

function _overlay() {
  return document.getElementById('transicao-overlay');
}

async function _fadeParaPreto() {
  const el = _overlay();
  el.style.pointerEvents = 'all';       // bloqueia cliques durante transição
  el.style.transition    = `opacity ${FADE_MS}ms ease`;
  el.style.opacity       = '1';
  await wait(FADE_MS + PRETO_MS);       // aguarda fade + pausa no preto
}

async function _fadeDePreto() {
  const el = _overlay();
  el.style.transition = `opacity ${FADE_MS}ms ease`;
  el.style.opacity    = '0';
  await wait(FADE_MS);
  el.style.pointerEvents = 'none';      // libera cliques após fade-in
}

/* ============================================================
   NAVEGAÇÃO PRINCIPAL
   _navToStep(n) — navega internamente (sem guard de animação)
   goToStep(n)   — chamado pelos botões (bloqueia durante animação)
   ============================================================ */
async function _navToStep(n) {
  currentStep = n;

  await _fadeParaPreto();               // fade-out + 1s preto

  Reveal.slide(n, 0, 0);               // troca de slide enquanto tela está preta
  updateDots(n);
  updateNarrativaBar(n);

  switch (n) {
    case 1: prepSlide1(); break;
    case 2: prepSlide2(); break;
    case 3: prepSlide3(); break;
    case 4: prepSlide4(); break;
    case 5: prepSlide5(); break;
    case 6: prepSlide6(); break;
    case 7: prepSlide7(); break;
  }

  await _fadeDePreto();                 // fade-in do novo slide

  if (POPUP_DEFINITIONS[n]) {          // popup aparece só após o fade-in
    PopupManager.mostrar(POPUP_DEFINITIONS[n]);
  }
}

function goToStep(n) {
  if (isAnimating) return;
  _navToStep(n); // async — fire and forget; overlay bloqueia novos cliques
}

/* ============================================================
   PREPARAÇÃO DE CADA SLIDE
   ============================================================ */

/* --- Slide 1: Entrada --- */
function prepSlide1() {
  const s = DEMO_SCRIPT.steps.entrada;
  if (animators['s1-grid']) {
    animators['s1-grid'].renderGrid(s.grid);
  }
  setSaldo('s1-saldo', s.balance);
  enableBtn('btn-girar');
}

/* --- Slide 2: Resultado decidido antes da animação --- */
function prepSlide2() {
  const s = DEMO_SCRIPT.steps.resultado_decidido;
  if (animators['s2-grid']) {
    // Exibe grade embaralhada (estado "antes do giro")
    animators['s2-grid'].renderGrid([
      ['🍀', '⭐', '💰'],
      ['🌵', '❤', '🍀'],
      ['⭐', '😃', '🌵']
    ]);
  }
  setSaldo('s2-saldo', DEMO_SCRIPT.steps.entrada.balance);

  // Mostra painel "algoritmo decide"
  show('s2-panel-antes');
  hide('s2-panel-depois');
  hide('s2-btn-continuar');
}

/* --- Slide 3: Near-miss fabricado --- */
function prepSlide3() {
  if (animators['s3-grid']) {
    // Grade neutra — resultado aparece só após o giro
    animators['s3-grid'].renderGrid([
      ['⭐', '❤', '🍀'],
      ['💰', '🌵', '⭐'],
      ['😃', '💰', '❤']
    ]);
  }
  // Saldo ao entrar nesta rodada (herda do resultado do slide 2)
  setSaldo('s3-saldo', DEMO_SCRIPT.steps.resultado_decidido.balance, 'diminuindo');
  // giro e destaques disparados por executarGiroNearMiss() via onDismiss do popup
}

/* --- Slide 4: Vitória falsa --- */
function prepSlide4() {
  if (animators['s4-grid']) {
    // Grade neutra — o resultado real aparece só após o giro
    animators['s4-grid'].renderGrid([
      ['💰', '🍀', '⭐'],
      ['🌵', '😃', '💰'],
      ['❤', '⭐', '🍀']
    ]);
  }
  hide('s4-vitoria-banner');
  document.getElementById('s4-vitoria-banner')?.classList.remove('ativo');
  hide('s4-confetes');
  // Saldo antes desta aposta (herda do slide 3)
  setSaldo('s4-saldo', DEMO_SCRIPT.steps.near_miss.balance, 'diminuindo');
  // giro, confetes e banner são disparados por executarGiroVitoria() via onDismiss
}

/* --- Slide 5: Acumulado em tempo real --- */
function prepSlide5() {
  const s = DEMO_SCRIPT.steps.acumulado;
  if (animators['s5-grid']) {
    animators['s5-grid'].renderGrid(s.finalGrid);
  }
  setSaldo('s5-saldo', s.balance, 'diminuindo');
}

/* --- Slide 6: Encerramento --- */
function prepSlide6() {
  if (animators['s6-grid']) {
    animators['s6-grid'].darken();
  }
  setSaldo('s6-saldo', 0, 'diminuindo');
}

/* --- Slide 7: Conclusão pedagógica --- */
function prepSlide7() {
  // Nada a preparar — conteúdo estático
}

/* ============================================================
   AÇÃO DO BOTÃO "GIRAR" (Slide 1)
   Navega para o slide 2 e exibe o popup que explica o resultado
   pré-definido. O giro em si é disparado pelo onDismiss do popup.
   ============================================================ */
function acaoGirar() {
  if (isAnimating) return;
  isAnimating = true;
  disableBtn('btn-girar');
  _navToStep(2);
}

/* Executado pelo onDismiss do popup do slide 2 */
async function executarGiro() {
  await wait(500); // garante que a transição do Reveal já concluiu
  const s = DEMO_SCRIPT.steps.resultado_decidido;
  if (animators['s2-grid']) {
    await animators['s2-grid'].spinTo(s.finalGrid, { duration: 1800 });
  }
  setSaldo('s2-saldo', s.balance, 'diminuindo');
  hide('s2-panel-antes');
  show('s2-panel-depois');
  show('s2-btn-continuar');
  isAnimating = false;
}

/* Executado pelo onDismiss do popup do slide 3 */
async function executarGiroNearMiss() {
  isAnimating = true;
  await wait(400);
  const s = DEMO_SCRIPT.steps.near_miss;
  if (animators['s3-grid']) {
    await animators['s3-grid'].spinTo(s.finalGrid, { duration: 1800 });
    await wait(350);
    animators['s3-grid'].highlightCells(s.nearCells, 'highlight-near');
    animators['s3-grid'].highlightCells(s.missCells, 'highlight-miss');
  }
  setSaldo('s3-saldo', s.balance, 'diminuindo');
  // Popup pós-giro: explica o que acabou de acontecer
  PopupManager.mostrar({
      titulo: '⚠️ Quase ganho (near-miss): observe na grade',
    corpo: `
      <p>Dois 😃 aparecem na linha central. O terceiro fica logo <strong>abaixo</strong>, destacado em vermelho.</p>
      <p>🟢 <strong>Linha central</strong> mostra os dois símbolos iguais<br>
      🔴 <strong>Símbolo fora da linha</strong> cria a sensação de que a vitória esteve próxima</p>
      <p>Leia o painel de transparência à direita para entender o mecanismo e clique em
      <strong>Continuar</strong> quando estiver pronto.</p>
    `,
    btnLabel: 'Ver grade',
    onDismiss: () => { isAnimating = false; }
  });
}

/* Gira a roleta do slide 4 e depois dispara a celebração */
async function executarGiroVitoria() {
  isAnimating = true;
  await wait(400);
  const s = DEMO_SCRIPT.steps.vitoria_falsa;
  if (animators['s4-grid']) {
    await animators['s4-grid'].spinTo(s.finalGrid, { duration: 1800 });
  }
  setSaldo('s4-saldo', s.balance, 'ganhando');
  await wait(250);
  executarConfetar();
  isAnimating = false;
}

/* Exibe banner e confetes após o giro do slide 4 */
function executarConfetar() {
  const s = DEMO_SCRIPT.steps.vitoria_falsa;
  show('s4-vitoria-banner');
  document.getElementById('s4-vitoria-banner')?.classList.add('ativo');
  animators['s4-grid']?.highlightCells(s.winCells, 'highlight-win');
  spawnConfetes('s4-confetes');
}

/* ============================================================
   CONFETES SIMPLES
   ============================================================ */
function spawnConfetes(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  el.classList.remove('oculto');   // garante que a classe oculto não sobrescreve
  el.style.display = 'block';

  const cores = ['#f39c12','#27ae60','#e74c3c','#3498db','#9b59b6','#1abc9c'];
  for (let i = 0; i < 24; i++) {
    const c = document.createElement('div');
    c.className = 'confete';
    c.style.left = Math.random() * 100 + '%';
    c.style.top  = '-10px';
    c.style.background = cores[Math.floor(Math.random() * cores.length)];
    c.style.animationDelay = Math.random() * 0.8 + 's';
    c.style.width  = (6 + Math.random() * 6) + 'px';
    c.style.height = (6 + Math.random() * 6) + 'px';
    el.appendChild(c);
  }
}

/* ============================================================
   DOWNLOAD DE ROTEIRO EM PDF
   Gera um arquivo com o conteúdo pedagógico para o professor
   ============================================================ */
function downloadPDF() {
  const roteiro = `
SIMULADOR EDUCACIONAL DE TRANSPARÊNCIA ALGORÍTMICA
Roteiro Pedagógico para o Professor

═══════════════════════════════════════════════════════════════

O QUE OS ESTUDANTES OBSERV
ARAM:

✓ O resultado é definido antes da animação
  A máquina caça-níqueis decide o resultado antes de qualquer
  animação começar. O giro visual não determina o resultado —
  apenas o exibe.

✓ O quase ganho pode ser fabricado
  O algoritmo posiciona deliberadamente símbolos para criar
  a ilusão de "quase ganho". Isso ativa regiões cerebrais
  ligadas à recompensa, mesmo sem vitória real.

✓ Nem toda 'vitória' representa ganho real
  Algumas "vitórias" devolvem menos do que foi apostado.
  A celebração visual mascara a perda financeira real.

✓ As perdas se acumulam ao longo das rodadas
  O house edge (vantagem da casa) é matemático, não aleatório.
  A cada rodada, a casa retém uma porcentagem previsível.

═══════════════════════════════════════════════════════════════

PERGUNTAS PARA DISCUSSÃO EM SALA:

1. O que mais chamou atenção na demonstração? Por quê?
   Objetivo: Identificar quais mecanismos foram mais evidentes
   e impactantes para os estudantes.

2. Por que o quase ganho pode incentivar novas apostas?
   Objetivo: Refletir sobre a psicologia do jogo e como o
   design manipula a percepção de risco.

3. Como uma falsa vitória pode enganar o jogador?
   Objetivo: Discutir a diferença entre vitória visual e
   resultado financeiro real.

4. Que relação isso tem com educação financeira?
   Objetivo: Conectar o simulador a conceitos de gestão de
   dinheiro, risco e decisões financeiras.

═══════════════════════════════════════════════════════════════

SUGESTÕES PARA APROFUNDAMENTO:

• Compare o simulador com apps reais de caça-níqueis. Quais
  mecanismos são similares? Quais diferem?

• Pesquise o conceito de "house edge" em diferentes tipos de
  apostas (slots, roulette, sports betting).

• Discuta regulação e transparência algorítmica. Como a lei
  pode obrigar plataformas a revelar seus algoritmos?

• Trabalhe educação financeira: como identificar e evitar
  comportamentos compulsivos de apostas?

• Explore aspectos neurobiológicos: como o cérebro reage a
  near-misses e falsas vitórias?

═══════════════════════════════════════════════════════════════

DICA PARA O PROFESSOR:

Incentive os estudantes a compartilharem suas percepções e
relacionar a experiência com situações do cotidiano — desde
publicidade de apostas online até apps que usam mecanismos
similares (games, redes sociais).

═══════════════════════════════════════════════════════════════

Gerado pelo Simulador Educacional de Transparência Algorítmica
  `;

  // Cria um blob com o conteúdo
  const blob = new Blob([roteiro], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Cria um link temporário e faz o download
  const link = document.createElement('a');
  link.href = url;
  link.download = 'roteiro-transparencia-algoritmica.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ============================================================
   RESET — volta ao início
   ============================================================ */
function resetDemo() {
  isAnimating = false;
  goToStep(0);
}

/* ============================================================
   UTILITÁRIOS DOM
   ============================================================ */
function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('oculto');
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('oculto');
}

function enableBtn(id) {
  const el = document.getElementById(id);
  if (el) el.disabled = false;
}

function disableBtn(id) {
  const el = document.getElementById(id);
  if (el) el.disabled = true;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ============================================================
   BLOQUEIO DE TECLAS
   Impede navegação por teclado além do Reveal.initialize()
   ============================================================ */
function bloquearTeclado() {
  const teclasBloqueadas = [
    'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown',
    'Space', 'PageDown', 'PageUp', 'Home', 'End', 'Enter'
  ];
  document.addEventListener('keydown', (e) => {
    if (teclasBloqueadas.includes(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Inicializa Reveal.js com navegação bloqueada
  Reveal.initialize({
    controls:     false,
    progress:     false,
    keyboard:     false,
    touch:        false,
    hash:         false,
    overview:     false,
    slideNumber:  false,
    transition:   'none',
    transitionSpeed: 'default',
    width:        '100%',
    height:       '100%',
    margin:       0,
    minScale:     1,
    maxScale:     1
  }).then(() => {
    // Garante que começa no slide 0
    Reveal.slide(0, 0, 0);
    initAnimators();
    bloquearTeclado();

    // Marca que a aplicação foi inicializada corretamente
    window.__APP_INITIALIZED__ = true;
    console.log('✅ Simulador inicializado com sucesso');
  }).catch((error) => {
    console.error('❌ Erro ao inicializar Reveal.js:', error);
    document.body.insertAdjacentHTML('beforeend',
      '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;font-size:18px;text-align:center;padding:40px;">' +
      '<div>' +
      '<p>❌ Erro ao inicializar o simulador</p>' +
      '<p style="font-size:14px;margin-top:20px;color:#aaa;">' + error.message + '</p>' +
      '</div></div>'
    );
  });
});
