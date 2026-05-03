/**
 * Converts basic Markdown from Metrio AI responses to clean HTML.
 * Handles: **bold**, *italic*, numbered lists, headers, line breaks.
 */
export function formatMetrio(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers: lines starting with ### or ##
    .replace(/^###\s+(.+)$/gm, '<div style="font-weight:800;font-size:14px;margin:10px 0 4px;color:#0f172a">$1</div>')
    .replace(/^##\s+(.+)$/gm, '<div style="font-weight:800;font-size:15px;margin:12px 0 6px;color:#0f172a">$1</div>')
    // Numbered lists: 1. text
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="color:#8b5cf6;font-weight:700;flex-shrink:0">$1.</span><span>$2</span></div>')
    // Bullet points: - text
    .replace(/^[-•]\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="color:#8b5cf6;flex-shrink:0">•</span><span>$1</span></div>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0">')
    // Double newlines = paragraph break
    .replace(/\n\n/g, '<div style="margin-top:10px"></div>')
    // Single newlines = line break
    .replace(/\n/g, '<br>');

  return html;
}
