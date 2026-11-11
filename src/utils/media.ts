export enum MediaProvider {
  Radio = 'radio',
  Spotify = 'spotify',
  YouTube = 'youtube',
  AppleMusic = 'apple-music',
}

export enum AlarmWakeMode {
  RetroTone = 'tone',
  Media = 'media',
}

export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  country?: string;
  tags?: string;
  bitrate?: number;
  homepage?: string;
}

export interface MediaConfig {
  activeProvider: MediaProvider;
  alarmWakeMode: AlarmWakeMode;
  alarmBackupTone: boolean;
  volume: number;
  radioStation: RadioStation | null;
  customRadioUrl: string;
  spotifyInput: string;
  spotifyTitle: string;
  youtubeInput: string;
  youtubeTitle: string;
  appleMusicInput: string;
  appleMusicTitle: string;
}

export const DEFAULT_MEDIA_CONFIG: MediaConfig = {
  activeProvider: MediaProvider.Radio,
  alarmWakeMode: AlarmWakeMode.RetroTone,
  alarmBackupTone: true,
  volume: 75,
  radioStation: null,
  customRadioUrl: '',
  spotifyInput: 'https://open.spotify.com/playlist/37i9dQZF1DX4UtSsGT1Sbe',
  spotifyTitle: 'All Out 80s (Spotify)',
  youtubeInput: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  youtubeTitle: 'YouTube Radio / Playlist',
  appleMusicInput:
    'https://music.apple.com/us/playlist/80s-hits-essentials/pl.97c6f95b0b884bedbcce117f9ea5d54b',
  appleMusicTitle: '80s Hits Essentials (Apple Music)',
};

export interface ParsedSpotifyResource {
  kind: 'playlist' | 'album' | 'track' | 'show' | 'episode';
  id: string;
  uri: string;
  embedUrl: string;
}

const SPOTIFY_KINDS = new Set([
  'playlist',
  'album',
  'track',
  'show',
  'episode',
]);

