/** Controls of the side panel, shared by the studio and the showcase. */

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function button(label: string, active: boolean, onClick: () => void): HTMLButtonElement {
  const b = el('button', label, active ? 'active' : '');
  b.onclick = onClick;
  return b;
}

export function checkbox(title: string, detail: string, checked: boolean, onChange: (checked: boolean) => void): HTMLLabelElement {
  const label = el('label');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.onchange = () => onChange(box.checked);
  const text = el('span', title);
  if (detail) text.append(el('small', detail));
  label.append(box, text);
  return label;
}

/** A labelled control, one per line. */
function field(title: string, control: HTMLElement): HTMLLabelElement {
  const label = el('label', '', 'field');
  label.append(el('span', title), control);
  return label;
}

/** Drop-down list. `options` are [value, label]. */
export function select(title: string, options: [string, string][], value: string, onChange: (value: string) => void): HTMLLabelElement {
  const list = el('select');
  for (const [v, text] of options) {
    const option = el('option', text);
    option.value = v;
    list.append(option);
  }
  list.value = value;
  list.onchange = () => onChange(list.value);
  return field(title, list);
}

/** Slider. `onInput` runs while it is dragged, `onDone` when it is let go. */
export function slider(title: string, range: [number, number, number], value: number, onInput: (value: number) => void, onDone?: () => void): HTMLLabelElement {
  const input = el('input');
  input.type = 'range';
  [input.min, input.max, input.step] = range.map(String);
  input.value = String(value);
  const shown = el('small', String(value));
  input.oninput = () => {
    shown.textContent = input.value;
    onInput(Number(input.value));
  };
  input.onchange = () => onDone?.();
  const label = field(title, input);
  label.append(shown);
  return label;
}

/** Color picker. `onInput` runs while a color is being chosen, `onDone` when the choice is made. */
export function color(title: string, value: string, onInput: (value: string) => void, onDone?: () => void): HTMLLabelElement {
  const input = el('input');
  input.type = 'color';
  input.value = value;
  input.oninput = () => onInput(input.value);
  input.onchange = () => onDone?.();
  return field(title, input);
}
