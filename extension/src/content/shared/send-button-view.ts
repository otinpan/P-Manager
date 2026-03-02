export function buildSendButtonHtml(buttonId: string): string {
  return `<button id="${buttonId}" type="button">自動生成</button>`;
}

export function buildSendButtonCss(buttonId: string, baseColor: string, hoverColor: string): string {
  return `
    #${buttonId} {
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      background: ${baseColor};
      cursor: pointer;
      width: 100%;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }

    #${buttonId}:hover {
      background: ${hoverColor};
    }
  `;
}
