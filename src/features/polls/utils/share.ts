import { formatNumber, translate } from "../../../i18n/catalog";
import type { Locale } from "../../../i18n/locale";
import type { Poll } from "../../../types/poll";
import QRCode from "qrcode";

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
  const details = translate(locale, "share.ticketDetails", { count: poll.options.length });
  const sample = [brand, scan, details, poll.title, ...poll.options.map((option) => option.name)].join(" ");
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
  // Continuous perforated silhouette, including the four quarter-circle corners.
  const ticketPath = (inset: number) => {
    const path = new Path2D();
    const left = inset, right = width - inset, top = inset, bottom = height - inset;
    const radius = 16 + inset;
    const corner = 28 + inset;
    const step = width / 14;
    const angle = Math.asin(inset / radius);
    const cornerAngle = Math.asin(inset / corner);
    const reach = Math.sqrt(radius * radius - inset * inset);
    const cornerReach = Math.sqrt(corner * corner - inset * inset);
    // Keep the same circle centers for every outline so the inset follows each notch.
    path.moveTo(left, cornerReach);
    path.arc(0, 0, corner, Math.PI / 2 - cornerAngle, cornerAngle, true);
    for (let i = 1; i < 14; i++) {
      const x = i * step;
      path.lineTo(x - reach, top);
      path.arc(x, 0, radius, Math.PI - angle, angle, true);
    }
    path.lineTo(width - cornerReach, top);
    path.arc(width, 0, corner, Math.PI - cornerAngle, Math.PI / 2 + cornerAngle, true);
    path.lineTo(right, height - cornerReach);
    path.arc(width, height, corner, -Math.PI / 2 - cornerAngle, -Math.PI + cornerAngle, true);
    for (let i = 13; i > 0; i--) {
      const x = i * step;
      path.lineTo(x + reach, bottom);
      path.arc(x, height, radius, -angle, -Math.PI + angle, true);
    }
    path.lineTo(cornerReach, bottom);
    path.arc(0, height, corner, -cornerAngle, -Math.PI / 2 + cornerAngle, true);
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
    } else {
      ctx.fillStyle = "#b99cdd";
      text(formatNumber(locale, index + 1, { minimumIntegerDigits: 2 }), x + cellWidth / 2 - 26, y + imageHeight / 2 + 16, 100, 48, true);
    }
    if (label) {
      ctx.fillStyle = "#5b21b6";
      text(label, x + 16, y + cellHeight - 18, cellWidth - 32, 22, true);
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
  const moduleSize = Math.max(1, Math.floor(180 / (qr.modules.size + quietZone * 2)));
  const qrSize = (qr.modules.size + quietZone * 2) * moduleSize;
  const qrX = width - margin - qrSize;
  const qrY = height - 36 - qrSize;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = "#241039";
  for (let row = 0; row < qr.modules.size; row++) {
    for (let col = 0; col < qr.modules.size; col++) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect(qrX + (col + quietZone) * moduleSize, qrY + (row + quietZone) * moduleSize, moduleSize, moduleSize);
      }
    }
  }
  const linkWidth = contentWidth - qrSize - 24;
  ctx.fillStyle = "#5b21b6";
  text(scan, margin, height - 158, linkWidth, 25, true);
  let urlSize = 21;
  do {
    ctx.font = `${urlSize}px ${bodyFamily}`;
    if (ctx.measureText(url).width <= linkWidth) break;
    urlSize--;
  } while (urlSize > 8);
  text(url, margin, height - 114, linkWidth, urlSize);
  ctx.fillStyle = "#8969a6";
  text(details, margin, height - 68, linkWidth, 16);
  return canvas.toDataURL("image/png");
}
