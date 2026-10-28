import React, { useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useVideoPlayer, VideoView } from "expo-video",
"@react-native-google-signin/google-signin"
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import MusicControls from './components/MusicControls';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Alert,
  
  BackHandler,FlatList,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View, PanResponder} from 'react-native';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

function getGoogleSignin() {
  if (isExpoGo) return null;
  return require('@react-native-google-signin/google-signin').GoogleSignin;
}

if (!isExpoGo) {
  getGoogleSignin()?.configure({
    webClientId: '732439327100-iflu51njghta4uk54topkmlsli3cark0.apps.googleusercontent.com',
    offlineAccess: false,
  });
}

type Song = {
  id: string;
  name: string;
  uri: string;
  artist?: string;
  album?: string;
  lyrics?: string;
  artworkUri?: string;
};

type OnlineTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
};

 type Playlist = {
  id: string;
  name: string;
  songIds: string[];
};

type DeviceVideo = {
  id: string;
  name: string;
  uri: string;
  duration: number;
};

function VideoThumbnailCard({ video, onPress }: { video: DeviceVideo; onPress: () => void }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getThumbnailAsync(video.uri, { time: 1000, quality: 0.65 })
      .then(result => { if (alive) setThumbnail(result.uri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [video.uri]);

  const duration = Math.max(0, Math.floor(video.duration || 0));
  const time = Math.floor(duration / 60) + ':' + String(duration % 60).padStart(2, '0');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}
      style={{ width: '48%', marginBottom: 14, backgroundColor: 'rgba(6, 19, 41, 0.72)', borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#15345A' }}>
      {thumbnail
        ? <Image source={{ uri: thumbnail }} style={{ width: '100%', height: 112, backgroundColor: 'rgba(2, 7, 19, 0.82)' }} resizeMode="cover" />
        : <View style={{ height: 112, alignItems: 'center', justifyContent: 'center', backgroundColor: '#081A35' }}><Text style={{ color: '#FFF176', fontSize: 32 }}>▶</Text></View>}
      <View style={{ padding: 10 }}>
        <Text numberOfLines={2} style={{ color: '#F5F8FF', fontSize: 12, fontWeight: '700' }}>{video.name}</Text>
        <Text style={{ color: '#91A4BF', fontSize: 11, marginTop: 5 }}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TrouperVideoPlayer({ video, onClose }: { video: DeviceVideo; onClose: () => void }) {
  const videoPlayer = useVideoPlayer(video.uri, player => { player.play(); });
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity onPress={onClose} accessibilityLabel="Close video" style={{ paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: '#FFF176', fontSize: 26, fontWeight: '800' }}>⌄</Text></TouchableOpacity>
      <VideoView player={videoPlayer} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 14 }} nativeControls contentFit="contain" />
      <Text style={{ color: '#F5F8FF', fontSize: 18, fontWeight: '800', marginTop: 16 }}>{video.name}</Text>
    </View>
  );
}


type Tab = 'Home' | 'Search' | 'Library' | 'Videos' | 'Playlists' | 'Lyrics' | 'Equaliser' | 'Album editor' | 'Settings';

const BLUE = '#FFCC00';
const BG = '#000000';
const PANEL = '#020713';
const MUTED = '#718096';

const AMOLED = '#000000';
const NAVY = '#061329';
const CARD_TOP = '#081A35';
const CARD_BOTTOM = '#030A16';
const ACCENT_BLUE = '#FFCC00';
const ELECTRIC_BLUE = '#FFCC00';
const CYAN = '#FFF176';
const BORDER_BLUE = '#15345A';
const TEXT_PRIMARY = '#F5F8FF';
const TEXT_SECONDARY = '#91A4BF';

export default function App() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [songs, setSongs] = useState<Song[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [tab, setTab] = useState<Tab>('Home');
  const [googleUser, setGoogleUser] = useState<{email: string; name?: string} | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);




  const [search, setSearch] = useState('');
  const [onlineTracks, setOnlineTracks] = useState<OnlineTrack[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const [discoveryTracks, setDiscoveryTracks] = useState<OnlineTrack[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');




  async function handleGoogleSignIn() {
    if (isExpoGo) {
      Alert.alert('Google sign-in unavailable in Expo Go',
        'You can test the player in Expo Go. Google sign-in requires a custom native Android build.');
      return;
    }
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const GoogleSignin = getGoogleSignin();
      if (!GoogleSignin) return;
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'success') {
        setGoogleUser({
          email: response.data.user.email,
          name: response.data.user.name ?? undefined,
        });
      }
    } catch (error) {
      Alert.alert('Google sign-in failed',
        'Check Google Play Services and the Android OAuth signing certificate, then try again.');
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleGoogleSignOut() {
    if (isExpoGo) {
      setGoogleUser(null);
      return;
    }
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const GoogleSignin = getGoogleSignin();
      if (!GoogleSignin) return;
      await GoogleSignin.signOut();
      setGoogleUser(null);
    } catch (error) {
      Alert.alert('Sign-out failed', 'Please try again.');
    } finally {
      setGoogleBusy(false);
    }
  }

  async function fetchCatalogTracks(query: string): Promise<OnlineTrack[]> {
    const response = await fetch(
      'http://127.0.0.1:3000/catalog/search?q=' +
      encodeURIComponent(query) +
      '&country=UG&limit=25'
    );

    if (!response.ok) {
      throw new Error('Catalog request failed: ' + response.status);
    }

    const payload = await response.json();
    const results = Array.isArray(payload.results) ? payload.results : [];

    return results
      .filter((item: any) =>
        item.id &&
        item.title &&
        item.artist &&
        typeof item.previewUrl === 'string' &&
        item.previewUrl.startsWith('https://')
      )
      .map((item: any) => ({
        trackId: Number(item.id),
        trackName: item.title,
        artistName: item.artist,
        collectionName: item.album || '',
        artworkUrl100: item.artworkUrl || undefined,
        previewUrl: item.previewUrl,
        trackViewUrl: item.storeUrl || undefined,
      }));
  }

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setOnlineTracks([]);
      setOnlineError('');
      setOnlineLoading(false);
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      setOnlineLoading(true);
      setOnlineError('');

      try {
        const results = await fetchCatalogTracks(query);
        if (active) setOnlineTracks(results);
      } catch {
        if (active) {
          setOnlineTracks([]);
          setOnlineError(
            'Online music unavailable. Check that the Trouper catalog server is running.'
          );
        }
      } finally {
        if (active) setOnlineLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    let active = true;

    async function loadDiscovery() {
      setDiscoveryLoading(true);
      setDiscoveryError('');

      try {
        const results = await fetchCatalogTracks('Ugandan music');
        if (active) setDiscoveryTracks(results);
      } catch {
        if (active) {
          setDiscoveryTracks([]);
          setDiscoveryError('Start the Trouper catalog server to load discoveries.');
        }
      } finally {
        if (active) setDiscoveryLoading(false);
      }
    }

    void loadDiscovery();
    return () => {
      active = false;
    };
  }, []);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScannedAudio, setHasScannedAudio] = useState(false);
  const [videos, setVideos] = useState<DeviceVideo[]>([]);
  const [isScanningVideos, setIsScanningVideos] = useState(false);
  const [hasScannedVideos, setHasScannedVideos] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<DeviceVideo | null>(null);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const playerDismissPanResponder = React.useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 55) setShowFullPlayer(false);
      },
    }),
    []
  );


  const backTabHistory = React.useRef<Tab[]>([]);

  const navigateToTab = (nextTab: Tab) => {
    if (nextTab !== tab) {
      backTabHistory.current.push(tab);
    }
    setTab(nextTab);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (currentVideo) {
          setCurrentVideo(null);
          return true;
        }

        if (showFullPlayer) {
          setShowFullPlayer(false);
          return true;
        }

        if (backTabHistory.current.length > 0) {
          const previousTab = backTabHistory.current.pop();
          if (previousTab) {
            setTab(previousTab);
            return true;
          }
        }

        if (tab !== 'Home') {
          setTab('Home');
          return true;
        }

        Alert.alert(
          'Exit Trouper Player?',
          'Do you want to close the app?',
          [
            { text: 'Stay', style: 'cancel' },
            {
              text: 'Exit',
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ],
        );
        return true;
      },
    );

    return () => subscription.remove();
  }, [tab, showFullPlayer, currentVideo]);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [lyricsDraft, setLyricsDraft] = useState('');
  const [artistDraft, setArtistDraft] = useState('');
  const [albumDraft, setAlbumDraft] = useState('');
  const [artworkDraft, setArtworkDraft] = useState('');
  const [accentIndex, setAccentIndex] = useState(0);
  const [equaliserPreset, setEqualiserPreset] = useState('Flat');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const accents = ['#FFCC00', '#FFCC00'];
  const accent = accents[accentIndex % accents.length];

  // Restore saved playback preferences.
  useEffect(() => {
    let active = true;

    async function restoreSettings() {
      try {
        const saved = await AsyncStorage.getItem('trouper.settings.v1');
        if (!active) return;

        if (saved) {
          const data = JSON.parse(saved);

          if (typeof data.shuffle === 'boolean') setShuffle(data.shuffle);
          if (['off', 'all', 'one'].includes(data.repeatMode)) {
            setRepeatMode(data.repeatMode);
          }
          if (typeof data.equaliserPreset === 'string') {
            setEqualiserPreset(data.equaliserPreset);
          }
          if (Number.isInteger(data.accentIndex) && data.accentIndex >= 0) {
            setAccentIndex(data.accentIndex);
          }
        }
      } catch (error) {
        console.warn('Could not restore settings:', error);
      } finally {
        if (active) setSettingsLoaded(true);
      }
    }

    void restoreSettings();
    return () => { active = false; };
  }, []);

  // Save preferences only after the initial restore completes.
  useEffect(() => {
    if (!settingsLoaded) return;

    const saved = JSON.stringify({
      shuffle,
      repeatMode,
      equaliserPreset,
      accentIndex,
    });

    AsyncStorage.setItem('trouper.settings.v1', saved).catch(error => {
      console.warn('Could not save settings:', error);
    });
  }, [settingsLoaded, shuffle, repeatMode, equaliserPreset, accentIndex]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(error => {
      console.warn('Could not configure background audio:', error);
    });
  }, []);


  // Restore the user's library before writing any state to storage.
  useEffect(() => {
    let active = true;

    async function restoreLibrary() {
      try {
        const saved = await AsyncStorage.getItem('trouper.library.v1');
        if (!active) return;

        if (saved) {
          const data = JSON.parse(saved);
          if (Array.isArray(data.songs)) setSongs(data.songs);
          if (Array.isArray(data.playlists)) setPlaylists(data.playlists);
          if (Array.isArray(data.favorites)) setFavorites(data.favorites);
          if (Array.isArray(data.videos)) setVideos(data.videos);
        }
      } catch (error) {
        console.warn('Could not restore saved library:', error);
      } finally {
        if (active) setLibraryLoaded(true);
      }
    }

    void restoreLibrary();
    return () => { active = false; };
  }, []);

  // Save library changes without overwriting saved data during startup.
  useEffect(() => {
    if (!libraryLoaded) return;

    const data = JSON.stringify({ songs, playlists, favorites, videos });
    AsyncStorage.setItem('trouper.library.v1', data).catch(error => {
      console.warn('Could not save library:', error);
    });
  }, [libraryLoaded, songs, playlists, favorites, videos]);

  // Scan automatically after restoring saved tracks.
  useEffect(() => {
    if (libraryLoaded && !hasScannedAudio && !isScanning) {
      void scanDeviceAudio();
    }
  }, [libraryLoaded, hasScannedAudio, isScanning]);

  // Opening Videos automatically discovers device videos.
  useEffect(() => {
    if (tab === 'Videos' && videos.length === 0 && !isScanningVideos) {
      void scanDeviceVideos();
    }
  }, [tab, videos.length, isScanningVideos]);



  async function addSongs() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const selected = result.assets.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        uri: file.uri,
        artist: 'Unknown artist',
        album: 'Local music',
        lyrics: '',
        artworkUri: '',
      }));

      setSongs(previous => {
        const existing = new Set(previous.map(song => song.uri));
        return [
          ...previous,
          ...selected.filter(song => !existing.has(song.uri)),
        ];
      });

      navigateToTab('Library');
    } catch {
      Alert.alert('Unable to add music', 'Please try again.');
    }
  }

  function playSong(song: Song) {
    try {
      setAccentIndex(previous => (previous + 1) % accents.length);
      player.replace({ uri: song.uri });
      player.play();
      setCurrentSong(song);

      try {
        player.setActiveForLockScreen(
          true,
          {
            title: song.name,
            artist: song.artist || 'Trouper Player',
            albumTitle: song.album || 'Local Music',
            artworkUrl: song.artworkUri || undefined,
          },
          {
            showSeekForward: true,
            showSeekBackward: true,
          }
        );
      } catch (error) {
        console.warn('Lock-screen controls unavailable:', error);
      }
    } catch (error) {
      console.error('Playback error:', error);
      Alert.alert('Playback error', 'Could not play this audio file.');
    }
  }

  function playOnlineTrack(track: OnlineTrack) {
    if (!track.previewUrl || !track.previewUrl.startsWith('https://')) {
      Alert.alert(
        'Preview unavailable',
        'This catalog track does not currently have a playable preview.'
      );
      return;
    }

    playSong({
      id: 'apple-preview-' + track.trackId,
      name: track.trackName,
      uri: track.previewUrl,
      artist: track.artistName,
      album: track.collectionName || 'Apple catalog',
      artworkUri: track.artworkUrl100 || '',
    });
  }

  function togglePlayback() {
    if (!currentSong) {
      if (songs.length > 0) playSong(songs[0]);
      else void addSongs();
    } else if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

function playNext() {
  if (songs.length === 0) {
    void addSongs();
    return;
  }

  const index = songs.findIndex(
    song => song.id === currentSong?.id
  );
  if (shuffle && songs.length > 1) {
    const choices = songs.filter(song => song.id !== currentSong?.id);
    playSong(choices[Math.floor(Math.random() * choices.length)]);
    return;
  }
  playSong(songs[index < 0 ? 0 : (index + 1) % songs.length]);
}

function playPrevious() {
  if (songs.length === 0) {
    void addSongs();
    return;
  }

  const index = songs.findIndex(
    song => song.id === currentSong?.id
  );

  playSong(
    songs[index <= 0 ? songs.length - 1 : index - 1]
  );
}

  function toggleFavorite(id: string) {
    setFavorites(previous =>
      previous.includes(id)
        ? previous.filter(item => item !== id)
        : [...previous, id]
    );
  }

  const finishedTrackId = React.useRef<string | null>(null);

  useEffect(() => {
    if (!status.didJustFinish || !currentSong || songs.length === 0) {
      if (!status.didJustFinish) finishedTrackId.current = null;
      return;
    }

    // Handle each completed track only once.
    if (finishedTrackId.current === currentSong.id) return;
    finishedTrackId.current = currentSong.id;

    if (repeatMode === 'one') {
      void player.seekTo(0);
      player.play();
      return;
    }

    const currentIndex = songs.findIndex(song => song.id === currentSong.id);
    const hasNextTrack = shuffle ||
      (currentIndex >= 0 && currentIndex < songs.length - 1);

    if (hasNextTrack) {
      playNext();
    } else if (repeatMode === 'all' && songs.length > 0) {
      playSong(songs[0]);
    }
    // Repeat off: stop naturally after the final track.
  }, [status.didJustFinish, currentSong, songs, repeatMode, shuffle]);

  useEffect(() => {
    setLyricsDraft(currentSong?.lyrics ?? '');
    setArtistDraft(currentSong?.artist ?? 'Unknown artist');
    setAlbumDraft(currentSong?.album ?? 'Local music');
    setArtworkDraft(currentSong?.artworkUri ?? '');
  }, [currentSong?.id]);

  function saveSongDetails() {
    if (!currentSong) {
      Alert.alert('No song selected', 'Play a song first, then edit its details.');
      return;
    }
    const updated = { ...currentSong, artist: artistDraft.trim() || 'Unknown artist', album: albumDraft.trim() || 'Local music', lyrics: lyricsDraft, artworkUri: artworkDraft.trim() };
    setSongs(previous => previous.map(song => song.id === currentSong.id ? updated : song));
    setCurrentSong(updated);
    Alert.alert('Saved', 'Song details and lyrics have been saved to your local library.');
  }

  
  async function scanDeviceAudio() {
    if (isScanning) return;

    setIsScanning(true);
    try {
      let permission = await MediaLibrary.getPermissionsAsync(
        false,
        ['audio']
      );

      if (!permission.granted) {
        permission = await MediaLibrary.requestPermissionsAsync(
          false,
          ['audio']
        );
      }

      if (!permission.granted) {
        Alert.alert(
          'Music permission needed',
          'Allow Trouper Player to access audio files in Android settings, then scan again.'
        );
        return;
      }

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['audio'],
        first: 1000,
      });
      setHasScannedAudio(true);

      const discovered = result.assets.map(asset => ({
        id: 'device-' + asset.id,
        name: asset.filename.replace(/\.[^/.]+$/, ''),
        uri: asset.uri,
        artist: 'Unknown artist',
        album: 'Local music',
        lyrics: '',
        artworkUri: '',
      }));

      setSongs(previous => {
        const knownUris = new Set(previous.map(song => song.uri));
        const newSongs = discovered.filter(song => !knownUris.has(song.uri));
        return [...previous, ...newSongs];
      });

      setShowFavorites(false);

    } catch (error) {
      console.warn('Device audio scan failed:', error);
      Alert.alert(
        'Audio scan failed',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsScanning(false);
    }
  }

