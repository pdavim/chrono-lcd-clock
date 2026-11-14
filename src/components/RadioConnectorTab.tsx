import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Disc3,
  ExternalLink,
  LogOut,
  Music2,
  Pause,
  Play,
  Radio,
  Search,
  ShieldAlert,
  Tv,
  Volume2,
} from 'lucide-react';
import {
  AlarmWakeMode,
  MediaConfig,
  MediaProvider,
  RadioStation,
  parseAppleMusicEmbedUrl,
  parseSpotifyResource,
  parseYouTubeResource,
  validateDirectStreamUrl,
} from '../utils/media';

interface SpotifyPlaylistItem {
  id: string;
  name: string;
  uri: string;
  externalUrl: string;
  trackCount: number;
  ownerName: string;
}

interface SpotifyAuthStatus {
  configured: boolean;
  connected: boolean;
  profileName: string | null;
  redirectUri?: string;
}

const RADIO_GENRE_TAGS: readonly { id: string; label: string }[] = [
  { id: '80s', label: '80s' },
  { id: 'synthwave', label: 'Synthwave' },
  { id: 'lofi', label: 'Lo-Fi' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'rock', label: 'Classic Rock' },
];

const PROVIDERS: readonly {
  id: MediaProvider;
  label: string;
}[] = [
  { id: MediaProvider.Radio, label: 'Live Radio' },
  { id: MediaProvider.Spotify, label: 'Spotify' },
  { id: MediaProvider.YouTube, label: 'YouTube' },
  { id: MediaProvider.AppleMusic, label: 'Apple Music' },
];

interface RadioConnectorTabProps {
  media: MediaConfig;
  onUpdateMedia: (patch: Partial<MediaConfig>) => void;
  onPlayMediaNow: () => void;
  onPauseMediaNow: () => void;
}

