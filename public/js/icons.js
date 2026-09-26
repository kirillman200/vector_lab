// Inline icon set and button decoration helpers.

const ICONS = {
  rect: '<rect x="3" y="5" width="18" height="14" rx="2"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6"/>',
  line: '<path d="M4 19L20 5"/><circle cx="4" cy="19" r="1"/><circle cx="20" cy="5" r="1"/>',
  polygon: '<path d="M12 3L22 21H2Z"/>',
  text: '<path d="M4 5h16M12 5v15M8 20h8M4 5v3M20 5v3"/>',
  star: '<path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  heart: '<path d="M12 20S2 14 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 12-10 12z"/>',
  arrow: '<path d="M3 9h10V4l8 8-8 8v-5H3z"/>',
  bolt: '<path d="M14 2L4 13h7l-1 9 10-12h-7z"/>',
  plus: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  diamond: '<path d="M12 2l8 10-8 10-8-10z"/>',
  tag: '<path d="M3 5h10l8 7-8 7H3z"/><circle cx="7" cy="12" r="1.5"/>',
  pin: '<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0z"/><circle cx="12" cy="9" r="2"/>',
  freehand: '<path d="M3 17C1 7 9 2 10 8s-6 13-1 13 6-17 9-16-1 12 3 11"/>',
  pen: '<path d="M12 3L4 17l3 3 14-8zM7 20l5-8"/><circle cx="13" cy="11" r="2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="M3 17l6-6 4 4 3-3 5 5"/>',
  sample: '<path d="M12 3l1.7 5.2H19l-4.3 3.1 1.7 5.2L12 13.3l-4.4 3.2 1.7-5.2L5 8.2h5.3z"/>',
  load: '<path d="M4 20h16"/><path d="M12 4v12"/><path d="M7 9l5-5 5 5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  save: '<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3"/><path d="M8 21v-8h8v8"/>',
  hand: '<path d="M7.5 12V7.5a1.5 1.5 0 0 1 3 0V11 5.5a1.5 1.5 0 0 1 3 0V11 6.5a1.5 1.5 0 0 1 3 0V12 9a1.5 1.5 0 0 1 3 0v5c0 4.4-2.6 7-7 7h-1c-2.2 0-3.5-1-4.8-2.7L4 14.8a1.6 1.6 0 0 1 2.4-2.1z"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 21v-6h6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 3v6h-6"/>',
  fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  panelLeft: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14"/>',
  panelRight: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M15 5v14"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>',
  path: '<path d="M4 17C8 7 12 21 16 11"/><circle cx="4" cy="17" r="1.5"/><circle cx="16" cy="11" r="1.5"/><path d="M16 11l4-4"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
  duplicate: '<rect x="8" y="8" width="11" height="11" rx="2"/><rect x="5" y="5" width="11" height="11" rx="2"/>',
  forward: '<path d="M12 5l7 7-7 7"/><path d="M5 12h14"/>',
  backward: '<path d="M12 19l-7-7 7-7"/><path d="M5 12h14"/>',
  fillOff: '<path d="M12 3s-6 6.2-6 11a6 6 0 0 0 10.8 3.6"/><path d="M4 20L20 4"/>',
  strokeOff: '<path d="M4 12h16"/><path d="M4 20L20 4"/>',
  fillOn: '<path d="M12 3s-6 6.2-6 11a6 6 0 0 0 12 0c0-4.8-6-11-6-11z"/><path d="M9 14h6"/><path d="M12 11v6"/>',
  strokeOn: '<path d="M4 12h16"/><path d="M12 7v10"/>',
  check: '<path d="M20 6L9 17l-5-5"/>'
};

function decorateButton(button, iconName, label = button.textContent.trim()) {
  const icon = ICONS[iconName];
  if (!button || !icon) return;
  button.setAttribute("aria-label", label);
  button.innerHTML = `<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span class="button-label">${label}</span>`;
  button.classList.add("button-icon-ready");
}

function iconOnly(button) {
  if (!button) return;
  button.classList.add("icon-only");
}
