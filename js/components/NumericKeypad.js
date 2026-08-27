const backspaceSvg = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>`;

export function renderNumericKeypad() {
  return `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 24px;">
       <button type="button" class="numpad-btn tappable" data-val="1">1</button>
       <button type="button" class="numpad-btn tappable" data-val="2">2</button>
       <button type="button" class="numpad-btn tappable" data-val="3">3</button>
       <button type="button" class="numpad-btn tappable" data-val="4">4</button>
       <button type="button" class="numpad-btn tappable" data-val="5">5</button>
       <button type="button" class="numpad-btn tappable" data-val="6">6</button>
       <button type="button" class="numpad-btn tappable" data-val="7">7</button>
       <button type="button" class="numpad-btn tappable" data-val="8">8</button>
       <button type="button" class="numpad-btn tappable" data-val="9">9</button>
       <button type="button" class="numpad-btn tappable" data-val="00">00</button>
       <button type="button" class="numpad-btn tappable" data-val="0">0</button>
       <button type="button" class="numpad-btn tappable" data-val="del" style="color: var(--text-secondary);">${backspaceSvg}</button>
    </div>
  `;
}

export function initNumericKeypad(containerElement, onKeyPress, onBackspace, onLongBackspace) {
  const vibrate = () => { if(navigator.vibrate) navigator.vibrate(10); };
  
  containerElement.querySelectorAll('.numpad-btn').forEach(btn => {
    let pressTimer;
    let didLongPress = false;

    btn.addEventListener('pointerdown', (e) => {
      vibrate();
      didLongPress = false;
      if (btn.getAttribute('data-val') === 'del') {
        pressTimer = setTimeout(() => {
          if (onLongBackspace) onLongBackspace();
          vibrate();
          didLongPress = true;
        }, 600);
      }
    });
    btn.addEventListener('pointerup', () => clearTimeout(pressTimer));
    btn.addEventListener('pointerleave', () => clearTimeout(pressTimer));

    btn.addEventListener('click', (e) => {
      if (didLongPress) return;
      const val = e.currentTarget.getAttribute('data-val');
      if (val === 'del') {
        if (onBackspace) onBackspace();
      } else {
        if (onKeyPress) onKeyPress(val);
      }
    });
  });
}