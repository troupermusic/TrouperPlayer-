import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '100kb' }));

const ITUNES_API = 'https://itunes.apple.com';

function validCountry(value) {
  const country = String(value || 'US').toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : 'US';
}

function formatTrack(item) {
  return {
    id: String(item.trackId),
    title: item.trackName || 'Unknown title',
    artist: item.artistName || 'Unknown artist',
    album: item.collectionName || '',
    artworkUrl: item.artworkUrl100 || null,
    durationMs: item.trackTimeMillis || null,
    source: 'iTunes',
    previewUrl: item.previewUrl || null,
    playbackType: item.previewUrl ? 'preview' : 'unavailable',
    fullTrackAvailable: false,
    audioOnly: true,
    storeUrl: item.trackViewUrl || null
  };
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Trouper Player Catalog API',
    catalog: 'iTunes Search API'
  });
});

app.get('/catalog/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const country = validCountry(req.query.country);
  const requestedLimit = Number(req.query.limit || 25);
  const limit = Math.max(1, Math.min(50, requestedLimit));

  if (query.length < 1 || query.length > 150) {
    return res.status(400).json({
      error: 'Enter a search term between 1 and 150 characters.'
    });
  }

  try {
    const url = new URL('/search', ITUNES_API);
    url.searchParams.set('term', query);
    url.searchParams.set('entity', 'song');
    url.searchParams.set('media', 'music');
    url.searchParams.set('country', country);
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return res.status(502).json({
        error: 'The iTunes catalog could not be reached.'
      });
    }

    const data = await response.json();

    // Online Music is audio-only. Hide results that have no playable
    // audio preview instead of showing video or unplayable entries.
    const tracks = (data.results || [])
      .filter(item =>
        item.wrapperType === 'track' &&
        item.kind === 'song' &&
        typeof item.previewUrl === 'string' &&
        item.previewUrl.startsWith('https://')
      )
      .map(formatTrack);

    res.json({
      query,
      country,
      source: 'iTunes',
      audioOnly: true,
      results: tracks
    });
  } catch (error) {
    console.error('iTunes search failed:', error.message);
    res.status(502).json({
      error: 'Unable to search online music right now. Try again.'
    });
  }
});

app.get('/tracks/:id/stream', async (req, res) => {
  const id = String(req.params.id);

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid track ID.' });
  }

  try {
    const url = new URL('/lookup', ITUNES_API);
    url.searchParams.set('id', id);
    url.searchParams.set('entity', 'song');
    url.searchParams.set('country', validCountry(req.query.country));

    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return res.status(502).json({
        error: 'Could not retrieve this track.'
      });
    }

    const data = await response.json();
    const item = (data.results || []).find(
      result =>
        String(result.trackId) === id &&
        result.kind === 'song' &&
        typeof result.previewUrl === 'string' &&
        result.previewUrl.startsWith('https://')
    );

    if (!item) {
      return res.status(404).json({
        error: 'No playable audio preview is available for this track.'
      });
    }

    res.json({
      trackId: id,
      source: 'iTunes',
      playbackType: 'preview',
      fullTrackAvailable: false,
      audioUrl: item.previewUrl
    });
  } catch (error) {
    console.error('Track lookup failed:', error.message);
    res.status(502).json({
      error: 'Unable to retrieve audio right now.'
    });
  }
});

// Full-track playback must be connected to a real provider that
// authorizes streaming. Never treat an iTunes preview as a full song.
app.get('/catalog/full-track/:id', (_req, res) => {
  res.status(501).json({
    error: 'Full-track streaming provider is not configured.',
    fullTrackAvailable: false,
    nextStep: 'Connect an authorized full-track streaming provider.'
  });
});


// YOUTUBE_DISCOVERY_ROUTES
// Keep the API key on the backend. Cache responses to reduce API calls.
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const youtubeCache = new Map();
const YOUTUBE_CACHE_MS = 6 * 60 * 60 * 1000;

function youtubeRegion(value) {
  const region = String(value || 'UG').toUpperCase();
  return /^[A-Z]{2}$/.test(region) ? region : 'UG';
}

function youtubeVideo(item) {
  const snippet = item.snippet || {};
  const videoId = item.id?.videoId || item.id;
  if (!videoId || typeof videoId !== 'string') return null;

  const thumbnails = snippet.thumbnails || {};
  const thumbnail =
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    null;

  return {
    id: videoId,
    title: snippet.title || 'Unknown title',
    artist: snippet.channelTitle || 'YouTube',
    description: snippet.description || '',
    artworkUrl: thumbnail,
    videoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    source: 'YouTube',
    playbackType: 'youtube_player',
    fullTrackAvailable: true
  };
}

async function youtubeRequest(endpoint, params) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    const error = new Error('YouTube API key is not configured on the backend.');
    error.status = 503;
    throw error;
  }

  const url = new URL(`${YOUTUBE_API}/${endpoint}`);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }
  url.searchParams.set('key', key);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json();

  if (!response.ok) {
    console.error('YouTube API error:', data.error?.message || response.status);
    const error = new Error(
      response.status === 403
        ? 'YouTube API access or daily quota limit reached.'
        : 'YouTube catalog request failed.'
    );
    error.status = response.status === 403 ? 429 : 502;
    throw error;
  }

  return data;
}

async function cachedYouTube(key, loader) {
  const cached = youtubeCache.get(key);
  if (cached && Date.now() - cached.time < YOUTUBE_CACHE_MS) {
    return cached.data;
  }

  const data = await loader();
  youtubeCache.set(key, { time: Date.now(), data });
  return data;
}

app.get('/youtube/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const region = youtubeRegion(req.query.region);
  const limit = Math.max(1, Math.min(25, Number(req.query.limit || 15)));

  if (!query || query.length > 150) {
    return res.status(400).json({
      error: 'Enter a search term between 1 and 150 characters.'
    });
  }

  try {
    const data = await cachedYouTube(
      `search:${region}:${query.toLowerCase()}:${limit}`,
      () => youtubeRequest('search', {
        part: 'snippet',
        type: 'video',
        q: query,
        regionCode: region,
        videoEmbeddable: 'true',
        maxResults: limit,
        safeSearch: 'moderate'
      })
    );

    res.json({
      source: 'YouTube',
      region,
      query,
      results: (data.items || []).map(youtubeVideo).filter(Boolean)
    });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'YouTube search failed.' });
  }
});

app.get('/youtube/trending', async (req, res) => {
  const region = youtubeRegion(req.query.region);
  const limit = Math.max(1, Math.min(25, Number(req.query.limit || 15)));

  try {
    const data = await cachedYouTube(
      `popular-music:${region}:${limit}`,
      () => youtubeRequest('videos', {
        part: 'snippet',
        chart: 'mostPopular',
        regionCode: region,
        videoCategoryId: '10',
        maxResults: limit
      })
    );

    res.json({
      source: 'YouTube',
      region,
      title: 'Popular Music',
      results: (data.items || []).map(youtubeVideo).filter(Boolean)
    });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'Popular music is unavailable.' });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Trouper catalog API running on port ${PORT}`);
});
