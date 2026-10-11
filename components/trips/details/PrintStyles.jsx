/**
 * Print / Save-as-PDF stylesheet for the trip details page.
 *  - hides the app chrome (sidebar, top bar, toasts) and lets the content use the full page width;
 *  - always prints in LIGHT colours, even when the screen is in dark mode (dark pages waste ink
 *    and are hard to read on paper) by re-pointing the theme tokens;
 *  - keeps gradients/coloured chips (print-color-adjust) so the header isn't white-on-white.
 * The rest (all days visible, hidden buttons, no page-breaks inside cards) is done with Tailwind
 * `print:` utilities on the components themselves.
 */
const css = `
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }

  .app-shell aside,
  .app-shell > div > header,
  [data-sonner-toaster] { display: none !important; }
  .app-shell > div { padding-left: 0 !important; }
  .app-shell main { max-width: none !important; padding: 0 !important; }

  :root, :root.dark, .dark {
    --background: #ffffff; --surface: #ffffff; --surface-muted: #f3f4f6; --border: #d9dee7;
    --foreground: #0f172a; --muted-foreground: #475569;
    --primary: #4f46e5; --primary-soft: #eef0ff;
    --success: #059669; --success-soft: #e6f6ef; --info: #2563eb; --info-soft: #e8f0fe;
    --warning: #d97706; --warning-soft: #fdf3e3; --danger: #dc2626; --danger-soft: #fdecec;
    --card-shadow: none; --pop-shadow: none;
  }
  #trip-print-area, #trip-print-area * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export default function PrintStyles() {
  return <style>{css}</style>;
}