const visibleSongs = useMemo(() => {
    let result = songs;

    if (showFavorites) {
      result = result.filter(song => favorites.includes(song.id));
    }

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(song =>
        song.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [songs, search, showFavorites, favorites]);

  function SongRow({ item }: { item: Song }) {
    const active = currentSong?.id === item.id;
    const liked = favorites.includes(item.id);

    return (
      <View style={styles.songRow}>
        <TouchableOpacity
          style={styles.songMain}
          activeOpacity={0.75}
          onPress={() => playSong(item)}
        >
          <View style={[styles.art, active && styles.activeArt]}>
            {item.artworkUri ? <Image source={{ uri: item.artworkUri }} style={{ width: 46, height: 46, borderRadius: 13 }} resizeMode="cover" /> : <Text style={styles.artNote}>{active && status.playing ? '♫' : '♪'}</Text>}
          </View>
          <View style={styles.grow}>
            <Text numberOfLines={1} style={styles.songName}>
              {item.name}
            </Text>
            <Text style={styles.smallMuted}>
              {active && status.playing ? 'NOW PLAYING' : 'LOCAL AUDIO'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleFavorite(item.id)}
          style={styles.iconButton}
          accessibilityLabel={liked ? 'Remove favorite' : 'Add favorite'}
        >
          <Text style={[styles.heart, liked && styles.heartActive]}>
            {liked ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => playSong(item)}
          style={styles.trackPlay}
          accessibilityLabel="Play song"
        >
          <Text style={styles.blueText}>{active && status.playing ? '♫' : '▶'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function SectionTitle({ title, action, onPress }: {
    title: string;
    action?: string;
    onPress?: () => void;
  }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action ? (
          <TouchableOpacity onPress={onPress}>
            <Text style={[styles.link, { color: accent }]}>{action}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  function renderHome() {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 22,
          }}>
            <Text style={{
              color: '#F7F7F7',
              fontSize: 27,
              fontWeight: '900',
              letterSpacing: -0.8,
            }}>
              Trouper Player
            </Text>
            <TouchableOpacity
              onPress={() => navigateToTab('Search')}
              style={{ padding: 8 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 29 }}>⌕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', gap: 10, paddingBottom: 8 }}
          >
            <TouchableOpacity
              onPress={() => navigateToTab('Videos')}
              style={{ backgroundColor: '#0B1422', borderRadius: 28, paddingHorizontal: 19, paddingVertical: 12 }}
            >
              <Text style={{ color: '#A9B8CC', fontSize: 16, fontWeight: '700' }}>▣ Videos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigateToTab('Home')}
              style={{ backgroundColor: '#FFCC00', borderRadius: 28, paddingHorizontal: 22, paddingVertical: 12 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>♫ Songs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigateToTab('Playlists')}
              style={{ backgroundColor: '#0B1422', borderRadius: 28, paddingHorizontal: 19, paddingVertical: 12 }}
            >
              <Text style={{ color: '#A9B8CC', fontSize: 16, fontWeight: '700' }}>Playlists</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigateToTab('Library')}
              style={{ backgroundColor: '#0B1422', borderRadius: 28, paddingHorizontal: 19, paddingVertical: 12 }}
            >
              <Text style={{ color: '#A9B8CC', fontSize: 16, fontWeight: '700' }}>Folders</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        

        {songs.length === 0 ? (
          <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            <View style={{
              width: 110,
              height: 110,
              borderRadius: 25,
              backgroundColor: '#171717',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 35,
              marginBottom: 20,
            }}>
              <Text style={{ color: '#777777', fontSize: 48 }}>♫</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '800', textAlign: 'center' }}>
              No songs loaded yet
            </Text>
            <Text style={{ color: '#999999', textAlign: 'center', marginTop: 9, lineHeight: 21 }}>
              Add music from your phone to see your tracks here.
            </Text>
            <TouchableOpacity
              onPress={scanDeviceAudio}
              style={{ backgroundColor: '#FFCC00', paddingHorizontal: 23, paddingVertical: 13, borderRadius: 25, marginTop: 20 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>＋ Add music</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={[...songs].reverse()}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 18 }}>
                <SongRow item={item} />
              </View>
            )}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          />
        )}
      </View>
    );
  }

  function renderSearch() {
    return (
      <View style={styles.pageContent}>
        <Text style={styles.pageTitle}>Search</Text>
        <Text style={styles.muted}>Find a track in your collection.</Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your music..."
            placeholderTextColor="#718198"
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <SectionTitle title={search ? 'Search results' : 'Your tracks'} />

        
{visibleSongs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>
              {songs.length === 0 ? 'No music yet' : 'No matches found'}
            </Text>
            <Text style={styles.emptyText}>
              {songs.length === 0
                ? 'Add audio files to search your collection.'
                : 'Try another song title.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleSongs}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <SongRow item={item} />}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.searchResults}
          />
        )}
      </View>
    );
  }

  function renderLibrary() {
   return (
     <View style={[styles.container, { flex: 1 }]}>


        <Text style={styles.pageTitle}>Collection</Text>
        <Text style={styles.muted}>
          Choose what you want to listen to.
        </Text>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 16,
          marginBottom: 15,
        }}>
          <TouchableOpacity
            onPress={() => setShowFavorites(false)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 13,
              alignItems: 'center',
              backgroundColor: !showFavorites ? accent : PANEL,
              borderWidth: 1,
              borderColor: !showFavorites ? accent : '#292929',
            }}
          >
            <Text style={{
              color: !showFavorites ? '#000000' : '#C3D0E3',
              fontWeight: '900',
              fontSize: 12,
            }}>
              ♫  All songs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowFavorites(true)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 13,
              alignItems: 'center',
              backgroundColor: showFavorites ? '#6D244F' : PANEL,
              borderWidth: 1,
              borderColor: showFavorites ? '#FFCC00' : '#292929',
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontWeight: '900',
              fontSize: 12,
            }}>
              ♥  Favorites
            </Text>
          </TouchableOpacity>
        </View>

        {visibleSongs.length === 0 ? (
          <View style={{
            backgroundColor: PANEL,
            borderRadius: 21,
            padding: 25,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: accent,
            marginTop: 5,
          }}>
            <LinearGradient
              colors={['#FFCC00', '#B88600']}
              style={{
                width: 76,
                height: 76,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 17,
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 37,
                fontWeight: '900',
              }}>
                {showFavorites ? '♥' : '♫'}
              </Text>
            </LinearGradient>

            <Text style={{
              color: '#FFFFFF',
              fontSize: 19,
              fontWeight: '900',
              textAlign: 'center',
            }}>
              {showFavorites ? 'No favorites yet' : 'Your music starts here'}
            </Text>

            <Text style={{
              color: MUTED,
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 21,
              marginTop: 9,
            }}>
              {showFavorites
                ? 'Use the favorite button on a track to collect it here.'
                : 'Import audio files from your phone to build your collection.'}
            </Text>

            {!showFavorites && (
              <TouchableOpacity
                onPress={scanDeviceAudio}
                style={{
                  backgroundColor: accent,
                  borderRadius: 12,
                  paddingHorizontal: 22,
                  paddingVertical: 13,
                  marginTop: 19,
                }}
              >
                <Text style={{
                  color: '#000000',
                  fontWeight: '900',
                }}>
                  Choose audio files
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={visibleSongs}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <SongRow item={item} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.searchResults}
          />
        )}
      </View>
    );
  }

