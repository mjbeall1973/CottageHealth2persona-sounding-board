// exporters.js — turn a saved asset (Markdown text) into Word, PowerPoint, or Markdown files.

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");
let PptxGenJS = null;
try { PptxGenJS = require("pptxgenjs"); } catch (e) { /* optional */ }

// ---------- tiny markdown block parser ----------
// Produces [{type:'h1'|'h2'|'h3'|'p'|'li'|'oli'|'quote'|'hr', text, level}]
function parseBlocks(md) {
  const lines = String(md || "").replace(/\r/g, "").split("\n");
  const out = [];
  let para = [];
  let inFence = false;
  const flush = () => { if (para.length) { out.push({ type: "p", text: para.join(" ") }); para = []; } };
  for (let raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (/^```/.test(line)) { inFence = !inFence; flush(); continue; }
    if (inFence) { out.push({ type: "code", text: line }); continue; }
    if (!line.trim()) { flush(); continue; }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flush(); const n = m[1].length; out.push({ type: n === 1 ? "h1" : n === 2 ? "h2" : "h3", text: m[2].trim() }); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flush(); out.push({ type: "hr" }); continue; }
    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) { flush(); out.push({ type: "li", text: m[1].trim(), level: Math.floor((line.match(/^\s*/)[0].length) / 2) }); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flush(); out.push({ type: "oli", text: m[1].trim(), level: Math.floor((line.match(/^\s*/)[0].length) / 2) }); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flush(); out.push({ type: "quote", text: m[1].trim() }); continue; }
    if (/^\|/.test(line.trim())) { flush(); if (!/^\|\s*:?-+/.test(line.trim())) out.push({ type: "p", text: line.trim().replace(/^\||\|$/g, "").split("|").map(s => s.trim()).join("   ") }); continue; }
    para.push(line.trim());
  }
  flush();
  return out;
}

// inline **bold**, *italic*, `code`, [text](url) → runs
function inlineRuns(text, base) {
  const runs = [];
  let s = String(text || "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) runs.push(new TextRun({ text: s.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__")) runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
    else if (tok.startsWith("`")) runs.push(new TextRun({ text: tok.slice(1, -1), font: "Courier New", ...base }));
    else runs.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...base }));
    last = m.index + tok.length;
  }
  if (last < s.length) runs.push(new TextRun({ text: s.slice(last), ...base }));
  return runs.length ? runs : [new TextRun({ text: "", ...base })];
}
function plain(text) { return String(text || "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/\*\*|__|`/g, "").replace(/(^|\s)\*([^*]+)\*/g, "$1$2"); }

// ---------- Word ----------
async function toDocx({ title, content, author }) {
  const blocks = parseBlocks(content);
  const children = [];
  const hasH1 = blocks.some(b => b.type === "h1");
  if (title && !hasH1) children.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }));
  blocks.forEach(b => {
    if (b.type === "h1") children.push(new Paragraph({ children: inlineRuns(b.text), heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 } }));
    else if (b.type === "h2") children.push(new Paragraph({ children: inlineRuns(b.text), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 } }));
    else if (b.type === "h3") children.push(new Paragraph({ children: inlineRuns(b.text), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } }));
    else if (b.type === "li") children.push(new Paragraph({ children: inlineRuns(b.text), bullet: { level: Math.min(b.level || 0, 2) }, spacing: { after: 60 } }));
    else if (b.type === "oli") children.push(new Paragraph({ children: inlineRuns(b.text), numbering: { reference: "nums", level: Math.min(b.level || 0, 2) }, spacing: { after: 60 } }));
    else if (b.type === "quote") children.push(new Paragraph({ children: inlineRuns(b.text, { italics: true }), indent: { left: 720 }, spacing: { after: 120 } }));
    else if (b.type === "code") children.push(new Paragraph({ children: [new TextRun({ text: b.text, font: "Courier New", size: 20 })] }));
    else if (b.type === "hr") children.push(new Paragraph({ text: "", border: { bottom: { color: "BBBBBB", space: 1, style: "single", size: 6 } } }));
    else children.push(new Paragraph({ children: inlineRuns(b.text), spacing: { after: 160 } }));
  });
  const doc = new Document({
    creator: author || "Our Voice Lab",
    title: title || "Untitled",
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", run: { size: 48, bold: true, color: "1c2430" }, paragraph: { spacing: { after: 240 } } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: "0a5b73" } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: "1c2430" } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: "39414d" } }
      ]
    },
    numbering: { config: [{ reference: "nums", levels: [0, 1, 2].map(l => ({ level: l, format: "decimal", text: `%${l + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } } })) }] },
    sections: [{ properties: {}, children }]
  });
  return Packer.toBuffer(doc);
}

// ---------- PowerPoint ----------
// Every H1/H2 starts a new slide; body lines become bullets. Long slides spill over.
const MAX_LINES = 9;
function slidesFromBlocks(blocks, fallbackTitle) {
  const slides = [];
  let cur = null;
  const start = (t) => { cur = { title: t, lines: [] }; slides.push(cur); };
  blocks.forEach(b => {
    if (b.type === "h1" || b.type === "h2") { start(plain(b.text)); return; }
    if (b.type === "hr") { if (cur && cur.lines.length) start(cur.title + " (cont.)"); return; }
    if (!cur) start(fallbackTitle || "Untitled");
    if (b.type === "h3") cur.lines.push({ text: plain(b.text), bold: true, level: 0 });
    else if (b.type === "li" || b.type === "oli") cur.lines.push({ text: plain(b.text), bullet: true, level: Math.min(b.level || 0, 2) });
    else if (b.type === "quote") cur.lines.push({ text: "“" + plain(b.text) + "”", italic: true, level: 0 });
    else if (b.type === "code") cur.lines.push({ text: b.text, mono: true, level: 0 });
    else cur.lines.push({ text: plain(b.text), level: 0 });
  });
  // spill long slides
  const out = [];
  slides.forEach(s => {
    if (s.lines.length <= MAX_LINES) { out.push(s); return; }
    for (let i = 0; i < s.lines.length; i += MAX_LINES) out.push({ title: s.title + (i ? " (cont.)" : ""), lines: s.lines.slice(i, i + MAX_LINES) });
  });
  return out;
}
async function toPptx({ title, content, author }) {
  if (!PptxGenJS) throw new Error("PowerPoint export isn't installed on the server (pptxgenjs).");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = author || "Our Voice Lab";
  pptx.title = title || "Untitled";
  const NAVY = "1c2430", TEAL = "0a5b73", INK = "1c2430", MUTED = "5d6675";
  // title slide
  const t = pptx.addSlide();
  t.background = { color: NAVY };
  t.addText(title || "Untitled", { x: 0.6, y: 1.6, w: 8.8, h: 1.6, fontFace: "Calibri", fontSize: 36, bold: true, color: "FFFFFF", valign: "middle" });
  t.addText("Prepared with Our Voice Lab", { x: 0.6, y: 3.4, w: 8.8, h: 0.5, fontFace: "Calibri", fontSize: 14, color: "C9D1DA" });
  const slides = slidesFromBlocks(parseBlocks(content), title);
  slides.forEach(s => {
    const sl = pptx.addSlide();
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.12, fill: { color: TEAL }, line: { color: TEAL } });
    sl.addText(s.title, { x: 0.5, y: 0.35, w: 9, h: 0.9, fontFace: "Calibri", fontSize: 26, bold: true, color: INK, valign: "middle" });
    const lines = s.lines.length ? s.lines : [{ text: "" }];
    const runs = lines.map(l => ({
      text: l.text,
      options: {
        bullet: l.bullet ? { indent: 18 } : false, indentLevel: l.level || 0,
        bold: !!l.bold, italic: !!l.italic, fontFace: l.mono ? "Courier New" : "Calibri",
        fontSize: lines.length > 6 ? 14 : 16, color: l.bold ? TEAL : INK, breakLine: true, paraSpaceAfter: 6
      }
    }));
    sl.addText(runs, { x: 0.5, y: 1.35, w: 9, h: 3.9, valign: "top", fontFace: "Calibri", color: INK });
    sl.addText("Our Voice Lab", { x: 0.5, y: 5.25, w: 9, h: 0.3, fontFace: "Calibri", fontSize: 9, color: MUTED, align: "right" });
  });
  return pptx.write({ outputType: "nodebuffer" });
}

function safeFilename(title, ext) {
  const base = String(title || "asset").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "asset";
  return base + "." + ext;
}

module.exports = { toDocx, toPptx, parseBlocks, safeFilename };
