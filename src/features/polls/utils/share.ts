import { formatNumber, translate } from "../../../i18n/catalog";
import type { Locale } from "../../../i18n/locale";
import type { Poll } from "../../../types/poll";
import QRCode from "qrcode";
import { optionColors } from "./optionColors";

export const pollUrl = (id: string) => `${window.location.origin}/poll/${encodeURIComponent(id)}`;

export async function copyPollLink(id: string) {
  const value = pollUrl(id);
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    const focused = document.activeElement as HTMLElement | null;
    document.body.append(input);
    try {
      input.select();
      if (!document.execCommand("copy")) throw new Error("Copy failed");
    } finally {
      input.remove();
      focused?.focus();
    }
  }
}

function loadImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => resolve(null), 10000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); resolve(null); };
    image.src = url;
  });
}

// Render once for both the preview and the downloaded PNG, including transparent perforations.
export async function renderShareTicket(poll: Poll, locale: Locale) {
  const images = await Promise.all(poll.options.map((option) => loadImage(option.imageUrl)));
  const styles = getComputedStyle(document.documentElement);
  const displayFont = styles.getPropertyValue("--font-display").trim();
  const bodyFont = styles.getPropertyValue("--font-body").trim();
  // Resolve nested CSS variables before passing families to Canvas.
  const fontProbe = document.createElement("span");
  document.body.append(fontProbe);
  fontProbe.style.fontFamily = displayFont;
  const displayFamily = getComputedStyle(fontProbe).fontFamily;
  fontProbe.style.fontFamily = bodyFont;
  const bodyFamily = getComputedStyle(fontProbe).fontFamily;
  fontProbe.remove();
  const brand = translate(locale, "share.ticketBrand");
  const scan = translate(locale, "share.ticketScan");
  const sample = [brand, scan, poll.title, ...poll.options.map((option) => option.name)].join(" ");
  await Promise.allSettled([
    document.fonts.load(`700 38px ${displayFamily}`, sample),
    document.fonts.load(`400 21px ${bodyFamily}`, sample),
  ]);
  await document.fonts.ready;
  const width = 720;
  const rows = Math.ceil(poll.options.length / 2);
  // The exported portrait ranges from 2:3 to 9:16.
  const height = Math.round(Math.min(width * 16 / 9, Math.max(width * 3 / 2, 360 + rows * 320)));
  const margin = 64;
  const gap = 20;
  const contentWidth = width - margin * 2;
  const cellWidth = (contentWidth - gap) / 2;
  const gridTop = 214;
  const gridBottom = height - 260;
  const cellHeight = (gridBottom - gridTop - Math.max(0, rows - 1) * gap) / Math.max(1, rows);
  const textOnly = poll.options.every((option) => !option.imageUrl?.trim());
  // Continuous perforated silhouette, including the four quarter-circle corners.
  const ticketPath = (inset: number) => {
    const path = new Path2D();
    const left = inset, right = width - inset, top = inset, bottom = height - inset;
    // Five semicircular cutouts on each horizontal edge, with matching corner cuts.
    const intervals = 6;
    const step = width / intervals;
    const radius = 26 + inset;
    const angle = Math.asin(inset / radius);
    const reach = Math.sqrt(radius * radius - inset * inset);
    // Keep the same circle centers for every outline so the inset follows each notch.
    path.moveTo(left, reach);
    path.arc(0, 0, radius, Math.PI / 2 - angle, angle, true);
    for (let i = 1; i < intervals; i++) {
      const x = i * step;
      path.lineTo(x - reach, top);
      path.arc(x, 0, radius, Math.PI - angle, angle, true);
    }
    path.lineTo(width - reach, top);
    path.arc(width, 0, radius, Math.PI - angle, Math.PI / 2 + angle, true);
    path.lineTo(right, height - reach);
    path.arc(width, height, radius, -Math.PI / 2 - angle, -Math.PI + angle, true);
    for (let i = intervals - 1; i > 0; i--) {
      const x = i * step;
      path.lineTo(x + reach, bottom);
      path.arc(x, height, radius, -angle, -Math.PI + angle, true);
    }
    path.lineTo(reach, bottom);
    path.arc(0, height, radius, -angle, -Math.PI / 2 + angle, true);
    path.closePath();
    return path;
  };
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f1e4ff");
  gradient.addColorStop(0.5, "#fce5f4");
  gradient.addColorStop(1, "#dddafe");
  ctx.fillStyle = gradient;
  ctx.fill(ticketPath(0));
  ctx.strokeStyle = "#ffffffcc";
  ctx.lineWidth = 2;
  ctx.stroke(ticketPath(2));
  ctx.strokeStyle = "#d3b8ed";
  ctx.lineWidth = 1.5;
  ctx.stroke(ticketPath(9));
  const text = (value: string, x: number, y: number, maxWidth: number, size: number, bold = false) => {
    ctx.font = `${bold ? 700 : 400} ${size}px ${bold ? displayFamily : bodyFamily}`;
    let fitted = value;
    while (ctx.measureText(fitted).width > maxWidth && fitted.length > 1) fitted = fitted.slice(0, -1);
    if (fitted !== value) fitted = `${fitted.slice(0, -1)}…`;
    ctx.fillText(fitted, x, y);
  };
  const roundRect = (x: number, y: number, rectWidth: number, rectHeight: number, radius: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, rectWidth, rectHeight, radius);
  };
  const drawTextBottle = (x: number, y: number, index: number, name: string) => {
    const bottleWidth = Math.min(cellWidth * 0.68, cellHeight * 0.58);
    const bottleHeight = Math.min(cellHeight * 0.86, bottleWidth * 1.7);
    const bottleX = x + (cellWidth - bottleWidth) / 2;
    const bottleY = y + (cellHeight - bottleHeight) / 2;
    const capHeight = bottleHeight * 0.065;
    const neckHeight = bottleHeight * 0.09;
    const bodyY = bottleY + capHeight + neckHeight * 0.7;
    const bodyHeight = bottleHeight - capHeight - neckHeight * 0.7;
    const radius = bottleWidth * 0.17;
    const color = optionColors[index % optionColors.length];

    ctx.fillStyle = "#b59bd5";
    roundRect(bottleX + bottleWidth * 0.3, bottleY, bottleWidth * 0.4, capHeight, capHeight * 0.25);
    ctx.fill();
    ctx.strokeStyle = "#ffffffd9";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff70";
    roundRect(bottleX + bottleWidth * 0.34, bottleY + capHeight * 0.75, bottleWidth * 0.32, neckHeight, 4);
    ctx.fill();
    ctx.strokeStyle = "#ffffffe6";
    ctx.stroke();

    roundRect(bottleX, bodyY, bottleWidth, bodyHeight, radius);
    ctx.fillStyle = "#ffffff66";
    ctx.fill();
    ctx.save();
    roundRect(bottleX + 2, bodyY + 2, bottleWidth - 4, bodyHeight - 4, radius - 2);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.68;
    ctx.fillRect(bottleX + 3, bodyY + bodyHeight * 0.4, bottleWidth - 6, bodyHeight * 0.6);
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = "#ffffffe6";
    ctx.lineWidth = 3;
    roundRect(bottleX, bodyY, bottleWidth, bodyHeight, radius);
    ctx.stroke();

    const labelWidth = bottleWidth * 0.84;
    const labelHeight = Math.min(bodyHeight * 0.48, Math.max(58, cellHeight * 0.38));
    const labelX = bottleX + (bottleWidth - labelWidth) / 2;
    const labelY = bodyY + (bodyHeight - labelHeight) * 0.48;
    roundRect(labelX, labelY, labelWidth, labelHeight, 8);
    ctx.fillStyle = "#fffdf9fa";
    ctx.fill();
    ctx.strokeStyle = "#ede9fe";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#7c3aed";
    text(String.fromCharCode(65 + index), bottleX + bottleWidth / 2, labelY + labelHeight * 0.31, labelWidth - 12, 14, true);

    const nameSize = Math.min(19, Math.max(13, labelWidth * 0.13));
    ctx.font = `700 ${nameSize}px ${displayFamily}`;
    const words = Array.from(name);
    const lines: string[] = [];
    let line = "";
    for (const character of words) {
      const candidate = line + character;
      if (line && ctx.measureText(candidate).width > labelWidth - 14) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    const maxLines = Math.max(1, Math.floor((labelHeight * 0.48) / (nameSize * 1.2)));
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
    }
    ctx.fillStyle = "#4c1d95";
    lines.forEach((value, lineIndex) => {
      text(value, bottleX + bottleWidth / 2, labelY + labelHeight * 0.56 + lineIndex * nameSize * 1.2, labelWidth - 12, nameSize, true);
    });
    ctx.textAlign = "start";
  };
  ctx.fillStyle = "#8969a6";
  text(brand, margin, 76, contentWidth, 19, true);
  ctx.fillStyle = "#4c1d95";
  // Two lines keep longer questions readable without compressing the type.
  ctx.font = `700 38px ${displayFamily}`;
  let split = 0;
  while (split < poll.title.length && ctx.measureText(poll.title.slice(0, split + 1)).width <= contentWidth) split++;
  text(poll.title.slice(0, split), margin, 137, contentWidth, 38, true);
  if (split < poll.title.length) text(poll.title.slice(split), margin, 184, contentWidth, 38, true);
  poll.options.forEach((option, index) => {
    const x = margin + (index % 2) * (cellWidth + gap);
    const y = gridTop + Math.floor(index / 2) * (cellHeight + gap);
    const label = option.name.trim();
    const labelHeight = label ? 46 : 0;
    const imageHeight = cellHeight - labelHeight;
    // Preserve the source image and its transparency; do not add a filled tile.
    const image = images[index];
    if (image) {
      const padding = 10;
      const scale = Math.min((cellWidth - padding * 2) / image.width, (imageHeight - padding * 2) / image.height);
      ctx.drawImage(image, x + (cellWidth - image.width * scale) / 2, y + (imageHeight - image.height * scale) / 2, image.width * scale, image.height * scale);
    } else if (textOnly) {
      drawTextBottle(x, y, index, label || translate(locale, "image.option", { index: index + 1 }));
    } else {
      ctx.fillStyle = "#b99cdd";
      text(formatNumber(locale, index + 1, { minimumIntegerDigits: 2 }), x + cellWidth / 2 - 26, y + imageHeight / 2 + 16, 100, 48, true);
    }
    if (label && !textOnly) {
      const letter = String.fromCharCode(65 + index);
      const labelBaseline = y + cellHeight - 18;
      const labelSize = 22;
      ctx.font = `700 ${labelSize}px ${displayFamily}`;
      ctx.fillStyle = "#7c3aed";
      ctx.fillText(letter, x + 16, labelBaseline);
      const letterWidth = ctx.measureText(letter).width;
      ctx.fillStyle = "#5b21b6";
      text(label, x + 16 + letterWidth + 8, labelBaseline, cellWidth - letterWidth - 40, labelSize, true);
    }
  });
  ctx.strokeStyle = "#c4a0ef";
  ctx.setLineDash([12, 10]);
  ctx.beginPath(); ctx.moveTo(margin, height - 220); ctx.lineTo(width - margin, height - 220); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#5b21b6";
  const url = pollUrl(poll.id);
  // Draw modules directly into the exported PNG: no external QR service or image request.
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quietZone = 4;
  const moduleCount = qr.modules.size + quietZone * 2;
  const slotSize = moduleCount * Math.max(1, Math.floor(180 / moduleCount));
  const qrSize = Math.max(moduleCount, Math.round(slotSize * 0.85));
  const inset = Math.round((slotSize - qrSize) / 2);
  const qrX = width - margin - slotSize + inset;
  const qrY = height - 36 - slotSize + inset;
  const moduleEdge = (index: number) => Math.round((index + quietZone) * qrSize / moduleCount);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = "#241039";
  for (let row = 0; row < qr.modules.size; row++) {
    for (let col = 0; col < qr.modules.size; col++) {
      if (qr.modules.get(row, col)) {
        const x = moduleEdge(col);
        const y = moduleEdge(row);
        ctx.fillRect(qrX + x, qrY + y, moduleEdge(col + 1) - x, moduleEdge(row + 1) - y);
      }
    }
  }
  const linkWidth = contentWidth - slotSize - 24;
  ctx.fillStyle = "#5b21b6";
  text(scan, margin, height - 158, linkWidth, 25, true);
  let urlSize = 21;
  do {
    ctx.font = `${urlSize}px ${bodyFamily}`;
    if (ctx.measureText(url).width <= linkWidth) break;
    urlSize--;
  } while (urlSize > 8);
  text(url, margin, height - 114, linkWidth, urlSize);
  return canvas.toDataURL("image/png");
}
