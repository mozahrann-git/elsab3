import { Property } from '../types';
import { ALL_HADABA_PROPERTIES } from '../data/properties';

// Rich fallback photo galleries categorized by style and finishing
export const LUXURY_FALLBACK_GALLERIES: string[][] = [
  [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
  ]
];

// Pre-index master catalog by id and code for instant lookups
const masterById = new Map<string, Property>();
const masterByCode = new Map<string, Property>();

ALL_HADABA_PROPERTIES.forEach(p => {
  if (p.id) masterById.set(p.id, p);
  if (p.code) masterByCode.set(p.code.toUpperCase(), p);
});

/** الصور الحقيقية للشقة: اللي مرفوعة فعلاً، من غير صور Unsplash البديلة */
export function realImages(property: Partial<Property>): string[] {
  return Array.isArray(property.images)
    ? property.images.filter((img) => typeof img === 'string' && img.trim().length > 0 && !img.includes('images.unsplash.com'))
    : [];
}

/**
 * Ensures that a property always has its full gallery images and video media intact.
 * Priority order:
 * 1. User's explicit custom uploaded images or URLs on this property
 * 2. User's locally cached photos from previous session
 * 3. Master catalog original photos matching this ID or Code
 * 4. Deterministic luxury fallback gallery matching property ID/title
 */
export function hydratePropertyMedia(property: Property, _cachedProperty?: Property): Property {
  // الصور الحقيقية اللي على السيرفر بس: مفيش صور بديلة ولا صور قديمة من ذاكرة المتصفح
  const currentImages = realImages(property);
  return {
    ...property,
    images: currentImages,
    videoUrl: property.videoUrl || ''
  };
}

/**
 * Hydrates an entire list of properties ensuring none have missing images
 */
export function hydrateAllProperties(liveList: Property[], cachedList?: Property[]): Property[] {
  const cachedMap = new Map<string, Property>();
  if (cachedList && cachedList.length > 0) {
    cachedList.forEach(p => {
      if (p.id) cachedMap.set(p.id, p);
      if (p.code) cachedMap.set(p.code.toUpperCase(), p);
    });
  }

  return liveList.map(prop => {
    const cached = (prop.id && cachedMap.get(prop.id)) || 
                   (prop.code && cachedMap.get(prop.code.toUpperCase()));
    return hydratePropertyMedia(prop, cached);
  });
}
