export interface TypeScale {
  hero: number
  headline: number
  subtitle: number
  body: number
  caption: number
  micro: number
}

export function generateTypeScale(baseSize: number, ratio: number): TypeScale {
  return {
    hero: Math.round(baseSize * ratio ** 4 * 10) / 10,
    headline: Math.round(baseSize * ratio ** 3 * 10) / 10,
    subtitle: Math.round(baseSize * ratio ** 2 * 10) / 10,
    body: baseSize,
    caption: Math.round((baseSize / ratio) * 10) / 10,
    micro: Math.round((baseSize / ratio ** 2) * 10) / 10,
  }
}

export interface FontPairing {
  display: string
  displayWeight: number
  body: string
  bodyWeight: number
}

export const FONT_PAIRINGS: Record<string, FontPairing> = {
  tech:        { display: 'Montserrat',       displayWeight: 700, body: 'Inter',          bodyWeight: 400 },
  premium:     { display: 'Playfair Display', displayWeight: 700, body: 'Source Sans 3',  bodyWeight: 400 },
  industrial:  { display: 'Oswald',           displayWeight: 700, body: 'Open Sans',      bodyWeight: 400 },
  lifestyle:   { display: 'Poppins',          displayWeight: 600, body: 'Nunito',         bodyWeight: 400 },
  corporate:   { display: 'Inter',            displayWeight: 700, body: 'Inter',          bodyWeight: 400 },
  editorial:   { display: 'DM Serif Display', displayWeight: 400, body: 'DM Sans',        bodyWeight: 400 },
}

const CATEGORY_PAIRING_MAP: Record<string, string> = {
  gamer: 'tech', gaming: 'tech', 'periféric': 'tech', mouse: 'tech', teclado: 'tech',
  áudio: 'tech', fone: 'tech', headphone: 'tech', speaker: 'tech',
  smartphone: 'premium', celular: 'premium', phone: 'premium',
  notebook: 'corporate', tablet: 'corporate', computador: 'corporate',
  câmera: 'editorial', segurança: 'editorial',
  fitness: 'tech', esporte: 'tech', smartwatch: 'tech',
  ferramenta: 'industrial', tool: 'industrial',
  cozinha: 'lifestyle', eletrodoméstico: 'lifestyle', eletroportát: 'lifestyle',
  'smart home': 'editorial',
}

export function getFontPairing(category: string): FontPairing {
  const cat = category.toLowerCase()
  for (const [keyword, pairingKey] of Object.entries(CATEGORY_PAIRING_MAP)) {
    if (cat.includes(keyword)) return FONT_PAIRINGS[pairingKey]
  }
  return FONT_PAIRINGS.corporate
}

export const SCALE_RATIOS = {
  majorSecond: 1.125,
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
} as const
