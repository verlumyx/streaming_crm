export const streamingConfig = {
  logoPath: 'images/streaming',
  /** Catalogue preloaded into every newly created company. */
  defaultServices: [
    { name: 'Netflix', slug: 'netflix', maxProfiles: 5 },
    { name: 'Disney+', slug: 'disneyplus', maxProfiles: 7 },
    { name: 'Max', slug: 'max', maxProfiles: 5 },
    { name: 'Prime Video', slug: 'primevideo', maxProfiles: 6 },
    { name: 'Spotify', slug: 'spotify', maxProfiles: 6 },
    { name: 'YouTube Premium', slug: 'youtube', maxProfiles: 5 },
    { name: 'Crunchyroll', slug: 'crunchyroll', maxProfiles: 4 },
    { name: 'Apple TV+', slug: 'appletv', maxProfiles: 6 },
    { name: 'Paramount+', slug: 'paramountplus', maxProfiles: 6 },
  ],
} as const;

export function serviceLogoUrl(slug: string): string {
  return `/${streamingConfig.logoPath}/${slug}.svg`;
}
