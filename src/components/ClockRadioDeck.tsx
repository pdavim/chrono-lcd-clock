import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Disc3,
  Music2,
  Pause,
  Play,
  Radio,
  SlidersHorizontal,
  Tv,
  Volume2,
} from 'lucide-react';
import {
  MediaConfig,
  MediaProvider,
  getActiveMediaLabel,
  parseAppleMusicEmbedUrl,
  parseSpotifyResource,
  parseYouTubeResource,
} from '../utils/media';
import {
  GRADUAL_ALARM_RAMP_MS,
  computeGradualVolumeScale,
} from '../utils/sound';
import { shouldShowRadioControlBar } from '../utils/time';

export interface MediaPlaybackCommand {
  key: number;
  action: 'play' | 'pause' | 'wake-alarm';
}

interface SpotifyEmbedController {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  addListener: (
    event: string,
    cb: (payload: { data?: { isPaused?: boolean } }) => void
  ) => void;
  destroy?: () => void;
}

interface SpotifyIframeApi {
  createController: (
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number; theme?: string },
    callback: (controller: SpotifyEmbedController) => void
  ) => void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
    __chrono80SpotifyApi?: SpotifyIframeApi;
  }
}

interface ClockRadioDeckProps {
  media: MediaConfig;
  showRadioControl: boolean;
  gradualAlarmVolume: boolean;
  isUiHidden: boolean;
  isAutoDimmed: boolean;
  isSettingsOpen: boolean;
  playbackCommand: MediaPlaybackCommand | null;
  onChangeVolume: (volume: number) => void;
  onOpenRadioSettings: () => void;
  onWakeStreamFallback?: () => void;
}