function createPlaylist() {
    const name = playlistName.trim();
    if (!name) return;

    setPlaylists(current => [
      ...current,
      {
        id: `${Date.now()}`,
        name,
        songIds: [],
      },
    ]);
    setPlaylistName('');
  }

  function renderPlaylists() {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Your playlists</Text>
        <Text style={styles.muted}>
          Organize your favourite music your way.
        </Text>

        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>＋ Create a playlist</Text>
          <TextInput
            value={playlistName}
            onChangeText={setPlaylistName}
            placeholder="Playlist name"
            placeholderTextColor={MUTED}
            style={styles.searchInput}
          />
          <TouchableOpacity
            onPress={createPlaylist}
            style={styles.outlineButton}
          >
            <Text style={[styles.link, { color: accent }]}>
              Create playlist
            </Text>
          </TouchableOpacity>
        </View>

        {playlists.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>♫</Text>
            <Text style={styles.emptyText}>
              <Text style={styles.emptyTitle}>No playlists yet</Text>
              {'\n'}Create your first playlist above.
            </Text>
          </View>
        ) : (
          playlists.map(playlist => (
            <View key={playlist.id} style={styles.profileCard}>
              <Text style={styles.profileTitle}>{playlist.name}</Text>
              <Text style={styles.smallMuted}>
                {playlist.songIds.length} tracks
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  const [settingsPage, setSettingsPage] = useState<'main' | 'account' | 'audio'>('main');

  function renderSettings() {
    const row = (
      icon: string,
      title: string,
      subtitle: string,
      action: () => void
    ) => (
      <TouchableOpacity
        key={title}
        onPress={action}
        activeOpacity={0.75}
        style={{
          minHeight: 88,
          backgroundColor: '#101010',
          borderRadius: 15,
          paddingHorizontal: 20,
          paddingVertical: 15,
          marginBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{
          color: '#F5F5F5',
          fontSize: 29,
          width: 54,
          textAlign: 'left',
        }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#F7F7F7', fontSize: 19, fontWeight: '500' }}>
            {title}
          </Text>
          <Text style={{ color: '#A8A8A8', fontSize: 15, marginTop: 4 }}>
            {subtitle}
          </Text>
        </View>
        <Text style={{ color: '#DADADA', fontSize: 30, marginLeft: 8 }}>›</Text>
      </TouchableOpacity>
    );

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 35,
          backgroundColor: '#000000',
          flexGrow: 1,
        }}
        style={{ backgroundColor: '#000000' }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
          minHeight: 48,
        }}>
          {settingsPage !== 'main' && (
            <TouchableOpacity
              onPress={() => setSettingsPage('main')}
              style={{ marginRight: 20, paddingVertical: 5 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 30 }}>‹</Text>
            </TouchableOpacity>
          )}
          <Text style={{
            color: '#FFFFFF',
            fontSize: 29,
            fontWeight: '600',
            flex: 1,
          }}>
            {settingsPage === 'account' ? 'Account' : settingsPage === 'audio' ? 'Audio' : 'Settings'}
          </Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Trouper Player', 'Settings')}
            style={{ paddingHorizontal: 4, paddingVertical: 5 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 26 }}>⋮</Text>
          </TouchableOpacity>
        </View>

        {settingsPage === 'main' ? (
          <>
            {row('🌐', 'Account', 'Google', () => setSettingsPage('account'))}
            {row(
              '▣',
              'Storage',
              `${songs.length} songs · ${playlists.length} playlists`,
              () => Alert.alert(
                'Your library',
                `Local songs: ${songs.length}\nPlaylists: ${playlists.length}\nFavorites: ${favorites.length}\nVideos found: ${videos.length}\n\nYour media files remain stored on your device.`
              )
            )}
            {row('🔊', 'Audio', 'Playback & quality', () => setSettingsPage('audio'))}
            {row('▣', 'Videos', 'Playback & quality', () =>
              Alert.alert('Videos', 'Video playback settings.')
            )}
            {row('♫', 'Lyrics', 'Display & sync', () =>
              navigateToTab('Lyrics')
            )}
            {row('♧', 'Notifications', 'Manage alerts', () =>
              Alert.alert('Notifications', 'Notification preferences.')
            )}
            {row('◉', 'Theme', 'Dark', () =>
              Alert.alert('Theme', 'Dark theme is currently selected.')
            )}
            {row('ⓘ', 'About Trouper Player', 'Version 1.0.0', () =>
              Alert.alert(
                'About Trouper Player',
                'Version 1.0.0\\nAll Your Media. One Player.'
              )
            )}
          </>
        ) : settingsPage === 'audio' ? (
          <View>
            <Text style={{ color: '#A8A8A8', fontSize: 14, marginBottom: 14 }}>
              Playback preferences
            </Text>

            <TouchableOpacity
              onPress={() => setShuffle(value => !value)}
              style={{ backgroundColor: '#101010', borderRadius: 14, padding: 18, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>Shuffle</Text>
                <Text style={{ color: '#A8A8A8', marginTop: 4 }}>Play tracks in random order</Text>
              </View>
              <Text style={{ color: shuffle ? '#7DB7FF' : '#777777', fontWeight: '800' }}>{shuffle ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>

            <View style={{ backgroundColor: '#101010', borderRadius: 14, padding: 18, marginBottom: 18 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>Repeat mode</Text>
              {(['off', 'all', 'one'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setRepeatMode(mode)}
                  style={{ paddingVertical: 13, borderBottomWidth: mode === 'one' ? 0 : 1, borderBottomColor: '#292929', flexDirection: 'row', justifyContent: 'space-between' }}
                >
                  <Text style={{ color: '#EEEEEE', fontSize: 15 }}>
                    {mode === 'off' ? 'Off' : mode === 'all' ? 'Repeat all tracks' : 'Repeat current track'}
                  </Text>
                  <Text style={{ color: repeatMode === mode ? '#7DB7FF' : '#777777', fontWeight: '800' }}>
                    {repeatMode === mode ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '700', marginBottom: 4 }}>Equaliser preset</Text>
            <Text style={{ color: '#A8A8A8', fontSize: 13, marginBottom: 10 }}>
              Select a saved preference. Actual sound effects require a native audio-effects module.
            </Text>
            {['Flat', 'Bass boost', 'Vocal', 'Treble', 'Rock', 'Classical'].map(preset => (
              <TouchableOpacity
                key={preset}
                onPress={() => setEqualiserPreset(preset)}
                style={{ backgroundColor: '#101010', borderRadius: 12, padding: 15, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{preset}</Text>
                <Text style={{ color: equaliserPreset === preset ? '#7DB7FF' : '#777777' }}>
                  {equaliserPreset === preset ? '✓ Selected' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{

            backgroundColor: '#101010',
            borderRadius: 16,
            padding: 22,
            alignItems: 'center',
            marginTop: 4,
          }}>
            <View style={{
              width: 74,
              height: 74,
              borderRadius: 37,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}>
              <Text style={{ fontSize: 43, fontWeight: '700', color: '#4285F4' }}>
                G
              </Text>
            </View>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 23,
              fontWeight: '600',
              marginBottom: 8,
            }}>Google Account</Text>
            <Text style={{
              color: '#AAAAAA',
              fontSize: 15,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              {googleUser ? `Signed in as ${googleUser.email}${googleUser.name ? ' · ' + googleUser.name : ''}` : 'Sign in with Google to show the selected Google account.'}
            </Text>
            <TouchableOpacity
              onPress={googleUser ? handleGoogleSignOut : handleGoogleSignIn}
              disabled={googleBusy}
              style={{
                marginTop: 22,
                borderRadius: 12,
                backgroundColor: '#202020',
                paddingVertical: 14,
                paddingHorizontal: 18,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                {googleBusy ? 'Please wait...' : googleUser ? 'Sign out of Google' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  function renderLyrics() {
    return (
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Lyrics</Text>
        <Text style={styles.muted}>{currentSong?.name ?? 'No song selected'} · full-page lyrics</Text>
        <TextInput
          value={lyricsDraft}
          onChangeText={setLyricsDraft}
          placeholder="Paste or type lyrics for the current song here..."
          placeholderTextColor="#718198"
          multiline
          textAlignVertical="top"
          style={{ color: '#FFFFFF', backgroundColor: PANEL, borderColor: accent, borderWidth: 1, borderRadius: 18, padding: 16, minHeight: 330, marginTop: 20, fontSize: 15, lineHeight: 25 }}
        />
        <TouchableOpacity onPress={saveSongDetails} style={{ backgroundColor: accent, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 14 }}>
          <Text style={{ color: '#000000', fontWeight: '900' }}>Save lyrics</Text>
        </TouchableOpacity>
        <Text style={styles.muted}>Lyrics are saved to the selected track in the current app session. Automatic online lyrics retrieval is not connected yet.</Text>
      </ScrollView>
    );
  }

  function renderEqualiser() {
    const presets = ['Flat', 'Bass boost', 'Vocal', 'Treble', 'Rock', 'Classical'];
    return (
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text style={styles.pageTitle}>Equaliser</Text>
        <Text style={styles.muted}>Choose a listening preset.</Text>
        {presets.map(preset => (
          <TouchableOpacity key={preset} onPress={() => setEqualiserPreset(preset)} style={{ padding: 16, borderRadius: 14, marginTop: 10, backgroundColor: equaliserPreset === preset ? '#211B00' : PANEL, borderWidth: 1, borderColor: equaliserPreset === preset ? accent : '#292500' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{equaliserPreset === preset ? '✓  ' : ''}{preset}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ backgroundColor: '#1A1720', borderRadius: 12, padding: 14, marginTop: 18 }}>
          <Text style={{ color: '#FFD08A', fontWeight: '800' }}>Audio effect note</Text>
          <Text style={styles.muted}>The selected preset is saved in the interface, but Expo Audio does not expose Android band-level equaliser effects directly. A native equaliser module is needed to change the actual sound.</Text>
        </View>
      </ScrollView>
    );
  }

  function renderAlbumEditor() {
    return (
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Album editor</Text>
        <Text style={styles.muted}>Edit metadata for the currently playing song.</Text>
        {!currentSong ? <Text style={styles.muted}>Play a song first to edit its details.</Text> : <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{currentSong.name}</Text>}
        <Text style={{ color: '#BDBDBD', marginTop: 16, marginBottom: 6, fontSize: 11 }}>Artist</Text>
        <TextInput value={artistDraft} onChangeText={setArtistDraft} placeholder="Artist name" placeholderTextColor="#718198" style={[styles.searchInput, { backgroundColor: PANEL, borderRadius: 12, paddingHorizontal: 13 }]} />
        <Text style={{ color: '#BDBDBD', marginTop: 12, marginBottom: 6, fontSize: 11 }}>Album</Text>
        <TextInput value={albumDraft} onChangeText={setAlbumDraft} placeholder="Album name" placeholderTextColor="#718198" style={[styles.searchInput, { backgroundColor: PANEL, borderRadius: 12, paddingHorizontal: 13 }]} />
        <Text style={{ color: '#BDBDBD', marginTop: 12, marginBottom: 6, fontSize: 11 }}>Cover image URI (optional)</Text>
        <TextInput value={artworkDraft} onChangeText={setArtworkDraft} placeholder="https://... or local image URI" placeholderTextColor="#718198" autoCapitalize="none" style={[styles.searchInput, { backgroundColor: PANEL, borderRadius: 12, paddingHorizontal: 13 }]} />
        <TouchableOpacity onPress={saveSongDetails} style={{ backgroundColor: accent, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 }}><Text style={{ color: '#000000', fontWeight: '900' }}>Save song details</Text></TouchableOpacity>
        <Text style={styles.muted}>This edits Trouper Player’s metadata. It does not rewrite tags embedded in the original audio file.</Text>
      </ScrollView>
    );
  }


  async function scanDeviceVideos() {
    if (isScanningVideos) return;
    setIsScanningVideos(true);
    try {
      let permission = await MediaLibrary.getPermissionsAsync(false, ['video']);
      if (!permission.granted) {
        permission = await MediaLibrary.requestPermissionsAsync(false, ['video']);
      }
      if (!permission.granted) {
        Alert.alert('Video permission needed', 'Allow Trouper Player to access videos in Android settings, then scan again.');
        return;
      }

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['video'],
        first: 1000,
        sortBy: ['creationTime'],
      });

      setVideos(result.assets.map(asset => ({
        id: asset.id,
        name: asset.filename.replace(/\.[^/.]+$/, ''),
        uri: asset.uri,
        duration: asset.duration || 0,
      })));
      setHasScannedVideos(true);
    } catch (error) {
      setHasScannedVideos(true);
      console.warn('Video scan failed:', error);
      Alert.alert(
        'Video scan failed',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsScanningVideos(false);
    }
  }

  function renderVideos() {
    if (currentVideo) {
      return <TrouperVideoPlayer video={currentVideo} onClose={() => setCurrentVideo(null)} />;
    }

    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 18 }}>
        <Text style={{ color: '#F5F8FF', fontSize: 25, fontWeight: '900' }}>Your videos</Text>
        <Text style={{ color: '#91A4BF', marginTop: 5, marginBottom: 16 }}>Videos saved on this device</Text>
        {videos.length === 0
          ? <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: '#FFF176', fontSize: 38 }}>▣</Text>
              <Text style={{ color: '#F5F8FF', fontWeight: '800', marginTop: 10 }}>No videos loaded</Text>
              <Text style={{ color: '#91A4BF', textAlign: 'center', marginTop: 6 }}>Videos on your phone will appear here automatically.</Text>
            </View>
          : <FlatList
              data={videos}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => <VideoThumbnailCard video={item} onPress={() => setCurrentVideo(item)} />}
              showsVerticalScrollIndicator={false}
            />}
      </View>
    );
  }

  
  if (showFullPlayer && currentSong) {
    return (
      <SafeAreaView
        {...playerDismissPanResponder.panHandlers}
        style={[styles.container, { backgroundColor: '#000000' }]}
      >
        <StatusBar style="light" />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 0, paddingVertical: 0 }}>
          <View
            {...playerDismissPanResponder.panHandlers}
            accessibilityLabel="Swipe down to close player"
            style={{
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
            }}
          >
            <View
              style={{
                width: 42,
                height: 5,
                borderRadius: 4,
                backgroundColor: '#52627A',
              }}
            />
          </View>
          <MusicControls
            songTitle={currentSong.name}
            artworkUri={currentSong.artworkUri || ''}
          artistName={(currentSong as any).artistName || (currentSong as any).artist || 'Local track'}
          isFavorite={favorites.includes(currentSong.id)}
          onToggleFavorite={() => setFavorites(previous =>
            previous.includes(currentSong.id)
              ? previous.filter(id => id !== currentSong.id)
              : [...previous, currentSong.id]
          )}
            isPlaying={!!status.playing}
            currentTime={status.currentTime || 0}
            duration={status.duration || 0}
            onPlayPause={togglePlayback}
            onPrevious={playPrevious}
            onNext={playNext}
            shuffle={shuffle}
            repeatMode={repeatMode}
            onToggleShuffle={() => setShuffle(value => !value)}
            onCycleRepeat={() => setRepeatMode(value => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off')}
            onSeek={(delta: number) => {
              const duration = status.duration || 0;
              const nextTime = Math.max(0, Math.min(duration || Infinity, (status.currentTime || 0) + delta));
              void player.seekTo(nextTime);
            }}
            onOpenLyrics={() => { setShowFullPlayer(false); navigateToTab('Lyrics'); }}
            onOpenEqualiser={() => { setShowFullPlayer(false); navigateToTab('Equaliser'); }}
            accent={accent}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

return (                                                        <SafeAreaView style={[styles.container, { backgroundColor: '#000000', paddingTop: 30 }]}>

      <StatusBar style="light" />

      <View style={styles.topBar}>
        <View style={[styles.brandMark, { borderColor: accent }]}>
          <Text style={[styles.brandMarkText, { color: accent }]}>♫</Text>
        </View>
        <View style={styles.brandWords}>
          <Text style={styles.brand}>TROUPER</Text>
          <Text style={[styles.brandSub, { color: accent }]}>PLAYER</Text>
        </View>
        <View style={styles.topSpacer} />
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>MUSIC</Text>
        </View>
      </View>

      <View style={styles.screen}>
        {tab === 'Home' && renderHome()}
        {tab === 'Search' && renderSearch()}
        {tab === 'Library' && renderLibrary()}
        {tab === 'Videos' && renderVideos()}
        {tab === 'Playlists' && renderPlaylists()}
        {tab === 'Lyrics' && renderLyrics()}
        {tab === 'Equaliser' && renderEqualiser()}
        {tab === 'Album editor' && renderAlbumEditor()}
        {tab === 'Settings' && renderSettings()}
      </View>

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.miniPlayer}
          activeOpacity={0.85}
          onPress={() => {
            if (!currentSong && songs.length > 0) playSong(songs[0]);
            else if (!currentSong) void addSongs();
            setShowFullPlayer(true);
          }}
        >
          <View style={styles.miniArt}>
            {currentSong?.artworkUri ? <Image source={{ uri: currentSong.artworkUri }} style={{ width: 39, height: 39, borderRadius: 11 }} resizeMode="cover" /> : <Text style={styles.miniNote}>♫</Text>}
          </View>
          <View style={styles.grow}>
            <Text numberOfLines={1} style={styles.miniSong}>
              {currentSong?.name ?? 'Nothing playing yet'}
            </Text>
            <Text style={styles.miniSubtitle}>
              {currentSong ? 'YOUR LOCAL MUSIC' : 'PICK A TRACK TO BEGIN'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.miniPlay}
            onPress={togglePlayback}
            accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          >
            <Text style={styles.miniPlayText}>{status.playing ? 'Ⅱ' : '▶'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  status.duration > 0
                    ? Math.min(100, (status.currentTime / status.duration) * 100)
                    : 0
                }%`,
              },
            ]}
          />
        </View>  
          
        <View style={styles.bottomTabs}>
          {([
            { name: 'Home', icon: '⌂' },
            { name: 'Search', icon: '⌕' },
            { name: 'Library', icon: '▤' },
            { name: 'Videos', icon: '▣' },
            { name: 'Settings', icon: '⚙' },
          ] as { name: Tab; icon: string }[]).map(item => {
            const active = tab === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => navigateToTab(item.name)}
                style={styles.tabItem}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
                <Text numberOfLines={1} style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {item.name}
                </Text>
                {active ? <View style={styles.tabIndicator} /> : <View style={styles.indicatorSpace} />}
              </TouchableOpacity>
            );
          })}
        </View>
        </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  searchResults: {
    flexGrow: 1,
    paddingBottom: 180,
  },

  bottomTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#000000',
  },
  
  container: { flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 19,
    paddingTop: 9,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2A40',
  },
  brandMark: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#31577F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: BLUE, fontSize: 25, fontWeight: '900' },
  brandWords: { marginLeft: 10 },
  brand: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  brandSub: { color: BLUE, fontSize: 9, fontWeight: '800', letterSpacing: 4 },
  topSpacer: { flex: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#101010',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFCC00' },
  liveText: { color: '#BDBDBD', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  screen: { flex: 1 },
  pageContent: { paddingHorizontal: 19, paddingTop: 20, paddingBottom: 20, flexGrow: 1 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  eyebrow: { color: BLUE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heading: { color: '#FFFFFF', fontSize: 29, fontWeight: '900', marginTop: 8 },
  muted: { color: MUTED, fontSize: 12, marginTop: 5, lineHeight: 18 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#101010', borderWidth: 1, borderColor: '#665500', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: BLUE, fontWeight: '900', fontSize: 14 },
  featureCard: {
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 20,
    minHeight: 218,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFCC00',
    marginBottom: 17,
    shadowOffset: { width: 0, height: 0 },
  },
  featureOrb: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 83,
    height: 83,
    borderRadius: 28,
    backgroundColor: '#211B00',
    borderWidth: 1,
    borderColor: '#386A9C',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  featureNote: { color: '#FFCC00', fontSize: 48, fontWeight: '900' },
  featureLabel: { color: '#FFCC00', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  featureTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 17 },
  featureDescription: { color: '#BDBDBD', fontSize: 11, marginTop: 6 },
  primaryButton: { backgroundColor: BLUE, borderRadius: 12, alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 11, marginTop: 18 },
  primaryButtonText: { color: '#000000', fontWeight: '900', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 9, marginBottom: 26 },
  statCard: { flex: 1, backgroundColor: PANEL, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, borderWidth: 1, borderColor: '#303030' },
  statNumber: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  statLabel: { color: '#999999', fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginTop: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  link: { color: BLUE, fontSize: 11, fontWeight: '800' },
  emptyCard: { backgroundColor: '#101010', borderRadius: 19, borderWidth: 1, borderColor: '#303030', padding: 22, alignItems: 'center', marginTop: 6 },
  emptyIcon: { color: BLUE, fontSize: 37, marginBottom: 9 },
  emptyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 11, textAlign: 'center', lineHeight: 18, marginTop: 7 },
  outlineButton: { borderWidth: 1, borderColor: '#315477', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10, marginTop: 15 },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 5 },
  songMain: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 11 },
  art: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#101010', alignItems: 'center', justifyContent: 'center' },
  activeArt: { backgroundColor: '#252000', borderWidth: 1, borderColor: '#FFCC00' },
  artNote: { color: BLUE, fontSize: 23, fontWeight: '800' },
  grow: { flex: 1 },
  songName: { color: '#F4F7FC', fontSize: 12, fontWeight: '800' },
  smallMuted: { color: '#999999', fontSize: 8, fontWeight: '700', letterSpacing: 0.6, marginTop: 5 },
  iconButton: { paddingHorizontal: 7, paddingVertical: 8 },
  heart: { color: '#999999', fontSize: 21 },
  heartActive: { color: '#FFCC00' },
  trackPlay: { width: 30, alignItems: 'center', paddingVertical: 8 },
  blueText: { color: BLUE, fontSize: 14, fontWeight: '900' },
  pageTitle: { color: '#FFFFFF', fontSize: 29, fontWeight: '900' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#101010', borderWidth: 1, borderColor: '#303030', borderRadius: 15, paddingHorizontal: 13, marginTop: 21, marginBottom: 24, minHeight: 49 },
  searchIcon: { color: BLUE, fontSize: 25, marginRight: 9 },
  searchInput: { color: '#FFFFFF', flex: 1, fontSize: 12, paddingVertical: 12 },
  clearText: { color: MUTED, fontSize: 16, padding: 5 },
  libraryActions: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20, marginBottom: 18 },
  filterChip: { borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#101010', borderWidth: 1, borderColor: '#303030' },
  filterActive: { backgroundColor: '#211B00', borderColor: '#FFCC00' },
  filterText: { color: '#BDBDBD', fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFCC00' },
  addSmall: { marginLeft: 'auto', backgroundColor: BLUE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  addSmallText: { color: '#000000', fontSize: 10, fontWeight: '900' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: PANEL, borderRadius: 18, borderWidth: 1, borderColor: '#303030', padding: 16, gap: 13, marginTop: 22, marginBottom: 27 },
  largeAvatar: { width: 53, height: 53, borderRadius: 17, backgroundColor: '#171400', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#665500' },
  largeAvatarText: { color: '#FFCC00', fontWeight: '900', fontSize: 18 },
  profileTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  settingsCard: { backgroundColor: PANEL, borderRadius: 17, borderWidth: 1, borderColor: '#303030', paddingHorizontal: 14, marginBottom: 26 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  settingIcon: { color: BLUE, fontSize: 20, width: 26, textAlign: 'center' },
  settingTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  settingDescription: { color: MUTED, fontSize: 10, marginTop: 4 },
  settingDivider: { height: 1, backgroundColor: '#253348' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFCC00' },
  aboutCard: { backgroundColor: '#101010', borderWidth: 1, borderColor: '#1D2D43', borderRadius: 16, padding: 16 },
  aboutTitle: { color: BLUE, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  aboutText: { color: MUTED, fontSize: 11, lineHeight: 18, marginTop: 10 },
  version: { color: '#777777', fontSize: 8, fontWeight: '800', letterSpacing: 0.5, marginTop: 16 },
  bottomArea: { backgroundColor: BG, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 2, borderTopWidth: 1, borderTopColor: '#303030' },
  miniPlayer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#101010', borderRadius: 15, padding: 10, borderWidth: 1, borderColor: '#303030' },
  miniArt: { width: 39, height: 39, borderRadius: 11, backgroundColor: '#101010', alignItems: 'center', justifyContent: 'center' },
  miniNote: { color: BLUE, fontSize: 22, fontWeight: '900' },
  miniSong: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  miniSubtitle: { color: '#999999', fontSize: 7, fontWeight: '800', letterSpacing: 0.7, marginTop: 4 },
  miniPlay: { width: 37, height: 37, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  miniPlayText: { color: '#000000', fontSize: 15, fontWeight: '900' },
  progressTrack: { height: 2, backgroundColor: '#292929', overflow: 'hidden' },
  progressFill: { height: 2, backgroundColor: BLUE },
  tabBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 6, paddingBottom: 3 },
  tabItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingTop: 3, paddingHorizontal: 1 },
  tabIcon: { color: '#777777', fontSize: 21, height: 25 },
  tabIconActive: { color: BLUE },
  tabLabel: { color: '#777777', fontSize: 9, fontWeight: '700', marginTop: 1, textAlign: 'center' },
  tabLabelActive: { color: '#FFCC00', fontWeight: '900' },
  tabIndicator: { width: 15, height: 2, borderRadius: 2, backgroundColor: '#000000', marginTop: 5 },
  indicatorSpace: { height: 7, marginTop: 0 },
});
