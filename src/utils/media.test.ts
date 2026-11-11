import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AlarmWakeMode,
  DEFAULT_MEDIA_CONFIG,
  MediaProvider,
  parseAppleMusicEmbedUrl,
  parseSpotifyResource,
  parseYouTubeResource,
  sanitizeMediaConfig,
  validateDirectStreamUrl,
} from './media';

test('parseSpotifyResource parses Spotify playlist/album/track URLs and URIs', () => {
  const fromUrl = parseSpotifyResource(
    'https://open.spotify.com/playlist/37i9dQZF1DX4UtSsGT1Sbe?si=abc123'
  );
  assert.deepEqual(fromUrl, {
    kind: 'playlist',
    id: '37i9dQZF1DX4UtSsGT1Sbe',
    uri: 'spotify:playlist:37i9dQZF1DX4UtSsGT1Sbe',
    embedUrl:
      'https://open.spotify.com/embed/playlist/37i9dQZF1DX4UtSsGT1Sbe?utm_source=generator&theme=0',
  });

  const fromIntlAlbum = parseSpotifyResource(
    'https://open.spotify.com/intl-pt/album/4yP0hdKOZPNshxUOjY0cZj'
  );
  assert.ok(fromIntlAlbum);
  assert.equal(fromIntlAlbum.kind, 'album');
  assert.equal(fromIntlAlbum.uri, 'spotify:album:4yP0hdKOZPNshxUOjY0cZj');

  const fromUri = parseSpotifyResource('spotify:track:4cOdK2wGLETKBW3PvgPWqT');
  assert.ok(fromUri);
  assert.equal(fromUri.kind, 'track');
  assert.equal(fromUri.id, '4cOdK2wGLETKBW3PvgPWqT');

  assert.equal(parseSpotifyResource('https://example.com/playlist/123456789'), null);
});

test('parseYouTubeResource parses YouTube playlists, live streams, and music.youtube.com links', () => {
  const playlist = parseYouTubeResource(
    'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'
  );
  assert.ok(playlist);
  assert.equal(playlist.listId, 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
  assert.match(playlist.embedUrl, /videoseries\?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI/);

  const liveVideo = parseYouTubeResource('https://youtu.be/jfKfPfyJRdk');
  assert.ok(liveVideo);
  assert.equal(liveVideo.videoId, 'jfKfPfyJRdk');

  const ytMusic = parseYouTubeResource(
    'https://music.youtube.com/watch?v=jfKfPfyJRdk&list=PL1234567890abcdef'
  );
  assert.ok(ytMusic);
  assert.equal(ytMusic.videoId, 'jfKfPfyJRdk');
  assert.equal(ytMusic.listId, 'PL1234567890abcdef');

  assert.equal(parseYouTubeResource('not-a-valid-url!'), null);
});

test('parseAppleMusicEmbedUrl converts Apple Music playlist/station/album links to dark embed URLs', () => {
  const pl = parseAppleMusicEmbedUrl(
    'https://music.apple.com/us/playlist/80s-hits-essentials/pl.97c6f95b0b884bedbcce117f9ea5d54b'
  );
  assert.ok(pl);
  assert.equal(pl.kind, 'playlist');
  assert.equal(
    pl.embedUrl,
    'https://embed.music.apple.com/us/playlist/80s-hits-essentials/pl.97c6f95b0b884bedbcce117f9ea5d54b?theme=dark'
  );

  const station = parseAppleMusicEmbedUrl(
    'https://music.apple.com/gb/station/80s-radio/ra.985484166'
  );
  assert.ok(station);
  assert.equal(station.kind, 'station');

  assert.equal(parseAppleMusicEmbedUrl('https://spotify.com/us/playlist/abc'), null);
});

test('validateDirectStreamUrl and sanitizeMediaConfig clamp bounds safely', () => {
  assert.equal(
    validateDirectStreamUrl('https://ice1.somafm.com/u80s-128-mp3'),
    'https://ice1.somafm.com/u80s-128-mp3'
  );
  assert.equal(validateDirectStreamUrl('javascript:alert(1)'), null);

  const clean = sanitizeMediaConfig({
    activeProvider: MediaProvider.Spotify,
    alarmWakeMode: AlarmWakeMode.Media,
    volume: 145,
    radioStation: {
      id: 'st-1',
      name: 'Underground 80s',
      streamUrl: 'https://ice1.somafm.com/u80s-128-mp3',
    },
  });
  assert.equal(clean.activeProvider, MediaProvider.Spotify);
  assert.equal(clean.alarmWakeMode, AlarmWakeMode.Media);
  assert.equal(clean.volume, 100);
  assert.equal(clean.radioStation?.name, 'Underground 80s');
  assert.equal(clean.spotifyInput, DEFAULT_MEDIA_CONFIG.spotifyInput);
});