export function ClockRadioDeck({
  media,
  showRadioControl,
  gradualAlarmVolume,
  isUiHidden,
  isAutoDimmed,
  isSettingsOpen,
  playbackCommand,
  onChangeVolume,
  onOpenRadioSettings,
  onWakeStreamFallback,
}: ClockRadioDeckProps) {
  const [isDeckOpen, setIsDeckOpen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const spotifyMountRef = useRef<HTMLDivElement | null>(null);
  const spotifyControllerRef = useRef<SpotifyEmbedController | null>(null);
  const loadedSpotifyUriRef = useRef<string>('');
  const lastHandledCommandKeyRef = useRef<number>(0);
  const wakeRampTimerRef = useRef<number | null>(null);

  const clearWakeRamp = useCallback(() => {
    if (wakeRampTimerRef.current !== null) {
      window.clearInterval(wakeRampTimerRef.current);
      wakeRampTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearWakeRamp();
    };
  }, [clearWakeRamp]);

  const spotifyResource = parseSpotifyResource(media.spotifyInput);
  const youtubeResource = parseYouTubeResource(media.youtubeInput);
  const appleMusicResource = parseAppleMusicEmbedUrl(media.appleMusicInput);

  const applyEffectiveVolume = useCallback(
    (effectivePercent: number) => {
      const clamped = Math.min(100, Math.max(0, effectivePercent));
      if (audioRef.current) {
        audioRef.current.volume = clamped / 100;
      }
      if (
        media.activeProvider === MediaProvider.YouTube &&
        youtubeIframeRef.current?.contentWindow
      ) {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'setVolume',
            args: [Math.round(clamped)],
          }),
          '*'
        );
      }
    },
    [media.activeProvider]
  );

  // Sync HTML5 Radio <audio> volume and YouTube IFrame volume when user changes volume
  useEffect(() => {
    clearWakeRamp();
    applyEffectiveVolume(media.volume);
  }, [media.volume, media.activeProvider, applyEffectiveVolume, clearWakeRamp]);

  // Load official Spotify IFrame API when Spotify is selected so programmatic play/pause works
  useEffect(() => {
    if (media.activeProvider !== MediaProvider.Spotify || !spotifyResource) {
      return undefined;
    }

    let cancelled = false;

    const initController = (api: SpotifyIframeApi) => {
      if (cancelled || !spotifyMountRef.current) return;

      if (spotifyControllerRef.current) {
        if (loadedSpotifyUriRef.current !== spotifyResource.uri) {
          spotifyControllerRef.current.loadUri(spotifyResource.uri);
          loadedSpotifyUriRef.current = spotifyResource.uri;
        }
        return;
      }

      api.createController(
        spotifyMountRef.current,
        {
          uri: spotifyResource.uri,
          width: '100%',
          height: 152,
          theme: 'dark',
        },
        (controller) => {
          if (cancelled) return;
          spotifyControllerRef.current = controller;
          loadedSpotifyUriRef.current = spotifyResource.uri;
          controller.addListener('playback_update', (e) => {
            if (typeof e?.data?.isPaused === 'boolean') {
              setIsPlaying(!e.data.isPaused);
            }
          });
        }
      );
    };

    if (window.__chrono80SpotifyApi) {
      initController(window.__chrono80SpotifyApi);
    } else {
      const prevCallback = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (api: SpotifyIframeApi) => {
        window.__chrono80SpotifyApi = api;
        prevCallback?.(api);
        initController(api);
      };

      const existingScript = document.getElementById('spotify-iframe-api-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'spotify-iframe-api-script';
        script.src = 'https://open.spotify.com/embed/iframe-api/v1';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [media.activeProvider, spotifyResource?.uri]);

  // Stop HTML5 radio audio when switching away from Radio provider
  useEffect(() => {
    if (media.activeProvider !== MediaProvider.Radio && audioRef.current) {
      audioRef.current.pause();
    }
    setStatusMessage(null);
  }, [media.activeProvider]);

  const sendYouTubeCommand = useCallback(
    (func: 'playVideo' | 'pauseVideo') => {
      const win = youtubeIframeRef.current?.contentWindow;
      if (!win) return false;
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'setVolume',
          args: [media.volume],
        }),
        '*'
      );
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args: [],
        }),
        '*'
      );
      return true;
    },
    [media.volume]
  );

  const playActiveProvider = useCallback(
    async (isWakeAlarm = false) => {
      setStatusMessage(null);

      if (media.activeProvider === MediaProvider.Radio) {
        const station = media.radioStation;
        if (!station || !audioRef.current) {
          setStatusMessage('Select a radio station in Settings → Radio');
          if (isWakeAlarm) onWakeStreamFallback?.();
          else onOpenRadioSettings();
          return;
        }

        try {
          const el = audioRef.current;
          if (el.src !== station.streamUrl) {
            el.src = station.streamUrl;
          }
          el.volume = Math.min(1, Math.max(0, media.volume / 100));
          setStatusMessage('Tuning live stream...');
          await el.play();
          setIsPlaying(true);
          setStatusMessage(null);
        } catch {
          setIsPlaying(false);
          setStatusMessage('Tap Play to start live radio stream');
          if (isWakeAlarm) {
            setIsDeckOpen(true);
            onWakeStreamFallback?.();
          }
        }
        return;
      }

      if (media.activeProvider === MediaProvider.YouTube) {
        if (!youtubeResource) {
          setStatusMessage('Enter a valid YouTube playlist or stream URL');
          if (isWakeAlarm) onWakeStreamFallback?.();
          return;
        }
        setIsDeckOpen(true);
        const sent = sendYouTubeCommand('playVideo');
        setIsPlaying(sent);
        if (!sent && isWakeAlarm) {
          onWakeStreamFallback?.();
        }
        return;
      }

      if (media.activeProvider === MediaProvider.Spotify) {
        if (!spotifyResource) {
          setStatusMessage('Enter a valid Spotify playlist URL');
          if (isWakeAlarm) onWakeStreamFallback?.();
          return;
        }
        setIsDeckOpen(true);
        if (spotifyControllerRef.current) {
          try {
            spotifyControllerRef.current.play();
            setIsPlaying(true);
          } catch {
            if (isWakeAlarm) onWakeStreamFallback?.();
          }
        } else if (isWakeAlarm) {
          onWakeStreamFallback?.();
        }
        return;
      }

      if (media.activeProvider === MediaProvider.AppleMusic) {
        setIsDeckOpen(true);
        setStatusMessage('Press Play in Apple Music deck');
        if (isWakeAlarm) {
          onWakeStreamFallback?.();
        }
      }
    },
    [
      media.activeProvider,
      media.radioStation,
      media.volume,
      onOpenRadioSettings,
      onWakeStreamFallback,
      sendYouTubeCommand,
      spotifyResource,
      youtubeResource,
    ]
  );

  const startWakeVolumeRamp = useCallback(() => {
    clearWakeRamp();
    if (!gradualAlarmVolume) {
      applyEffectiveVolume(media.volume);
      return;
    }

    const startedAtMs = performance.now();
    applyEffectiveVolume(media.volume * computeGradualVolumeScale(0));

    wakeRampTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAtMs;
      const scale = computeGradualVolumeScale(elapsed, GRADUAL_ALARM_RAMP_MS);
      applyEffectiveVolume(media.volume * scale);
      if (elapsed >= GRADUAL_ALARM_RAMP_MS) {
        clearWakeRamp();
      }
    }, 250);
  }, [applyEffectiveVolume, clearWakeRamp, gradualAlarmVolume, media.volume]);

  const pauseActiveProvider = useCallback(() => {
    clearWakeRamp();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (media.activeProvider === MediaProvider.YouTube) {
      sendYouTubeCommand('pauseVideo');
    }
    if (
      media.activeProvider === MediaProvider.Spotify &&
      spotifyControllerRef.current
    ) {
      try {
        spotifyControllerRef.current.pause();
      } catch {
        // Ignore controller pause error
      }
    }
    setIsPlaying(false);
  }, [clearWakeRamp, media.activeProvider, sendYouTubeCommand]);

  // Respond to imperative commands from App (e.g. Alarm Clock wake-up or Settings "Tune & Play")
  useEffect(() => {
    if (!playbackCommand) return;
    if (playbackCommand.key === lastHandledCommandKeyRef.current) return;
    lastHandledCommandKeyRef.current = playbackCommand.key;

    if (playbackCommand.action === 'play') {
      clearWakeRamp();
      applyEffectiveVolume(media.volume);
      void playActiveProvider(false);
    } else if (playbackCommand.action === 'wake-alarm') {
      void playActiveProvider(true).then(() => {
        startWakeVolumeRamp();
      });
    } else if (playbackCommand.action === 'pause') {
      pauseActiveProvider();
    }
  }, [
    applyEffectiveVolume,
    clearWakeRamp,
    media.volume,
    pauseActiveProvider,
    playActiveProvider,
    playbackCommand,
    startWakeVolumeRamp,
  ]);

  const handleTogglePlay = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (media.activeProvider === MediaProvider.AppleMusic) {
      setIsDeckOpen((prev) => !prev);
      return;
    }
    if (isPlaying) {
      pauseActiveProvider();
    } else {
      void playActiveProvider(false);
    }
  };

  const renderProviderIcon = () => {
    switch (media.activeProvider) {
      case MediaProvider.Spotify:
        return <Disc3 className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case MediaProvider.YouTube:
        return <Tv className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case MediaProvider.AppleMusic:
        return <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case MediaProvider.Radio:
      default:
        return <Radio className="h-4 w-4 shrink-0" aria-hidden="true" />;
    }
  };

  useEffect(() => {
    if (!showRadioControl) {
      setIsDeckOpen(false);
    }
  }, [showRadioControl]);

  const activeLabel = getActiveMediaLabel(media);
  const hideVisualChrome = !shouldShowRadioControlBar({
    showRadioControl,
    isUiHidden,
    isSettingsOpen,
  });

  const barOpacityClass = hideVisualChrome
    ? 'opacity-0 pointer-events-none'
    : isAutoDimmed
      ? 'opacity-15 hover:opacity-95 focus-visible:opacity-100'
      : isPlaying || isDeckOpen
        ? 'opacity-90 hover:opacity-100'
        : 'opacity-40 hover:opacity-95 focus-visible:opacity-100';

  const showDeckVisible = isDeckOpen && !hideVisualChrome;

  return (
    <>
      {/* Persistent HTML5 Live Radio Stream Element */}
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => {
          setIsPlaying(true);
          setStatusMessage(null);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          if (isPlaying) {
            setIsPlaying(false);
            setStatusMessage('Stream unavailable — try another station');
          }
        }}
      />

      {/* Persistent Expandable Clock-Radio Player Deck (kept mounted so embeds keep playing when minimized) */}
      <section
        id="clock-radio-deck"
        data-testid="clock-radio-deck"
        aria-label="Clock Radio Player Deck"
        aria-hidden={!showDeckVisible}
        inert={!showDeckVisible}
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          showDeckVisible
            ? 'w-[min(92vw,440px)] p-3.5 opacity-100 translate-y-0 pointer-events-auto'
            : 'h-px w-px overflow-hidden p-0 opacity-0 translate-y-3 pointer-events-none border-0'
        }`}
      >
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-emerald-400">{renderProviderIcon()}</span>
            <span className="truncate text-xs font-semibold tracking-wide text-slate-100">
              {activeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenRadioSettings}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-medium text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Source</span>
            </button>
            <button
              type="button"
              aria-label="Minimize player deck"
              onClick={() => setIsDeckOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Radio Deck Body */}
        {media.activeProvider === MediaProvider.Radio && (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {media.radioStation
                    ? media.radioStation.name
                    : 'No station tuned yet'}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {media.radioStation
                    ? [
                        media.radioStation.country,
                        media.radioStation.tags,
                        media.radioStation.bitrate
                          ? `${media.radioStation.bitrate} kbps`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Live Internet Radio'
                    : 'Open Source settings to search live FM/Web stations'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex h-11 min-w-[88px] items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer shrink-0"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>Play</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Volume2 className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              <input
                aria-label="Radio volume"
                type="range"
                min={0}
                max={100}
                value={media.volume}
                onChange={(e) => onChangeVolume(parseInt(e.target.value, 10))}
                className="h-6 flex-1 accent-emerald-400 cursor-pointer"
              />
              <span className="w-8 text-right text-[11px] font-medium text-slate-400 tabular-nums">
                {media.volume}%
              </span>
            </div>
          </div>
        )}

        {/* Spotify Official IFrame API Deck */}
        {media.activeProvider === MediaProvider.Spotify && (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {spotifyResource ? (
              <div ref={spotifyMountRef} className="min-h-[152px] w-full" />
            ) : (
              <p className="p-4 text-xs text-slate-400">
                Paste a valid Spotify playlist or album URL in Settings → Radio.
              </p>
            )}
          </div>
        )}

        {/* YouTube Official IFrame Player Deck */}
        {media.activeProvider === MediaProvider.YouTube && (
          <div className="flex flex-col gap-2">
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
              {youtubeResource ? (
                <iframe
                  ref={youtubeIframeRef}
                  title="YouTube Clock Radio Player"
                  src={youtubeResource.embedUrl}
                  className="h-44 w-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <p className="p-4 text-xs text-slate-400">
                  Paste a valid YouTube playlist or live radio URL in Settings → Radio.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Apple Music Official Embed Deck */}
        {media.activeProvider === MediaProvider.AppleMusic && (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {appleMusicResource ? (
              <iframe
                title="Apple Music Clock Radio Player"
                src={appleMusicResource.embedUrl}
                className="h-44 w-full border-0"
                allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              />
            ) : (
              <p className="p-4 text-xs text-slate-400">
                Paste a valid Apple Music playlist, station, or album URL in Settings → Radio.
              </p>
            )}
          </div>
        )}

        {statusMessage && (
          <p className="mt-2 text-center text-[11px] text-amber-300">
            {statusMessage}
          </p>
        )}
      </section>

      {/* Bottom-Center Sleek Clock-Radio Tuner Bar */}
      <div
        data-testid="clock-radio-bar"
        aria-hidden={hideVisualChrome}
        inert={hideVisualChrome}
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-current/20 bg-black/35 px-2 py-1 backdrop-blur-md transition-opacity duration-200 ${barOpacityClass}`}
      >
        <button
          id="clock-radio-play-btn"
          type="button"
          aria-label={isPlaying ? 'Pause clock radio' : 'Play clock radio'}
          onClick={handleTogglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-current/15 active:scale-95 transition-transform cursor-pointer shrink-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4 fill-current translate-x-0.5" aria-hidden="true" />
          )}
        </button>

        <button
          id="clock-radio-deck-btn"
          type="button"
          aria-expanded={isDeckOpen}
          aria-controls="clock-radio-deck"
          onClick={() => setIsDeckOpen((prev) => !prev)}
          className="flex h-10 max-w-[150px] sm:max-w-[230px] items-center gap-2 rounded-lg px-2.5 text-xs font-medium tracking-wide hover:bg-current/15 cursor-pointer"
        >
          {renderProviderIcon()}
          <span className="truncate">{activeLabel}</span>
          {isDeckOpen ? (
            <ChevronDown className="h-3.5 w-3.5 opacity-70 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 opacity-70 shrink-0" aria-hidden="true" />
          )}
        </button>
      </div>
    </>
  );
}
