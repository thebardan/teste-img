export interface LayoutInput {
  headline: string
  benefits: string[]
  cta: string
  hasImage: boolean
  hasLogo: boolean
  hasQr: boolean
  hasSpecs?: boolean
  orientation: 'landscape' | 'portrait'
}

export interface Zone {
  x: number
  y: number
  width: number
  height: number
}

export interface ContentAdaptations {
  headlineLines: 1 | 2
  benefitSpacing: 'generous' | 'normal' | 'compact'
  ctaWidth: 'compact' | 'normal' | 'wide'
}

export interface ComputedLayout {
  composition: string
  zones: Record<string, Zone>
  margins: {
    outer: number
    section: number
    inner: number
  }
  contentAdaptations: ContentAdaptations
}

const PHI = 1.618
const PHI_MINOR = 100 / PHI  // ~61.8%
const PHI_MAJOR = 100 - PHI_MINOR  // ~38.2%

const MARGINS = {
  outer: 4,
  section: 3,
  inner: 2,
}

function computeAdaptations(input: LayoutInput): ContentAdaptations {
  const wordCount = input.headline.trim().split(/\s+/).length
  const headlineLines: 1 | 2 = wordCount > 5 ? 2 : 1

  const benefitCount = input.benefits.length
  let benefitSpacing: 'generous' | 'normal' | 'compact'
  if (benefitCount <= 3) {
    benefitSpacing = 'generous'
  } else if (benefitCount <= 5) {
    benefitSpacing = 'normal'
  } else {
    benefitSpacing = 'compact'
  }

  const ctaWordCount = input.cta.trim().split(/\s+/).length
  let ctaWidth: 'compact' | 'normal' | 'wide'
  if (ctaWordCount <= 2) {
    ctaWidth = 'compact'
  } else if (ctaWordCount <= 4) {
    ctaWidth = 'normal'
  } else {
    ctaWidth = 'wide'
  }

  return { headlineLines, benefitSpacing, ctaWidth }
}

// Landscape compositions

function asymmetricLeft(input: LayoutInput, adaptations: ContentAdaptations): ComputedLayout {
  const m = MARGINS.outer
  const s = MARGINS.section

  // Image occupies left PHI_MINOR% of width, full bleed
  const imageZone: Zone = {
    x: 0,
    y: 0,
    width: PHI_MINOR,
    height: 100,
  }

  // Text column starts after image zone
  const textX = PHI_MINOR + s
  const textWidth = 100 - textX - m
  const textY = m
  const textHeight = 100 - 2 * m

  // Logo at top of text column
  const logoHeight = 8
  const logoZone: Zone = {
    x: textX,
    y: textY,
    width: textWidth,
    height: logoHeight,
  }

  // Headline below logo
  const headlineY = textY + logoHeight + MARGINS.inner
  const headlineHeight = adaptations.headlineLines === 2 ? 18 : 10
  const headlineZone: Zone = {
    x: textX,
    y: headlineY,
    width: textWidth,
    height: headlineHeight,
  }

  // Benefits below headline
  const benefitsY = headlineY + headlineHeight + MARGINS.inner
  const benefitsBottom = textY + textHeight - 14 - MARGINS.inner
  const benefitsHeight = Math.max(benefitsBottom - benefitsY, 10)
  const benefitsZone: Zone = {
    x: textX,
    y: benefitsY,
    width: textWidth,
    height: benefitsHeight,
  }

  // CTA at bottom of text column
  const ctaHeight = 10
  const ctaY = textY + textHeight - ctaHeight
  const ctaZone: Zone = {
    x: textX,
    y: ctaY,
    width: textWidth,
    height: ctaHeight,
  }

  return {
    composition: 'asymmetric-left',
    zones: { imageZone, logoZone, headlineZone, benefitsZone, ctaZone },
    margins: MARGINS,
    contentAdaptations: adaptations,
  }
}

function asymmetricRight(input: LayoutInput, adaptations: ContentAdaptations): ComputedLayout {
  const m = MARGINS.outer
  const s = MARGINS.section

  // Text column on the left, PHI_MAJOR% wide
  const textX = m
  const textWidth = PHI_MAJOR - m - s
  const textY = m
  const textHeight = 100 - 2 * m

  // Image on the right
  const imageX = PHI_MAJOR + s
  const imageZone: Zone = {
    x: imageX,
    y: m,
    width: 100 - imageX - m,
    height: 100 - 2 * m,
  }

  // Logo at top of text column
  const logoHeight = 8
  const logoZone: Zone = {
    x: textX,
    y: textY,
    width: textWidth,
    height: logoHeight,
  }

  // Headline below logo
  const headlineY = textY + logoHeight + MARGINS.inner
  const headlineHeight = adaptations.headlineLines === 2 ? 18 : 10
  const headlineZone: Zone = {
    x: textX,
    y: headlineY,
    width: textWidth,
    height: headlineHeight,
  }

  // Benefits below headline
  const benefitsY = headlineY + headlineHeight + MARGINS.inner
  const benefitsBottom = textY + textHeight - 14 - MARGINS.inner
  const benefitsHeight = Math.max(benefitsBottom - benefitsY, 10)
  const benefitsZone: Zone = {
    x: textX,
    y: benefitsY,
    width: textWidth,
    height: benefitsHeight,
  }

  // CTA at bottom of text column
  const ctaHeight = 10
  const ctaY = textY + textHeight - ctaHeight
  const ctaZone: Zone = {
    x: textX,
    y: ctaY,
    width: textWidth,
    height: ctaHeight,
  }

  return {
    composition: 'asymmetric-right',
    zones: { imageZone, logoZone, headlineZone, benefitsZone, ctaZone },
    margins: MARGINS,
    contentAdaptations: adaptations,
  }
}

