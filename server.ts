import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

dotenv.config();

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

interface SpotifySession {
  accessToken: string;
  refreshToken?: string;
  expiresAtMs: number;
  profileName?: string;
}

interface RawRadioBrowserStation {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  url?: string;
  country?: string;
  tags?: string;
  bitrate?: number;
  homepage?: string;
}

const spotifySessions = new Map<string, SpotifySession>();
const SESSION_COOKIE_NAME = 'chrono80_spotify_sid';

const RADIO_BROWSER_MIRRORS: readonly string[] = [
  'https://de1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const segment of cookieHeader.split(';')) {
    const eqIdx = segment.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = segment.slice(0, eqIdx).trim();
    const val = segment.slice(eqIdx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

function getBaseAppUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)
    ?.split(',')[0]
    ?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)
    ?.split(',')[0]
    ?.trim();
  const host = forwardedHost || req.headers.host?.trim();
  if (forwardedHost || (forwardedProto && host)) {
    return `${forwardedProto || 'https'}://${host}`;
  }
  return `http://localhost:${PORT}`;
}

function getSpotifyRedirectUri(req: Request): string {
  return `${getBaseAppUrl(req)}/auth/spotify/callback`;
}

function buildSessionCookieHeader(sessionId: string, req: Request, maxAgeSec: number): string {
  const baseUrl = getBaseAppUrl(req);
  const isSecure = baseUrl.startsWith('https://');
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isSecure) {
    parts.push('SameSite=None', 'Secure');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

async function refreshSpotifySessionIfNeeded(
  session: SpotifySession,
  clientId: string,
  clientSecret: string
): Promise<SpotifySession | null> {
  if (Date.now() + 30_000 < session.expiresAtMs) {
    return session;
  }
  if (!session.refreshToken) {
    return null;
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;

    session.accessToken = data.access_token;
    if (data.refresh_token) {
      session.refreshToken = data.refresh_token;
    }
    session.expiresAtMs = Date.now() + (data.expires_in ?? 3600) * 1000;
    return session;
  } catch {
    return null;
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  // 0. Healthcheck endpoint for Docker / Dokploy / reverse proxies
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()) });
  });

  // 1. Live Internet Radio Search Proxy (Radio-Browser API)
  app.get('/api/radio/search', async (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';

    const params = new URLSearchParams({
      is_https: 'true',
      hidebroken: 'true',
      order: 'clickcount',
      reverse: 'true',
      limit: '18',
    });

    if (query) {
      params.set('name', query);
    }
    if (tag) {
      params.set('tag', tag);
    }
    if (!query && !tag) {
      params.set('tag', '80s');
    }

    let lastError = 'Unable to reach Radio Browser directory';

    for (const mirror of RADIO_BROWSER_MIRRORS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5500);
        const upstream = await fetch(
          `${mirror}/json/stations/search?${params.toString()}`,
          {
            headers: {
              'User-Agent': 'Chrono80LCDClockRadio/1.0',
              Accept: 'application/json',
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (!upstream.ok) {
          lastError = `Mirror ${mirror} returned ${upstream.status}`;
          continue;
        }

        const rawList = (await upstream.json()) as RawRadioBrowserStation[];
        if (!Array.isArray(rawList)) continue;

        const seenUrls = new Set<string>();
        const stations = [];
        for (const item of rawList) {
          const streamUrl = (item.url_resolved || item.url || '').trim();
          const name = (item.name || '').trim();
          if (!name || !streamUrl.startsWith('https://')) continue;
          if (seenUrls.has(streamUrl)) continue;
          seenUrls.add(streamUrl);

          stations.push({
            id: item.stationuuid || `radio-${stations.length}-${name}`,
            name: name.slice(0, 64),
            streamUrl,
            country: (item.country || '').trim().slice(0, 32),
            tags: (item.tags || '')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 3)
              .join(', '),
            bitrate: typeof item.bitrate === 'number' ? item.bitrate : 0,
            homepage: (item.homepage || '').trim(),
          });
        }

        res.json({ stations });
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    res.status(502).json({ error: lastError, stations: [] });
  });

  // 2. Spotify OAuth Status & Popup Flow
  app.get('/api/spotify/status', async (req: Request, res: Response) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || '';
    const configured = Boolean(clientId && clientSecret);

    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies[SESSION_COOKIE_NAME];
    let connected = false;
    let profileName: string | null = null;

    if (configured && sid && spotifySessions.has(sid)) {
      const existing = spotifySessions.get(sid)!;
      const valid = await refreshSpotifySessionIfNeeded(
        existing,
        clientId,
        clientSecret
      );
      if (valid) {
        connected = true;
        profileName = valid.profileName ?? null;
      } else {
        spotifySessions.delete(sid);
      }
    }

    res.json({
      configured,
      connected,
      profileName,
      redirectUri: getSpotifyRedirectUri(req),
    });
  });

  app.get('/api/spotify/auth-url', (req: Request, res: Response) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || '';
    if (!clientId || !clientSecret) {
      res.status(400).json({
        error:
          'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not set. You can still paste any Spotify playlist URL directly.',
      });
      return;
    }

    const redirectUri = getSpotifyRedirectUri(req);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'playlist-read-private playlist-read-collaborative',
      show_dialog: 'true',
    });

    res.json({
      url: `https://accounts.spotify.com/authorize?${params.toString()}`,
    });
  });

  const handleSpotifyCallback = async (req: Request, res: Response) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || '';

    if (!code || !clientId || !clientSecret) {
      res.status(400).send(`<!doctype html><html><body><p>Spotify authorization cancelled or unconfigured.</p><script>if(window.opener){window.close();}</script></body></html>`);
      return;
    }

    try {
      const redirectUri = getSpotifyRedirectUri(req);
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      });

      const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody.toString(),
      });

      if (!tokenResp.ok) {
        res.status(400).send(`<!doctype html><html><body><p>Failed to exchange Spotify token. Verify your Redirect URI matches ${redirectUri}</p></body></html>`);
        return;
      }

      const tokenData = (await tokenResp.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };

      if (!tokenData.access_token) {
        res.status(400).send('Missing Spotify access token.');
        return;
      }

      let profileName: string | undefined;
      try {
        const meResp = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (meResp.ok) {
          const meData = (await meResp.json()) as { display_name?: string; id?: string };
          profileName = meData.display_name || meData.id;
        }
      } catch {
        // Ignore optional profile lookup failure
      }

      const sid = crypto.randomBytes(24).toString('hex');
      spotifySessions.set(sid, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAtMs: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
        profileName,
      });

      res.setHeader(
        'Set-Cookie',
        buildSessionCookieHeader(sid, req, 60 * 60 * 24 * 7)
      );
      res.send(`<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Spotify Connected</title></head>
  <body style="background:#090b10;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'spotify' }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <p>Spotify connected. This window will close automatically.</p>
  </body>
</html>`);
    } catch {
      res.status(500).send('Unexpected error during Spotify authentication.');
    }
  };

  app.get(['/auth/spotify/callback', '/auth/spotify/callback/'], handleSpotifyCallback);

  app.post('/api/spotify/logout', (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies[SESSION_COOKIE_NAME];
    if (sid) {
      spotifySessions.delete(sid);
    }
    res.setHeader('Set-Cookie', buildSessionCookieHeader('', req, 0));
    res.json({ ok: true });
  });

  app.get('/api/spotify/playlists', async (req: Request, res: Response) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || '';
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies[SESSION_COOKIE_NAME];

    if (!clientId || !clientSecret || !sid || !spotifySessions.has(sid)) {
      res.status(401).json({ error: 'Not connected to Spotify', playlists: [] });
      return;
    }

    const session = await refreshSpotifySessionIfNeeded(
      spotifySessions.get(sid)!,
      clientId,
      clientSecret
    );
    if (!session) {
      spotifySessions.delete(sid);
      res.status(401).json({ error: 'Spotify session expired', playlists: [] });
      return;
    }

    try {
      const upstream = await fetch(
        'https://api.spotify.com/v1/me/playlists?limit=24',
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );
      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: `Spotify API returned ${upstream.status}`,
          playlists: [],
        });
        return;
      }

      const payload = (await upstream.json()) as {
        items?: Array<{
          id?: string;
          name?: string;
          uri?: string;
          external_urls?: { spotify?: string };
          tracks?: { total?: number };
          owner?: { display_name?: string };
        }>;
      };

      const playlists = (payload.items ?? [])
        .filter((item) => item && item.id && item.name)
        .map((item) => ({
          id: item.id!,
          name: item.name!,
          uri: item.uri || `spotify:playlist:${item.id}`,
          externalUrl:
            item.external_urls?.spotify ||
            `https://open.spotify.com/playlist/${item.id}`,
          trackCount: item.tracks?.total ?? 0,
          ownerName: item.owner?.display_name ?? '',
        }));

      res.json({ playlists });
    } catch {
      res.status(502).json({ error: 'Failed to load Spotify playlists', playlists: [] });
    }
  });

  const distDir = path.join(rootDir, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (!process.argv[1]?.includes('tsx') &&
      process.env.NODE_ENV !== 'development' &&
      fs.existsSync(path.join(distDir, 'index.html')) &&
      process.execArgv.length === 0 &&
      !process.env.VITE_DEV_SERVER);

  // Use Vite middleware in development; serve compiled static assets when started via `node server.ts` in production
  const runningUnderTsx =
    process.argv.some((arg) => arg.includes('tsx')) ||
    process.execArgv.some((arg) => arg.includes('tsx'));

  if (!isProd || runningUnderTsx) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chrono80 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
