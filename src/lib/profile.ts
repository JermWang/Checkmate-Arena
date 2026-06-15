// Shared profile display helpers.

/** Short wallet label, e.g. 4c48...vPPT */
export function shortWallet(wallet?: string | null, head = 4, tail = 4): string {
  if (!wallet) return "—";
  if (wallet.length <= head + tail + 1) return wallet;
  return `${wallet.slice(0, head)}…${wallet.slice(-tail)}`;
}

/** Human display name: username if set, else a short wallet. */
export function displayName(username?: string | null, wallet?: string | null): string {
  if (username && username.trim()) return username.trim();
  return shortWallet(wallet);
}

/**
 * Avatar URL with a deterministic generated fallback so every wallet always has
 * a picture even before the user sets one. DiceBear is a stateless SVG service.
 */
export function avatarUrl(avatar?: string | null, seed?: string | null): string {
  if (avatar && avatar.trim()) return avatar.trim();
  const s = encodeURIComponent(seed || "anon");
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${s}`;
}

/** A set of generated avatar presets a user can pick from in the editor. */
export function avatarPresets(seed: string): { label: string; url: string }[] {
  const styles: [string, string][] = [
    ["Bot", "bottts-neutral"],
    ["Pixel", "pixel-art"],
    ["Identicon", "identicon"],
    ["Shapes", "shapes"],
    ["Rings", "rings"],
    ["Glass", "glass"],
  ];
  return styles.map(([label, style]) => ({
    label,
    url: `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`,
  }));
}