export function RadioConnectorTab({
  media,
  onUpdateMedia,
  onPlayMediaNow,
  onPauseMediaNow,
}: RadioConnectorTabProps) {
  // Radio search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('80s');
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isSearchingRadio, setIsSearchingRadio] = useState<boolean>(false);
  const [radioError, setRadioError] = useState<string | null>(null);
  const [customStreamDraft, setCustomStreamDraft] = useState<string>(
    media.customRadioUrl
  );
  const [customStreamError, setCustomStreamError] = useState<string | null>(null);

  // Connector URL drafts
  const [spotifyDraft, setSpotifyDraft] = useState<string>(media.spotifyInput);
  const [spotifyTitleDraft, setSpotifyTitleDraft] = useState<string>(
    media.spotifyTitle
  );
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  const [youtubeDraft, setYoutubeDraft] = useState<string>(media.youtubeInput);
  const [youtubeTitleDraft, setYoutubeTitleDraft] = useState<string>(
    media.youtubeTitle
  );
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const [appleDraft, setAppleDraft] = useState<string>(media.appleMusicInput);
  const [appleTitleDraft, setAppleTitleDraft] = useState<string>(
    media.appleMusicTitle
  );
  const [appleError, setAppleError] = useState<string | null>(null);

  // Spotify OAuth state
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyAuthStatus | null>(
    null
  );
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylistItem[]>(
    []
  );
  const [spotifyOAuthNotice, setSpotifyOAuthNotice] = useState<string | null>(
    null
  );

  const fetchRadioStations = useCallback(async (q: string, tag: string) => {
    setIsSearchingRadio(true);
    setRadioError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (tag.trim()) params.set('tag', tag.trim());
      const resp = await fetch(`/api/radio/search?${params.toString()}`);
      if (!resp.ok) {
        throw new Error(`Directory status ${resp.status}`);
      }
      const data = (await resp.json()) as {
        stations?: RadioStation[];
        error?: string;
      };
      setStations(Array.isArray(data.stations) ? data.stations : []);
      if (data.error && (!data.stations || data.stations.length === 0)) {
        setRadioError(data.error);
      }
    } catch {
      setRadioError(
        'Could not reach live radio directory. You can also paste any HTTPS stream URL below.'
      );
    } finally {
      setIsSearchingRadio(false);
    }
  }, []);

  useEffect(() => {
    if (media.activeProvider === MediaProvider.Radio && stations.length === 0) {
      void fetchRadioStations('', selectedTag);
    }
  }, [media.activeProvider, stations.length, selectedTag, fetchRadioStations]);

  const loadSpotifyAccount = useCallback(async () => {
    try {
      const resp = await fetch('/api/spotify/status');
      if (!resp.ok) return;
      const status = (await resp.json()) as SpotifyAuthStatus;
      setSpotifyStatus(status);
      if (status.connected) {
        const plResp = await fetch('/api/spotify/playlists');
        if (plResp.ok) {
          const plData = (await plResp.json()) as {
            playlists?: SpotifyPlaylistItem[];
          };
          setSpotifyPlaylists(plData.playlists ?? []);
        }
      } else {
        setSpotifyPlaylists([]);
      }
    } catch {
      // Ignore network status failure
    }
  }, []);

  useEffect(() => {
    if (media.activeProvider === MediaProvider.Spotify) {
      void loadSpotifyAccount();
    }
  }, [media.activeProvider, loadSpotifyAccount]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setSpotifyOAuthNotice(null);
        void loadSpotifyAccount();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadSpotifyAccount]);

  const handleConnectSpotifyOAuth = async () => {
    setSpotifyOAuthNotice(null);
    try {
      const resp = await fetch('/api/spotify/auth-url');
      const data = (await resp.json()) as { url?: string; error?: string };
      if (!resp.ok || !data.url) {
        setSpotifyOAuthNotice(
          data.error || 'Spotify OAuth is not configured on this server.'
        );
        return;
      }
      const popup = window.open(
        data.url,
        'spotify_oauth_popup',
        'width=540,height=700'
      );
      if (!popup) {
        setSpotifyOAuthNotice(
          'Popup was blocked by the browser. Allow popups for this site and try again.'
        );
      }
    } catch {
      setSpotifyOAuthNotice('Unable to start Spotify authorization.');
    }
  };

  const handleDisconnectSpotify = async () => {
    try {
      await fetch('/api/spotify/logout', { method: 'POST' });
      setSpotifyPlaylists([]);
      void loadSpotifyAccount();
    } catch {
      // Ignore logout failure
    }
  };

  const handleSelectStation = (station: RadioStation) => {
    onUpdateMedia({
      activeProvider: MediaProvider.Radio,
      radioStation: station,
    });
    onPlayMediaNow();
  };

  const handleApplyCustomStream = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const valid = validateDirectStreamUrl(customStreamDraft);
    if (!valid) {
      setCustomStreamError('Enter a valid https:// or http:// audio stream URL.');
      return;
    }
    setCustomStreamError(null);
    let hostLabel = 'Custom Radio Stream';
    try {
      hostLabel = `Custom (${new URL(valid).hostname})`;
    } catch {
      // Keep default label
    }
    onUpdateMedia({
      activeProvider: MediaProvider.Radio,
      customRadioUrl: valid,
      radioStation: {
        id: `custom-${valid}`,
        name: hostLabel,
        streamUrl: valid,
      },
    });
    onPlayMediaNow();
  };

  const handleApplySpotify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = parseSpotifyResource(spotifyDraft);
    if (!parsed) {
      setSpotifyError(
        'Paste a valid open.spotify.com playlist/album/track link or spotify: URI.'
      );
      return;
    }
    setSpotifyError(null);
    onUpdateMedia({
      activeProvider: MediaProvider.Spotify,
      spotifyInput: spotifyDraft.trim(),
      spotifyTitle:
        spotifyTitleDraft.trim() || `Spotify ${parsed.kind} (${parsed.id.slice(0, 6)})`,
    });
    onPlayMediaNow();
  };

  const handleApplyYouTube = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = parseYouTubeResource(youtubeDraft);
    if (!parsed) {
      setYoutubeError(
        'Paste a valid YouTube or YouTube Music playlist/video link.'
      );
      return;
    }
    setYoutubeError(null);
    onUpdateMedia({
      activeProvider: MediaProvider.YouTube,
      youtubeInput: youtubeDraft.trim(),
      youtubeTitle: youtubeTitleDraft.trim() || 'YouTube Playlist / Radio',
    });
    onPlayMediaNow();
  };

  const handleApplyAppleMusic = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = parseAppleMusicEmbedUrl(appleDraft);
    if (!parsed) {
      setAppleError(
        'Paste a valid music.apple.com playlist, station, or album link.'
      );
      return;
    }
    setAppleError(null);
    onUpdateMedia({
      activeProvider: MediaProvider.AppleMusic,
      appleMusicInput: appleDraft.trim(),
      appleMusicTitle: appleTitleDraft.trim() || `Apple Music ${parsed.kind}`,
    });
    onPlayMediaNow();
  };

  const renderProviderBtnIcon = (id: MediaProvider) => {
    switch (id) {
      case MediaProvider.Spotify:
        return <Disc3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
      case MediaProvider.YouTube:
        return <Tv className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
      case MediaProvider.AppleMusic:
        return <Music2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
      case MediaProvider.Radio:
      default:
        return <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div
      id="panel-radio"
      role="tabpanel"
      aria-labelledby="tab-radio"
      className="flex flex-col gap-4"
    >
      {/* Connector Source Selector */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-200">
          Audio Connector
        </span>
        <div
          role="group"
          aria-label="Audio source connector"
          className="grid grid-cols-2 sm:grid-cols-4 gap-1.5"
        >
          {PROVIDERS.map((item) => {
            const isSelected = media.activeProvider === item.id;
            return (
              <button
                key={item.id}
                id={`provider-${item.id}`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onUpdateMedia({ activeProvider: item.id })}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer settings-focus-outline ${
                  isSelected
                    ? 'settings-accent-solid'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {renderProviderBtnIcon(item.id)}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. LIVE INTERNET RADIO CONNECTOR */}
      {media.activeProvider === MediaProvider.Radio && (
        <div className="flex flex-col gap-3 border-t border-white/8 pt-3.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void fetchRadioStations(searchQuery, '');
            }}
            className="flex items-center gap-2"
          >
            <input
              id="radio-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live stations (e.g. SomaFM, BBC, Synth)..."
              aria-label="Search live internet radio stations"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
            />
            <button
              id="radio-search-btn"
              type="submit"
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer shrink-0"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Search</span>
            </button>
          </form>

          {/* Genre Presets */}
          <div className="grid grid-cols-3 gap-1.5">
            {RADIO_GENRE_TAGS.map((genre) => {
              const isTagActive = selectedTag === genre.id && !searchQuery.trim();
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag(genre.id);
                    void fetchRadioStations('', genre.id);
                  }}
                  className={`min-h-[44px] rounded-xl border px-2.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer settings-focus-outline ${
                    isTagActive
                      ? 'settings-accent-soft'
                      : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {genre.label}
                </button>
              );
            })}
          </div>

          {radioError && (
            <p className="text-[11px] text-amber-300">{radioError}</p>
          )}

          {/* Station Results List */}
          <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-1 settings-scroll">
            {isSearchingRadio ? (
              <p className="py-4 text-center text-xs text-slate-400">
                Scanning live HTTPS radio directory...
              </p>
            ) : stations.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500">
                No stations matched. Try another search or paste a direct stream URL.
              </p>
            ) : (
              stations.map((st) => {
                const isTuned = media.radioStation?.streamUrl === st.streamUrl;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStation(st)}
                    className={`flex min-h-[48px] items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer settings-focus-outline ${
                      isTuned
                        ? 'settings-accent-card'
                        : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{st.name}</p>
                      <p className="truncate text-[11px] text-slate-400">
                        {[
                          st.country,
                          st.tags,
                          st.bitrate ? `${st.bitrate} kbps` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Live Stream'}
                      </p>
                    </div>
                    <span className="flex h-8 items-center gap-1 rounded-lg bg-slate-800/90 px-2.5 text-[11px] font-semibold settings-accent-text shrink-0">
                      {isTuned ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Tuned</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                          <span>Tune</span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Direct Stream URL */}
          <form
            onSubmit={handleApplyCustomStream}
            className="flex flex-col gap-1.5 border-t border-white/8 pt-3"
          >
            <label
              htmlFor="custom-radio-url-input"
              className="text-[11px] font-medium text-slate-400"
            >
              Direct Radio Stream URL (.mp3 / .aac / Icecast)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="custom-radio-url-input"
                type="url"
                value={customStreamDraft}
                onChange={(e) => {
                  setCustomStreamDraft(e.target.value);
                  if (customStreamError) setCustomStreamError(null);
                }}
                placeholder="https://ice1.somafm.com/u80s-128-mp3"
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
              />
              <button
                id="custom-radio-tune-btn"
                type="submit"
                className="h-11 rounded-xl border px-3.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer settings-accent-solid"
              >
                Tune URL
              </button>
            </div>
            {customStreamError && (
              <p className="text-[11px] text-rose-400">{customStreamError}</p>
            )}
          </form>
        </div>
      )}

      {/* 2. SPOTIFY CONNECTOR */}
      {media.activeProvider === MediaProvider.Spotify && (
        <div className="flex flex-col gap-3.5 border-t border-white/8 pt-3.5">
          <form onSubmit={handleApplySpotify} className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="spotify-url-input"
                className="text-xs font-medium text-slate-300"
              >
                Spotify Playlist, Album, or Track URL / URI
              </label>
              <input
                id="spotify-url-input"
                type="text"
                value={spotifyDraft}
                onChange={(e) => {
                  setSpotifyDraft(e.target.value);
                  if (spotifyError) setSpotifyError(null);
                }}
                placeholder="https://open.spotify.com/playlist/..."
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="spotify-title-input"
                type="text"
                maxLength={50}
                value={spotifyTitleDraft}
                onChange={(e) => setSpotifyTitleDraft(e.target.value)}
                placeholder="Display label (e.g. Morning Synth)"
                aria-label="Spotify playlist label"
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
              />
              <button
                id="spotify-play-btn"
                type="submit"
                className="flex h-11 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer settings-accent-solid"
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Load &amp; Play</span>
              </button>
            </div>
            {spotifyError && (
              <p className="text-[11px] text-rose-400">{spotifyError}</p>
            )}
          </form>

          {/* Optional Spotify Account Library OAuth */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200">
                  Spotify Account Playlists
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {spotifyStatus?.connected
                    ? `Connected${spotifyStatus.profileName ? ` as ${spotifyStatus.profileName}` : ''}`
                    : spotifyStatus?.configured
                      ? 'Connect Spotify to pick from your saved playlists'
                      : 'Paste any Spotify URL above, or add SPOTIFY_CLIENT_ID in Secrets for account sync'}
                </p>
              </div>
              {spotifyStatus?.configured && !spotifyStatus.connected && (
                <button
                  id="spotify-oauth-connect-btn"
                  type="button"
                  onClick={handleConnectSpotifyOAuth}
                  className="flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer settings-accent-soft"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Connect</span>
                </button>
              )}
              {spotifyStatus?.connected && (
                <button
                  type="button"
                  onClick={handleDisconnectSpotify}
                  aria-label="Disconnect Spotify"
                  className="flex h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 text-xs text-slate-300 hover:text-white shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            {spotifyOAuthNotice && (
              <p className="text-[11px] text-amber-300">{spotifyOAuthNotice}</p>
            )}

            {spotifyStatus?.connected && spotifyPlaylists.length > 0 && (
              <div className="mt-1 flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-1 settings-scroll">
                {spotifyPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      setSpotifyDraft(pl.externalUrl);
                      setSpotifyTitleDraft(pl.name);
                      onUpdateMedia({
                        activeProvider: MediaProvider.Spotify,
                        spotifyInput: pl.externalUrl,
                        spotifyTitle: pl.name,
                      });
                      onPlayMediaNow();
                    }}
                    className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-left text-xs text-slate-200 hover:border-slate-600 cursor-pointer"
                  >
                    <span className="truncate font-medium">{pl.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {pl.trackCount} tracks
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. YOUTUBE CONNECTOR */}
      {media.activeProvider === MediaProvider.YouTube && (
        <form
          onSubmit={handleApplyYouTube}
          className="flex flex-col gap-2.5 border-t border-white/8 pt-3.5"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="youtube-url-input"
              className="text-xs font-medium text-slate-300"
            >
              YouTube / YouTube Music Playlist or Live Radio URL
            </label>
            <input
              id="youtube-url-input"
              type="text"
              value={youtubeDraft}
              onChange={(e) => {
                setYoutubeDraft(e.target.value);
                if (youtubeError) setYoutubeError(null);
              }}
              placeholder="https://www.youtube.com/playlist?list=... or watch?v=..."
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="youtube-title-input"
              type="text"
              maxLength={50}
              value={youtubeTitleDraft}
              onChange={(e) => setYoutubeTitleDraft(e.target.value)}
              placeholder="Display label (e.g. Lofi Radio)"
              aria-label="YouTube playlist label"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
            />
            <button
              id="youtube-play-btn"
              type="submit"
              className="flex h-11 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer settings-accent-solid"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Load &amp; Play</span>
            </button>
          </div>
          {youtubeError && (
            <p className="text-[11px] text-rose-400">{youtubeError}</p>
          )}
        </form>
      )}

      {/* 4. APPLE MUSIC CONNECTOR */}
      {media.activeProvider === MediaProvider.AppleMusic && (
        <form
          onSubmit={handleApplyAppleMusic}
          className="flex flex-col gap-2.5 border-t border-white/8 pt-3.5"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="apple-music-url-input"
              className="text-xs font-medium text-slate-300"
            >
              Apple Music Playlist, Station, or Album URL
            </label>
            <input
              id="apple-music-url-input"
              type="text"
              value={appleDraft}
              onChange={(e) => {
                setAppleDraft(e.target.value);
                if (appleError) setAppleError(null);
              }}
              placeholder="https://music.apple.com/us/playlist/..."
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="apple-music-title-input"
              type="text"
              maxLength={50}
              value={appleTitleDraft}
              onChange={(e) => setAppleTitleDraft(e.target.value)}
              placeholder="Display label (e.g. 80s Essentials)"
              aria-label="Apple Music playlist label"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
            />
            <button
              id="apple-music-play-btn"
              type="submit"
              className="flex h-11 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer settings-accent-solid"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Open Deck</span>
            </button>
          </div>
          {appleError && (
            <p className="text-[11px] text-rose-400">{appleError}</p>
          )}
        </form>
      )}

      {/* Wake-Up Alarm Audio Routing & Volume */}
      <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-200">
              Wake-Up Alarm Source
            </span>
            <span className="text-[11px] text-slate-400">
              Audio played when Daily Alarm Clock triggers
            </span>
          </div>
          <div
            role="group"
            aria-label="Wake-up alarm audio source"
            className="grid grid-cols-2 gap-1.5 shrink-0"
          >
            <button
              id="wake-mode-tone-btn"
              type="button"
              aria-pressed={media.alarmWakeMode === AlarmWakeMode.RetroTone}
              onClick={() =>
                onUpdateMedia({ alarmWakeMode: AlarmWakeMode.RetroTone })
              }
              className={`h-11 rounded-xl border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                media.alarmWakeMode === AlarmWakeMode.RetroTone
                  ? 'settings-accent-solid'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              Retro Tone
            </button>
            <button
              id="wake-mode-media-btn"
              type="button"
              aria-pressed={media.alarmWakeMode === AlarmWakeMode.Media}
              onClick={() =>
                onUpdateMedia({ alarmWakeMode: AlarmWakeMode.Media })
              }
              className={`h-11 rounded-xl border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                media.alarmWakeMode === AlarmWakeMode.Media
                  ? 'settings-accent-solid'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              Playlist / Radio
            </button>
          </div>
        </div>

        {media.alarmWakeMode === AlarmWakeMode.Media && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-300">
                Backup Wake Tone
              </span>
              <span className="text-[11px] text-slate-400">
                Sound piezo tone if browser blocks stream autoplay
              </span>
            </div>
            <button
              id="alarm-backup-tone-switch"
              type="button"
              role="switch"
              aria-checked={media.alarmBackupTone}
              aria-label="Backup Wake Tone"
              onClick={() =>
                onUpdateMedia({ alarmBackupTone: !media.alarmBackupTone })
              }
              className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                media.alarmBackupTone
                  ? 'settings-accent-soft'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{media.alarmBackupTone ? 'On' : 'Off'}</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
            Radio / Stream Volume
          </span>
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
            <input
              id="media-volume-slider"
              aria-label="Radio and stream volume"
              type="range"
              min={0}
              max={100}
              value={media.volume}
              onChange={(e) =>
                onUpdateMedia({ volume: parseInt(e.target.value, 10) })
              }
              className="h-8 w-28 sm:w-36 settings-range cursor-pointer"
            />
            <span className="w-9 text-right text-xs font-medium text-slate-400 tabular-nums">
              {media.volume}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-300">
            Background Playback
          </span>
          <div className="flex items-center gap-1.5">
            <button
              id="settings-radio-play-btn"
              type="button"
              onClick={onPlayMediaNow}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold cursor-pointer settings-accent-soft"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Play</span>
            </button>
            <button
              id="settings-radio-pause-btn"
              type="button"
              onClick={onPauseMediaNow}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Pause</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
