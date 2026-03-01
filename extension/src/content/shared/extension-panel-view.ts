export type ExtensionPanelOptions = {
  sidebarId: string;
  styleId: string;
  title: string;
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
};

const PANEL_BODY_CLASS = "p-manager-extension-panel-body";
const RESIZE_HANDLE_CLASS = "p-manager-extension-panel-resize";

export function ensureExtensionPanel(options: ExtensionPanelOptions): HTMLElement {
  ensureExtensionPanelStyle(options);

  let sidebar = document.getElementById(options.sidebarId) as HTMLElement | null;
  if (!sidebar) {
    sidebar = document.createElement("aside");
    sidebar.id = options.sidebarId;
    sidebar.innerHTML = `
      <div class="${RESIZE_HANDLE_CLASS}" aria-hidden="true"></div>
      <header>
        <h2>${options.title}</h2>
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
    }

    #${options.sidebarId} > header > h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
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
