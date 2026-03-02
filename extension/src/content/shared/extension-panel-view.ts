export type ExtensionPanelOptions = {
  sidebarId: string;
  styleId: string;
  title: string;
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onClose?: ()=>void;
  onReopen?: ()=>void;
};

const PANEL_BODY_CLASS = "p-manager-extension-panel-body";
const RESIZE_HANDLE_CLASS = "p-manager-extension-panel-resize";
const CLOSE_BUTTON_CLASS = "p-manager-extension-panel-close";
const REOPEN_BUTTON_CLASS = "p-manager-extension-panel-reopen";

export function ensureExtensionPanel(options: ExtensionPanelOptions): HTMLElement {
  ensureExtensionPanelStyle(options);
  hideReopenButton(options.sidebarId);

  let sidebar = document.getElementById(options.sidebarId) as HTMLElement | null;
  if (!sidebar) {
    sidebar = document.createElement("aside");
    sidebar.id = options.sidebarId;
    sidebar.innerHTML = `
      <div class="${RESIZE_HANDLE_CLASS}" aria-hidden="true"></div>
      <header>
        <h2>${options.title}</h2>
        <button class="${CLOSE_BUTTON_CLASS}" type="button" aria-label="Close panel">×</button>
      </header>
      <section class="${PANEL_BODY_CLASS}"></section>
    `;
    document.body.appendChild(sidebar);
  }

  const width = getSavedWidth(options.storageKey, options.defaultWidth ?? 320);
  const minWidth = options.minWidth ?? 260;
  const maxWidth = options.maxWidth ?? 700;
  sidebar.style.width = `${clamp(width, minWidth, maxWidth)}px`;

  initResizeBehavior(sidebar, options);
  initCloseBehavior(sidebar, options);

  const body = sidebar.querySelector(`.${PANEL_BODY_CLASS}`) as HTMLElement | null;
  if (!body) {
    throw new Error("failed to initialize extension panel body");
  }

  return body;
}

export function removeExtensionPanel(sidebarId: string): void {
  const sidebar = document.getElementById(sidebarId);
  sidebar?.remove();
}

export function removeExtensionPanelLauncher(sidebarId: string): void {
  const reopenButton = document.getElementById(getReopenButtonId(sidebarId));
  reopenButton?.remove();
}

function ensureExtensionPanelStyle(options: ExtensionPanelOptions): void {
  if (document.getElementById(options.styleId)) return;

  const style = document.createElement("style");
  style.id = options.styleId;
  style.textContent = `
    #${options.sidebarId} {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 999998;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      border-left: 1px solid #cbd5e1;
      box-shadow: -8px 0 20px rgba(15, 23, 42, 0.18);
      font-family: "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
    }

    #${options.sidebarId} > header {
      border-bottom: 1px solid #e2e8f0;
      background: #f1f5f9;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    #${options.sidebarId} > header > h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    #${options.sidebarId} .${CLOSE_BUTTON_CLASS} {
      border: 1px solid #cbd5e1;
      border-radius: 9999px;
      width: 24px;
      height: 24px;
      padding: 0;
      line-height: 1;
      font-size: 16px;
      color: #334155;
      background: #ffffff;
      cursor: pointer;
    }

    #${options.sidebarId} .${CLOSE_BUTTON_CLASS}:hover {
      background: #e2e8f0;
    }

    .${REOPEN_BUTTON_CLASS} {
      position: fixed;
      right: 10px;
      top: 10%;
      transform: translateY(-50%);
      z-index: 999997;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
      cursor: pointer;
    }

    .${REOPEN_BUTTON_CLASS}:hover {
      background: #f1f5f9;
    }

    #${options.sidebarId} .${PANEL_BODY_CLASS} {
      flex: 1;
      overflow: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    #${options.sidebarId} .${RESIZE_HANDLE_CLASS} {
      position: absolute;
      top: 0;
      left: -5px;
      width: 10px;
      height: 100%;
      cursor: ew-resize;
      user-select: none;
      touch-action: none;
    }

    #${options.sidebarId} .${RESIZE_HANDLE_CLASS}:hover::after {
      content: "";
      position: absolute;
      top: 0;
      left: 4px;
      width: 2px;
      height: 100%;
      background: #0ea5e9;
      opacity: 0.6;
    }
  `;

  document.head.appendChild(style);
}

function initResizeBehavior(sidebar: HTMLElement, options: ExtensionPanelOptions): void {
  if (sidebar.dataset.resizeReady === "1") return;

  const handle = sidebar.querySelector(`.${RESIZE_HANDLE_CLASS}`) as HTMLElement | null;
  if (!handle) return;

  const minWidth = options.minWidth ?? 260;
  const maxWidth = options.maxWidth ?? 700;

  let dragging = false;

  const onMouseMove = (event: MouseEvent) => {
    if (!dragging) return;
    const width = clamp(window.innerWidth - event.clientX, minWidth, maxWidth);
    sidebar.style.width = `${width}px`;
  };

  const onMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    const currentWidth = Math.round(sidebar.getBoundingClientRect().width);
    saveWidth(options.storageKey, currentWidth);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  handle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    dragging = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  sidebar.dataset.resizeReady = "1";
}

function initCloseBehavior(sidebar: HTMLElement, options: ExtensionPanelOptions): void{
  if(sidebar.dataset.closeReady === "1") return;
  const closeButton = sidebar.querySelector(`.${CLOSE_BUTTON_CLASS}`) as HTMLButtonElement | null;
  if(!closeButton) return;

  closeButton.addEventListener("click",()=>{
    removeExtensionPanel(options.sidebarId);
    ensureReopenButton(options);
    options.onClose?.();
  });

  sidebar.dataset.closeReady = "1";
}

function ensureReopenButton(options: ExtensionPanelOptions): void{
  if(!options.onReopen) return;

  const buttonId = getReopenButtonId(options.sidebarId);
  let button = document.getElementById(buttonId) as HTMLButtonElement | null;
  if(!button){
    button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.className = REOPEN_BUTTON_CLASS;
    button.textContent = `${options.title} を再表示`;
    document.body.appendChild(button);
  }

  button.style.display = "block";
  button.onclick = ()=>{
    options.onReopen?.();
  };
}

function hideReopenButton(sidebarId: string): void{
  const button = document.getElementById(getReopenButtonId(sidebarId)) as HTMLButtonElement | null;
  if(!button) return;
  button.style.display = "none";
}

function getReopenButtonId(sidebarId: string): string{
  return `${sidebarId}-reopen`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getSavedWidth(storageKey: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const width = Number(raw);
    if (!Number.isFinite(width)) return fallback;
    return width;
  } catch {
    return fallback;
  }
}

function saveWidth(storageKey: string, width: number): void {
  try {
    window.localStorage.setItem(storageKey, String(width));
  } catch {
    // ignore storage write errors
  }
}
