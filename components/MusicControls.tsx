import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BLUE = '#1683FF';
const GOLD = '#FFD400';
const WHITE = '#FFF8FA';
const MUTED = '#D0C2CD';

type MusicControlsProps = {
  artistName?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  songTitle: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onSeek: (seconds: number) => void;
  onOpenLyrics: () => void;
  onOpenEqualiser: () => void;
  accent: string;
  artworkUri: string;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds);
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function MusicControls({
  artistName = 'Local track',
  isFavorite,
  onToggleFavorite,
  songTitle,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onPrevious,
  onNext,
  shuffle,
  repeatMode,
  onToggleShuffle,
  onCycleRepeat,
  onSeek,
  onOpenLyrics,
  onOpenEqualiser,
  artworkUri,
}: MusicControlsProps) {
  const progress =
    duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const [trackWidth, setTrackWidth] = useState(1);

  return (
    <LinearGradient
      colors={['#1683FF', '#34527F', '#FFD400']}
      locations={[0, 0.48, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.border}
    >
      <View style={styles.panel}>
        <View style={styles.topLine} />

        <View style={styles.header}>
          <View style={styles.source}>
            <Text style={styles.sourceIcon}>◉</Text>
            <Text style={styles.sourceText}>This phone</Text>
          </View>
          <View style={styles.outputPill}>
            <Text style={styles.outputText}>♫  TrouperPlayer</Text>
          </View>
        </View>

        <View style={styles.trackRow}>
          <View style={styles.artworkWrap}>
            {artworkUri ? (
              <Image source={{ uri: artworkUri }} style={styles.artwork} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={['#173D75', '#102038', '#66520A']}
                style={styles.artworkFallback}
              >
                <Text style={styles.musicNote}>♫</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.titleFavoriteRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{songTitle || 'Nothing playing'}</Text>
              <Text numberOfLines={2} style={styles.artist}>{artistName}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              onPress={onToggleFavorite}
              activeOpacity={0.75}
              style={styles.favoriteButton}
            >
              <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteActive]}>
                {isFavorite ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={styles.seekArea}
          onLayout={event => setTrackWidth(Math.max(1, event.nativeEvent.layout.width))}
          onTouchStart={event => {
            const target = duration > 0
              ? Math.max(0, Math.min(duration, duration * event.nativeEvent.locationX / trackWidth))
              : 0;
            onSeek(target - currentTime);
          }}
          onTouchMove={event => {
            const target = duration > 0
              ? Math.max(0, Math.min(duration, duration * event.nativeEvent.locationX / trackWidth))
              : 0;
            onSeek(target - currentTime);
          }}
          accessibilityLabel="Drag to seek through the song"
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
              <View style={styles.progressKnob} />
            </View>
          </View>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
            onPress={onToggleShuffle}
            style={styles.smallControl}
          >
            <Text style={[styles.controlIcon, shuffle && styles.activeIcon]}>
              ⤨
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Previous track"
            onPress={onPrevious}
            style={styles.mainControl}
          >
            <Text style={styles.controlIcon}>|◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause music' : 'Play music'}
            onPress={onPlayPause}
            activeOpacity={0.8}
            style={styles.playButton}
          >
            <Text style={styles.playIcon}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Next track"
            onPress={onNext}
            style={styles.mainControl}
          >
            <Text style={styles.controlIcon}>▶|</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Repeat ${repeatMode}`}
            onPress={onCycleRepeat}
            style={styles.smallControl}
          >
            <Text style={[styles.controlIcon, repeatMode !== 'off' && styles.activeIcon]}>
              {repeatMode === 'one' ? '↻¹' : '↻'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity onPress={onOpenLyrics} style={[styles.bottomButton, styles.lyricsButton]}>
            <Text style={styles.bottomText}>♫  Lyrics</Text>
          </TouchableOpacity>
          <View style={styles.bottomDivider} />
          <TouchableOpacity onPress={onOpenEqualiser} style={[styles.bottomButton, styles.equaliserButton]}>
            <Text style={styles.bottomText}>☷  Equaliser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  border: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
    padding: 0,
    margin: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  panel: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: 'space-between',
    backgroundColor: '#101522',
    borderWidth: 0,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 36,
    right: 36,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceIcon: {
    color: GOLD,
    fontSize: 16,
  },
  sourceText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '600',
  },
  outputPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  outputText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  trackRow: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 10,
  },
  titleFavoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 5,
  },
  favoriteButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  favoriteIcon: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
  },
  favoriteActive: {
    color: '#FF4267',
  },
  artworkWrap: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 340,
    alignSelf: 'center',
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: '#080D18',
    marginBottom: 14,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicNote: {
    color: GOLD,
    fontSize: 32,
  },
  trackInfo: {
    width: '100%',
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    color: WHITE,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  artist: {
    color: MUTED,
    fontSize: 13,
  },
  seekArea: {
    width: '100%',
    paddingVertical: 16,
    justifyContent: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    justifyContent: 'center',
  },
  progressFill: {
    height: 8,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  progressKnob: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#FFF4D0',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginRight: -7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
    marginBottom: 18,
  },
  time: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  smallControl: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainControl: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    color: WHITE,
    fontSize: 23,
    fontWeight: '700',
  },
  activeIcon: {
    color: GOLD,
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  playIcon: {
    color: '#101522',
    fontSize: 27,
    fontWeight: '900',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingTop: 12,
    gap: 18,
  },
  bottomButton: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  lyricsButton: {
    backgroundColor: 'rgba(150,45,255,0.18)',
    borderColor: 'rgba(150,45,255,0.85)',
  },
  equaliserButton: {
    backgroundColor: 'rgba(22,131,255,0.18)',
    borderColor: 'rgba(22,131,255,0.85)',
  },
  bottomText: {
    color: '#C8D5E8',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomDivider: {
    height: 16,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
