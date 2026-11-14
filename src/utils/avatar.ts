/**
 * Built-in SVG Avatar Generators & Client-Side Image Compression
 * Avoids fragile third-party avatar hosts and keeps uploaded photos compact for Firestore.
 */

const AVATAR_PALETTES = [
  ['#4F46E5', '#312E81'], // Indigo
  ['#0D9488', '#134E4A'], // Teal
  ['#0284C7', '#0C4A6E'], // Sky
  ['#7C3AED', '#4C1D95'], // Violet
  ['#059669', '#064E3B'], // Emerald
  ['#D97706', '#78350F'], // Amber
  ['#E11D48', '#881337'], // Rose
  ['#334155', '#0F172A'], // Slate
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function createMonogramAvatar(name: string, paletteIndex?: number): string {
  const cleanName = (name || 'U').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

  const idx = paletteIndex !== undefined ? paletteIndex % AVATAR_PALETTES.length : hashString(cleanName) % AVATAR_PALETTES.length;
  const [c1, c2] = AVATAR_PALETTES[idx];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="28" fill="url(#g)"/>
    <text x="60" y="64" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700">${initials.replace(/[<>&"']/g, '')}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createRoomIconAvatar(seed: string, label?: string): string {
  const idx = hashString(seed) % AVATAR_PALETTES.length;
  const [c1, c2] = AVATAR_PALETTES[idx];
  const letter = (label || seed || 'C').trim().slice(0, 1).toUpperCase().replace(/[<>&"']/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="28" fill="url(#rg)"/>
    <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
    <text x="60" y="63" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="42" font-weight="700">${letter}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getPresetAvatars(displayName: string) {
  return [
    { label: 'نيلي', url: createMonogramAvatar(displayName, 0) },
    { label: 'فيروزي', url: createMonogramAvatar(displayName, 1) },
    { label: 'سماوي', url: createMonogramAvatar(displayName, 2) },
    { label: 'بنفسجي', url: createMonogramAvatar(displayName, 3) },
    { label: 'زمردي', url: createMonogramAvatar(displayName, 4) },
    { label: 'كهرماني', url: createMonogramAvatar(displayName, 5) },
    { label: 'ياقوتي', url: createMonogramAvatar(displayName, 6) },
    { label: 'داكن', url: createMonogramAvatar(displayName, 7) },
  ];
}

export function compressImageFile(
  file: File,
  maxDimension = 360,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        let currentQuality = quality;
        let compressed = canvas.toDataURL('image/jpeg', currentQuality);
        while (compressed.length > 440000 && currentQuality > 0.35) {
          currentQuality = Math.max(0.35, currentQuality - 0.15);
          compressed = canvas.toDataURL('image/jpeg', currentQuality);
        }
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
