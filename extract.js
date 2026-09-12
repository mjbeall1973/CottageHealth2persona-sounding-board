// extract.js — turn an uploaded file of (almost) any kind into plain text.
// Word, PowerPoint, Excel, OpenDocument, PDF, plain text, Markdown, CSV, HTML, JSON, RTF.
// Images are passed back as images so the model can look at them directly.

const path = require("path");
const pdfParse = require("pdf-parse");
let officeparser = null;
try { officeparser = require("officeparser"); } catch (e) { /* optional at runtime */ }

const OFFICE_EXT = new Set(["docx", "pptx", "xlsx", "odt", "odp", "ods"]);
const TEXT_EXT = new Set(["txt", "md", "markdown", "csv", "tsv", "json", "html", "htm", "xml", "rtf", "log"]);
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const LEGACY_EXT = new Set(["doc", "ppt", "xls"]);

function extOf(name) { return (path.extname(name || "").slice(1) || "").toLowerCase(); }

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
}
function stripRtf(rtf) {
  return String(rtf).replace(/\{\\\*[^{}]*\}/g, "").replace(/\\par[d]?/g, "\n").replace(/\\'[0-9a-f]{2}/g, "").replace(/\\[a-z]+-?\d* ?/g, "").replace(/[{}]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
function tidy(t) { return String(t || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }

function kindLabel(ext, mime) {
  if (ext === "docx" || ext === "odt") return "Word document";
  if (ext === "pptx" || ext === "odp") return "Presentation";
  if (ext === "xlsx" || ext === "ods" || ext === "csv" || ext === "tsv") return "Spreadsheet";
  if (ext === "pdf" || mime === "application/pdf") return "PDF";
  if (IMAGE_MIME.has(mime)) return "Image";
  return "Text file";
}

// Returns { kind, label, text, pages?, image?: {data, mediaType}, warning? }
async function extractFile({ buffer, originalname, mimetype }) {
  const ext = extOf(originalname);
  const mime = (mimetype || "").toLowerCase();
  const label = kindLabel(ext, mime);

  if (IMAGE_MIME.has(mime)) {
    return { kind: "image", label, text: "", image: { data: buffer.toString("base64"), mediaType: mime } };
  }
  if (ext === "pdf" || mime === "application/pdf") {
    const parsed = await pdfParse(buffer);
    const text = tidy(parsed.text);
    return { kind: "pdf", label, text, pages: parsed.numpages || null,
      warning: text.length < 40 ? "This PDF has little or no extractable text — it may be a scan or a designed graphic." : "" };
  }
  if (OFFICE_EXT.has(ext)) {
    if (!officeparser) throw new Error("Office file support isn't installed on the server (officeparser).");
    const r = await officeparser.parseOffice(buffer, { outputErrorToConsole: false, newlineDelimiter: "\n" });
    const text = tidy(typeof r === "string" ? r : (typeof r.toText === "function" ? r.toText() : (r.text || "")));
    return { kind: ext, label, text, warning: text.length < 20 ? "That file didn't contain much readable text." : "" };
  }
  if (LEGACY_EXT.has(ext)) {
    throw new Error(`Old-style .${ext} files aren't supported. Open it in Word/PowerPoint/Excel and save as .${ext}x, then upload again.`);
  }
  if (TEXT_EXT.has(ext) || mime.startsWith("text/") || mime === "application/json") {
    const raw = buffer.toString("utf8");
    let text = raw;
    if (ext === "html" || ext === "htm" || mime === "text/html") text = stripHtml(raw);
    else if (ext === "rtf" || mime === "application/rtf" || mime === "text/rtf") text = stripRtf(raw);
    return { kind: "text", label, text: tidy(text) };
  }
  // last resort: if it looks like text, treat it as text
  const sample = buffer.slice(0, 4000).toString("utf8");
  const printable = sample.replace(/[^\x09\x0a\x0d\x20-\x7e -￿]/g, "").length;
  if (sample.length && printable / sample.length > 0.9) return { kind: "text", label: "Text file", text: tidy(buffer.toString("utf8")) };
  throw new Error(`Couldn't read a .${ext || "?"} file. Try Word (.docx), PowerPoint (.pptx), Excel (.xlsx), PDF, text, or an image.`);
}

const ACCEPT = ".pdf,.docx,.pptx,.xlsx,.odt,.odp,.ods,.txt,.md,.csv,.tsv,.json,.html,.htm,.rtf,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

module.exports = { extractFile, ACCEPT, IMAGE_MIME };
