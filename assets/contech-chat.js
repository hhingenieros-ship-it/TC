(() => {
  const endpoint = new URL('../api/contech-chat', document.currentScript.src);
  const suggestions = [
    ['Malla curricular', '¿Qué incluye la malla curricular?'],
    ['Perfil recomendado', '¿Qué ruta me recomiendan si soy residente de obra?'],
    ['Certificación', '¿Cómo funciona la certificación?'],
    ['Precio y matrícula', '¿Cuál es el precio oficial y cómo me inscribo?'],
  ];

  class ContechChat extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          :host { position: fixed; z-index: 45; left: max(14px, env(safe-area-inset-left)); bottom: max(14px, env(safe-area-inset-bottom)); color: #f5f5f5; font: 400 .9rem/1.5 Inter, system-ui, sans-serif; }
          * { box-sizing: border-box; }
          [hidden] { display: none !important; }
          button, input { font: inherit; }
          button { cursor: pointer; }
          button:disabled { cursor: wait; opacity: .65; }
          :is(button, input, a):focus-visible { outline: 2px solid #ffcd00; outline-offset: 3px; }
          .accent { background: #ffcd00; color: #111; border: 0; font-weight: 750; }
          .launcher { display: flex; align-items: center; gap: 9px; border-radius: 999px; padding: 12px 17px; box-shadow: 0 5px 28px #0009; }
          .launcher svg { width: 21px; height: 21px; }
          .panel { width: min(395px, calc(100vw - 28px)); height: min(590px, calc(100dvh - 36px)); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; background: #171717; border: 1px solid #555; border-radius: 18px; box-shadow: 0 12px 40px #000a; overflow: hidden; }
          header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #404040; }
          header strong { display: block; font-size: 1rem; }
          header span, .note { color: #c6c6c6; font-size: .77rem; }
          .close { border: 1px solid #555; border-radius: 9px; background: #252525; color: #fff; min-width: 44px; min-height: 44px; font-size: 1.35rem; }
          .thread { display: flex; flex-direction: column; gap: 10px; padding: 14px; overflow: auto; overscroll-behavior: contain; }
          .message { align-self: flex-start; max-width: 96%; background: #262626; border-radius: 12px; padding: 9px 12px; }
          .message p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
          .message.user { align-self: flex-end; background: #ffdc4a; color: #111; }
          .sources, .suggestions { display: flex; flex-wrap: wrap; gap: 7px; }
          .sources { margin-top: 8px; }
          .sources a, .suggestions button { border: 1px solid #665525; color: #ffe17a; background: #23201a; border-radius: 8px; padding: 6px 9px; font-size: .78rem; text-decoration: none; }
          .sources a:hover, .suggestions button:hover { border-color: #ffcd00; }
          form { padding: 12px; border-top: 1px solid #404040; }
          .field { display: flex; gap: 7px; }
          input { flex: 1; min-width: 0; border-radius: 9px; border: 1px solid #666; background: #111; color: #fff; padding: 8px; font-size: max(16px, .9rem); }
          .send { border-radius: 9px; padding: 0 12px; }
          .note { margin: 5px 0 0; }
          .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
          @media (max-width: 480px) {
            :host { left: max(9px, env(safe-area-inset-left)); bottom: max(9px, env(safe-area-inset-bottom)); }
            .panel { width: min(395px, calc(100vw - 18px)); height: min(590px, calc(100dvh - 70px)); }
          }
        </style>
        <button type="button" class="accent launcher" aria-expanded="false" aria-controls="contech-panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 11.5a7 7 0 0 1-7 7H9l-4 3v-5a7 7 0 0 1 4-12h4a7 7 0 0 1 7 7Z"/><path d="M9 11h6"/></svg>
          Asistente ConTech
        </button>
        <section class="panel" id="contech-panel" role="dialog" aria-labelledby="contech-chat-title" hidden>
          <header>
            <div><strong id="contech-chat-title">Asistente ConTech</strong><span>Programa, admisión y simuladores</span></div>
            <button class="close" type="button" aria-label="Cerrar asistente">×</button>
          </header>
          <div class="thread" role="log" aria-label="Conversación" tabindex="0">
            <div class="message"><p>Hola. Puedo ayudarte a conocer el programa, elegir una ruta o encontrar información sobre la matrícula.</p></div>
            <div class="suggestions" aria-label="Preguntas sugeridas"></div>
          </div>
          <form>
            <div class="field">
              <label class="visually-hidden" for="contech-question">Tu pregunta</label>
              <input id="contech-question" placeholder="Escribe tu pregunta" maxlength="500" required autocomplete="off">
              <button class="accent send" type="submit">Enviar</button>
            </div>
            <p class="note">Evita compartir datos personales o documentos de obra.</p>
          </form>
        </section>`;

      const launcher = root.querySelector('.launcher');
      const panel = root.querySelector('.panel');
      const close = root.querySelector('.close');
      const thread = root.querySelector('.thread');
      const shortcuts = root.querySelector('.suggestions');
      const form = root.querySelector('form');
      const input = root.querySelector('input');
      const send = root.querySelector('.send');
      const history = [];
      let pending = false;

      const setOpen = open => {
        panel.hidden = !open;
        launcher.hidden = open;
        launcher.setAttribute('aria-expanded', String(open));
        (open ? close : launcher).focus();
        if (open) thread.scrollTop = thread.scrollHeight;
      };

      const message = (text, role, sources = []) => {
        const bubble = document.createElement('div');
        bubble.className = 'message ' + role;
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        bubble.append(paragraph);
        if (sources.length) {
          const links = document.createElement('div');
          links.className = 'sources';
          for (const { id, title } of sources) {
            const target = /^[a-z][a-z0-9-]*$/.test(id) && document.getElementById(id);
            if (!target) continue;
            const link = document.createElement('a');
            link.href = '#' + id;
            link.textContent = title;
            link.addEventListener('click', () => {
              setOpen(false);
              const moduleButton = target.querySelector('button[onclick^="toggleModule"]');
              if (moduleButton && target.querySelector('[id^="module-body-"]')?.classList.contains('hidden')) moduleButton.click();
            });
            links.append(link);
          }
          if (links.childElementCount) bubble.append(links);
        }
        thread.append(bubble);
        thread.scrollTop = thread.scrollHeight;
        return bubble;
      };

      const ask = async question => {
        question = question.trim();
        if (!question || pending) return;
        pending = true;
        input.value = '';
        send.disabled = true;
        shortcuts.querySelectorAll('button').forEach(button => { button.disabled = true; });
        message(question, 'user');
        const loading = message('Consultando la información del programa…', 'assistant');
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, history }),
            signal: AbortSignal.timeout(22000),
          });
          if (!response.ok) throw new Error(String(response.status));
          const result = await response.json();
          if (typeof result.answer !== 'string' || !Array.isArray(result.sources)) throw new Error('Respuesta inválida');
          loading.remove();
          message(result.answer, 'assistant', result.sources);
          history.push({ role: 'user', content: question }, { role: 'assistant', content: result.answer });
          if (history.length > 6) history.splice(0, history.length - 6);
        } catch (error) {
          loading.remove();
          message(error.message === '429'
            ? 'Has enviado varias consultas seguidas. Espera un minuto y vuelve a intentarlo.'
            : 'El asistente está temporalmente indisponible. Puedes consultar el programa y el contacto en estos enlaces.',
          'assistant', [{ id: 'modulos', title: 'Malla curricular' }, { id: 'contacto', title: 'Admisión y contacto' }]);
          if (!input.value) input.value = question;
        } finally {
          pending = false;
          send.disabled = false;
          shortcuts.querySelectorAll('button').forEach(button => { button.disabled = false; });
        }
      };

      launcher.addEventListener('click', () => setOpen(true));
      close.addEventListener('click', () => setOpen(false));
      panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') setOpen(false);
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        ask(input.value);
      });
      for (const [label, question] of suggestions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => ask(question));
        shortcuts.append(button);
      }
    }
  }

  customElements.define('contech-chat', ContechChat);
})();
