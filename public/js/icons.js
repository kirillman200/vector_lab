// Inline icon set and button decoration helpers.

const ICONS = {
  sample: '<path d="M12 3l1.7 5.2H19l-4.3 3.1 1.7 5.2L12 13.3l-4.4 3.2 1.7-5.2L5 8.2h5.3z"/>',
  load: '<path d="M4 20h16"/><path d="M12 4v12"/><path d="M7 9l5-5 5 5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
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