export function parseSpotifyResource(rawInput: string): ParsedSpotifyResource | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Handle spotify:<kind>:<id> URI
  const uriMatch = trimmed.match(
    /^spotify:(playlist|album|track|show|episode):([A-Za-z0-9]{8,40})$/i
  );
  if (uriMatch) {
    const kind = uriMatch[1].toLowerCase() as ParsedSpotifyResource['kind'];
    const id = uriMatch[2];
    return {
      kind,
      id,
      uri: `spotify:${kind}:${id}`,
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
    };
  }

  // Handle https://open.spotify.com/(intl-xx/)?(embed/)?<kind>/<id>
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host !== 'open.spotify.com' && !host.endsWith('.spotify.com')) {
      return null;
    }

    const segments = url.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !s.toLowerCase().startsWith('intl-') && s.toLowerCase() !== 'embed');

    for (let i = 0; i < segments.length - 1; i += 1) {
      const candidateKind = segments[i].toLowerCase();
      const candidateId = segments[i + 1];
      if (
        SPOTIFY_KINDS.has(candidateKind) &&
        /^[A-Za-z0-9]{8,40}$/.test(candidateId)
      ) {
        const kind = candidateKind as ParsedSpotifyResource['kind'];
        return {
          kind,
          id: candidateId,
          uri: `spotify:${kind}:${candidateId}`,
          embedUrl: `https://open.spotify.com/embed/${kind}/${candidateId}?utm_source=generator&theme=0`,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

export interface ParsedYouTubeResource {
  videoId?: string;
  listId?: string;
  embedUrl: string;
}

export function parseYouTubeResource(rawInput: string): ParsedYouTubeResource | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Bare playlist ID (e.g. PL..., OLAK5uy_..., UU...)
  if (/^(PL|OLAK5uy_|UU|FL|RD)[A-Za-z0-9_-]{10,64}$/.test(trimmed)) {
    return {
      listId: trimmed,
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(trimmed)}&enablejsapi=1&rel=0`,
    };
  }

  // Bare 11-char video ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return {
      videoId: trimmed,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(trimmed)}?enablejsapi=1&rel=0`,
    };
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const isYouTubeHost =
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtu.be' ||
      host === 'youtube-nocookie.com';

    if (!isYouTubeHost) return null;

    const listParam = url.searchParams.get('list')?.trim() || undefined;
    let videoId = url.searchParams.get('v')?.trim() || undefined;

    if (host === 'youtu.be') {
      const seg = url.pathname.split('/').filter(Boolean)[0];
      if (seg && /^[A-Za-z0-9_-]{11}$/.test(seg)) {
        videoId = seg;
      }
    } else if (!videoId) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (
        (parts[0] === 'embed' || parts[0] === 'live' || parts[0] === 'shorts') &&
        parts[1] &&
        parts[1] !== 'videoseries' &&
        /^[A-Za-z0-9_-]{11}$/.test(parts[1])
      ) {
        videoId = parts[1];
      }
    }

    const validList =
      listParam && /^[A-Za-z0-9_-]{6,80}$/.test(listParam) ? listParam : undefined;
    const validVideo =
      videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : undefined;

    if (!validList && !validVideo) return null;

    if (validVideo && validList) {
      return {
        videoId: validVideo,
        listId: validList,
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(validVideo)}?list=${encodeURIComponent(validList)}&enablejsapi=1&rel=0`,
      };
    }

    if (validList) {
      return {
        listId: validList,
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(validList)}&enablejsapi=1&rel=0`,
      };
    }

    return {
      videoId: validVideo,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(validVideo!)}?enablejsapi=1&rel=0`,
    };
  } catch {
    return null;
  }
}

export interface ParsedAppleMusicResource {
  kind: 'playlist' | 'album' | 'station' | 'song';
  embedUrl: string;
}

const APPLE_MUSIC_KINDS = new Set(['playlist', 'album', 'station', 'song']);

export function parseAppleMusicEmbedUrl(
  rawInput: string
): ParsedAppleMusicResource | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host !== 'music.apple.com' && host !== 'embed.music.apple.com') {
      return null;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    // Expected: /{storefront}/{kind}/...
    if (segments.length < 3) return null;
    const kindCandidate = segments[1].toLowerCase();
    if (!APPLE_MUSIC_KINDS.has(kindCandidate)) return null;

    const embedUrl = new URL(url.pathname, 'https://embed.music.apple.com');
    const trackParam = url.searchParams.get('i');
    if (trackParam) {
      embedUrl.searchParams.set('i', trackParam);
    }
    embedUrl.searchParams.set('theme', 'dark');

    return {
      kind: kindCandidate as ParsedAppleMusicResource['kind'],
      embedUrl: embedUrl.toString(),
    };
  } catch {
    return null;
  }
}

export function validateDirectStreamUrl(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getActiveMediaLabel(config: MediaConfig): string {
  switch (config.activeProvider) {
    case MediaProvider.Radio:
      return config.radioStation ? config.radioStation.name : 'Live Radio';
    case MediaProvider.Spotify:
      return config.spotifyTitle || 'Spotify Playlist';
    case MediaProvider.YouTube:
      return config.youtubeTitle || 'YouTube Playlist';
    case MediaProvider.AppleMusic:
      return config.appleMusicTitle || 'Apple Music';
    default:
      return 'Clock Radio';
  }
}

export function sanitizeRadioStation(raw: unknown): RadioStation | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Partial<RadioStation>;
  if (typeof rec.name !== 'string' || typeof rec.streamUrl !== 'string') {
    return null;
  }
  const cleanUrl = validateDirectStreamUrl(rec.streamUrl);
  const cleanName = rec.name.trim().slice(0, 64);
  if (!cleanUrl || !cleanName) return null;

  return {
    id:
      typeof rec.id === 'string' && rec.id.trim()
        ? rec.id.trim()
        : `radio-${cleanName}`,
    name: cleanName,
    streamUrl: cleanUrl,
    country: typeof rec.country === 'string' ? rec.country.slice(0, 32) : '',
    tags: typeof rec.tags === 'string' ? rec.tags.slice(0, 64) : '',
    bitrate:
      typeof rec.bitrate === 'number' && Number.isFinite(rec.bitrate)
        ? Math.max(0, Math.floor(rec.bitrate))
        : 0,
    homepage: typeof rec.homepage === 'string' ? rec.homepage.slice(0, 200) : '',
  };
}

export function sanitizeMediaConfig(raw?: Partial<MediaConfig> | null): MediaConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_MEDIA_CONFIG };
  }

  const activeProvider =
    raw.activeProvider && Object.values(MediaProvider).includes(raw.activeProvider)
      ? raw.activeProvider
      : DEFAULT_MEDIA_CONFIG.activeProvider;

  const alarmWakeMode =
    raw.alarmWakeMode && Object.values(AlarmWakeMode).includes(raw.alarmWakeMode)
      ? raw.alarmWakeMode
      : DEFAULT_MEDIA_CONFIG.alarmWakeMode;

  const volume =
    typeof raw.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.min(100, Math.max(0, Math.round(raw.volume)))
      : DEFAULT_MEDIA_CONFIG.volume;

  return {
    activeProvider,
    alarmWakeMode,
    alarmBackupTone:
      typeof raw.alarmBackupTone === 'boolean'
        ? raw.alarmBackupTone
        : DEFAULT_MEDIA_CONFIG.alarmBackupTone,
    volume,
    radioStation: sanitizeRadioStation(raw.radioStation),
    customRadioUrl:
      typeof raw.customRadioUrl === 'string'
        ? raw.customRadioUrl.trim().slice(0, 400)
        : DEFAULT_MEDIA_CONFIG.customRadioUrl,
    spotifyInput:
      typeof raw.spotifyInput === 'string' && raw.spotifyInput.trim()
        ? raw.spotifyInput.trim().slice(0, 300)
        : DEFAULT_MEDIA_CONFIG.spotifyInput,
    spotifyTitle:
      typeof raw.spotifyTitle === 'string' && raw.spotifyTitle.trim()
        ? raw.spotifyTitle.trim().slice(0, 64)
        : DEFAULT_MEDIA_CONFIG.spotifyTitle,
    youtubeInput:
      typeof raw.youtubeInput === 'string' && raw.youtubeInput.trim()
        ? raw.youtubeInput.trim().slice(0, 300)
        : DEFAULT_MEDIA_CONFIG.youtubeInput,
    youtubeTitle:
      typeof raw.youtubeTitle === 'string' && raw.youtubeTitle.trim()
        ? raw.youtubeTitle.trim().slice(0, 64)
        : DEFAULT_MEDIA_CONFIG.youtubeTitle,
    appleMusicInput:
      typeof raw.appleMusicInput === 'string' && raw.appleMusicInput.trim()
        ? raw.appleMusicInput.trim().slice(0, 350)
        : DEFAULT_MEDIA_CONFIG.appleMusicInput,
    appleMusicTitle:
      typeof raw.appleMusicTitle === 'string' && raw.appleMusicTitle.trim()
        ? raw.appleMusicTitle.trim().slice(0, 64)
        : DEFAULT_MEDIA_CONFIG.appleMusicTitle,
  };
}
