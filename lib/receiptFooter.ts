/** Pro-only custom line shown at the bottom of receipt cards (above branding when shown). */
export function resolveReceiptFooterText(isPro: boolean, footer: string): string {
  if (!isPro) {
    return "";
  }
  return footer.trim();
}