function editorialLandscape(input: LayoutInput, adaptations: ContentAdaptations): ComputedLayout {
  const m = MARGINS.outer
  const s = MARGINS.section

  // Full-bleed image covers entire canvas
  const imageZone: Zone = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  // Text overlay in the bottom half
  const overlayY = 50
  const overlayHeight = 50

  // Logo in overlay, top area
  const logoHeight = 8
  const logoZone: Zone = {
    x: m,
    y: overlayY + s,
    width: 100 - 2 * m,
    height: logoHeight,
  }

  // Headline below logo
  const headlineY = overlayY + s + logoHeight + MARGINS.inner
  const headlineHeight = adaptations.headlineLines === 2 ? 14 : 8
  const headlineZone: Zone = {
    x: m,
    y: headlineY,
    width: 100 - 2 * m,
    height: headlineHeight,
  }

  // Benefits below headline
  const benefitsY = headlineY + headlineHeight + MARGINS.inner
  const benefitsBottom = 100 - m - 12 - MARGINS.inner
  const benefitsHeight = Math.max(benefitsBottom - benefitsY, 8)
  const benefitsZone: Zone = {
    x: m,
    y: benefitsY,
    width: 100 - 2 * m,
    height: benefitsHeight,
  }

  // CTA at bottom
  const ctaHeight = 10
  const ctaZone: Zone = {
    x: m,
    y: 100 - m - ctaHeight,
    width: 100 - 2 * m,
    height: ctaHeight,
  }

  return {
    composition: 'editorial',
    zones: { imageZone, logoZone, headlineZone, benefitsZone, ctaZone },
    margins: MARGINS,
    contentAdaptations: adaptations,
  }
}

// Portrait compositions

function centeredPortrait(input: LayoutInput, adaptations: ContentAdaptations): ComputedLayout {
  const m = MARGINS.outer
  const s = MARGINS.section

  // Image occupies top 48%
  const imageZone: Zone = {
    x: m,
    y: m,
    width: 100 - 2 * m,
    height: 48 - m,
  }

  // Logo below image
  const contentY = 48 + s
  const logoHeight = 8
  const logoZone: Zone = {
    x: m,
    y: contentY,
    width: 100 - 2 * m,
    height: logoHeight,
  }

  // Headline below logo
  const headlineY = contentY + logoHeight + MARGINS.inner
  const headlineHeight = adaptations.headlineLines === 2 ? 14 : 8
  const headlineZone: Zone = {
    x: m,
    y: headlineY,
    width: 100 - 2 * m,
    height: headlineHeight,
  }

  // Benefits below headline
  const benefitsY = headlineY + headlineHeight + MARGINS.inner
  const benefitsBottom = 100 - m - 12 - MARGINS.inner
  const benefitsHeight = Math.max(benefitsBottom - benefitsY, 8)
  const benefitsZone: Zone = {
    x: m,
    y: benefitsY,
    width: 100 - 2 * m,
    height: benefitsHeight,
  }

  // CTA at bottom
  const ctaHeight = 10
  const ctaZone: Zone = {
    x: m,
    y: 100 - m - ctaHeight,
    width: 100 - 2 * m,
    height: ctaHeight,
  }

  return {
    composition: 'centered',
    zones: { imageZone, logoZone, headlineZone, benefitsZone, ctaZone },
    margins: MARGINS,
    contentAdaptations: adaptations,
  }
}

function splitHorizontalPortrait(input: LayoutInput, adaptations: ContentAdaptations): ComputedLayout {
  const m = MARGINS.outer
  const s = MARGINS.section

  // Image top 50%
  const imageZone: Zone = {
    x: m,
    y: m,
    width: 100 - 2 * m,
    height: 50 - m,
  }

  // Text bottom 50%
  const textY = 50 + s
  const textHeight = 50 - s - m

  const logoHeight = 8
  const logoZone: Zone = {
    x: m,
    y: textY,
    width: 100 - 2 * m,
    height: logoHeight,
  }

  const headlineY = textY + logoHeight + MARGINS.inner
  const headlineHeight = adaptations.headlineLines === 2 ? 12 : 7
  const headlineZone: Zone = {
    x: m,
    y: headlineY,
    width: 100 - 2 * m,
    height: headlineHeight,
  }

  const benefitsY = headlineY + headlineHeight + MARGINS.inner
  const benefitsBottom = 100 - m - 10 - MARGINS.inner
  const benefitsHeight = Math.max(benefitsBottom - benefitsY, 8)
  const benefitsZone: Zone = {
    x: m,
    y: benefitsY,
    width: 100 - 2 * m,
    height: benefitsHeight,
  }

  const ctaHeight = 8
  const ctaZone: Zone = {
    x: m,
    y: 100 - m - ctaHeight,
    width: 100 - 2 * m,
    height: ctaHeight,
  }

  return {
    composition: 'split-horizontal',
    zones: { imageZone, logoZone, headlineZone, benefitsZone, ctaZone },
    margins: MARGINS,
    contentAdaptations: adaptations,
  }
}

function editorialPortrait(input: LayoutInput, adaptations: ContentAdaptations): ComputedLayout {
  // Same as landscape editorial but portrait-optimized
  return {
    ...editorialLandscape(input, adaptations),
    composition: 'editorial',
  }
}

export class LayoutEngine {
  static compute(input: LayoutInput): ComputedLayout[] {
    const adaptations = computeAdaptations(input)

    if (input.orientation === 'landscape') {
      return [
        asymmetricLeft(input, adaptations),
        asymmetricRight(input, adaptations),
        editorialLandscape(input, adaptations),
      ]
    } else {
      return [
        centeredPortrait(input, adaptations),
        splitHorizontalPortrait(input, adaptations),
        editorialPortrait(input, adaptations),
      ]
    }
  }
}
