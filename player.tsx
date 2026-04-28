import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer } from './_contexts/AudioContext';
import { useTheme } from './_contexts/ThemeContext';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width * 0.65;

// Light background colors (for dark mode)
const lightPlayerColors = {
  background: '#F8F9FC',
  text: '#1F2937',
  textSecondary: '#6B7280',
  progressTrack: '#E5E7EB',
  progressFill: '#8B6F47',
  button: '#8B6F47',
  buttonSecondary: 'rgba(139, 111, 71, 0.12)',
  icon: '#FFFFFF',
  iconSecondary: '#6B7280',
  artworkBg: '#FFFFFF',
  artworkBorder: 'rgba(0, 0, 0, 0.06)',
};

// Dark background colors (for light mode)
const darkPlayerColors = {
  background: '#111318',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  progressTrack: '#374151',
  progressFill: '#C9A66B',
  button: '#C9A66B',
  buttonSecondary: 'rgba(201, 166, 107, 0.15)',
  icon: '#111318',
  iconSecondary: '#9CA3AF',
  artworkBg: '#1F2328',
  artworkBorder: 'rgba(255, 255, 255, 0.08)',
};

export default function PlayerScreen() {
  const { isDark } = useTheme();
  const playerColors = isDark ? lightPlayerColors : darkPlayerColors;

  const {
    isPlaying,
    currentTitle,
    currentSayadaw,
    playbackPosition,
    playbackDuration,
    isSeeking,
    currentAudioId,
    playAudio,
    pauseAudio,
    skipBackward,
    skipForward,
    setIsSeeking,
    setPlaybackPosition,
    downloadedAudioList,
    seekTo,
  } = useAudioPlayer();

  const seekPositionRef = useRef(0);
  const progressBarRef = useRef(null);
  const progressBarLayoutRef = useRef({ x: 0, width: 0 });
  const [localSeeking, setLocalSeeking] = useState(false);
  const [localSeekPercentage, setLocalSeekPercentage] = useState(0);

  // Animation for rotating border
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      // Rotating border animation when playing
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotate.start();
      return () => rotate.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isPlaying, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const playbackDurationRef = useRef(playbackDuration);
  playbackDurationRef.current = playbackDuration;

  const calculatePercentage = (pageX: number) => {
    const { x, width: barWidth } = progressBarLayoutRef.current;
    if (barWidth === 0) return 0;
    const touchX = pageX - x;
    return Math.max(0, Math.min(1, touchX / barWidth));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        if (playbackDurationRef.current === 0) return;
        const percentage = calculatePercentage(evt.nativeEvent.pageX);
        setLocalSeeking(true);
        setLocalSeekPercentage(percentage * 100);
        setIsSeeking(true);
      },
      onPanResponderMove: (evt) => {
        if (playbackDurationRef.current === 0) return;
        const percentage = calculatePercentage(evt.nativeEvent.pageX);
        setLocalSeekPercentage(percentage * 100);
      },
      onPanResponderRelease: async (evt) => {
        const percentage = calculatePercentage(evt.nativeEvent.pageX);
        const newPosition = percentage * playbackDurationRef.current;
        seekPositionRef.current = newPosition;
        setPlaybackPosition(newPosition);
        await seekTo(newPosition);
        setLocalSeeking(false);
        setIsSeeking(false);
      },
      onPanResponderTerminate: () => {
        setLocalSeeking(false);
        setIsSeeking(false);
      },
    })
  ).current;

  const handleProgressBarLayout = () => {
    if (progressBarRef.current) {
      (progressBarRef.current as any).measure((_fx: number, _fy: number, w: number, _h: number, px: number, _py: number) => {
        progressBarLayoutRef.current = { x: px, width: w };
      });
    }
  };

  const handlePlayPause = async () => {
    const currentAudio = downloadedAudioList.find(
      (audio: any) => audio.id === currentAudioId
    );

    if (!currentAudio) return;

    if (isPlaying) {
      await pauseAudio();
    } else {
      await playAudio(currentAudio);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressPercentage = localSeeking
    ? localSeekPercentage
    : playbackDuration > 0
      ? (playbackPosition / playbackDuration) * 100
      : 0;

  if (!currentAudioId) {
    router.back();
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: playerColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <View style={[styles.backButtonCircle, { backgroundColor: playerColors.buttonSecondary }]}>
            <Ionicons name="chevron-down" size={24} color={playerColors.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: playerColors.textSecondary }]}>
          Now Playing
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Album Art */}
      <View style={styles.artworkContainer}>
        <View
          style={[
            styles.artworkShadow,
            {
              backgroundColor: playerColors.artworkBg,
              shadowColor: playerColors.progressFill,
            },
          ]}
        >
          <View
            style={[
              styles.artworkInner,
              {
                backgroundColor: playerColors.artworkBg,
                borderColor: playerColors.artworkBorder,
              },
            ]}
          >
            {/* Rotating ring animation */}
            {isPlaying && (
              <Animated.View
                style={[
                  styles.rotatingRing,
                  {
                    borderColor: playerColors.progressFill,
                    transform: [{ rotate: spin }],
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: playerColors.artworkBg },
              ]}
            >
              <Animated.Image
                source={require('../assets/images/icon.png')}
                style={styles.appIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={[styles.titleText, { color: playerColors.text }]} numberOfLines={2}>
          {currentTitle}
        </Text>
        <Text style={[styles.sayadawText, { color: playerColors.textSecondary }]} numberOfLines={1}>
          {currentSayadaw || 'Unknown'}
        </Text>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View
          ref={progressBarRef}
          style={styles.progressBarContainer}
          onLayout={handleProgressBarLayout}
          {...panResponder.panHandlers}
        >
          <View style={[styles.progressTrack, { backgroundColor: playerColors.progressTrack }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: playerColors.progressFill,
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.thumb,
              {
                left: `${progressPercentage}%`,
                backgroundColor: playerColors.progressFill,
                transform: [{ scale: isSeeking || localSeeking ? 1.2 : 1 }],
              },
            ]}
          />
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: playerColors.textSecondary }]}>
            {formatTime(localSeeking ? (localSeekPercentage / 100) * playbackDuration : playbackPosition)}
          </Text>
          <Text style={[styles.timeText, { color: playerColors.textSecondary }]}>
            {formatTime(playbackDuration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: playerColors.buttonSecondary }]}
          onPress={skipBackward}
          activeOpacity={0.7}
        >
          <Ionicons name="play-back" size={36} color={playerColors.iconSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: playerColors.button }]}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={44}
            color={playerColors.icon}
            style={!isPlaying ? { marginLeft: 6 } : undefined}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: playerColors.buttonSecondary }]}
          onPress={skipForward}
          activeOpacity={0.7}
        >
          <Ionicons name="play-forward" size={36} color={playerColors.iconSecondary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 44,
  },
  artworkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  artworkShadow: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: ARTWORK_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  artworkInner: {
    width: ARTWORK_SIZE - 8,
    height: ARTWORK_SIZE - 8,
    borderRadius: (ARTWORK_SIZE - 8) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  rotatingRing: {
    position: 'absolute',
    width: ARTWORK_SIZE - 24,
    height: ARTWORK_SIZE - 24,
    borderRadius: (ARTWORK_SIZE - 24) / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: ARTWORK_SIZE - 48,
    height: ARTWORK_SIZE - 48,
    borderRadius: (ARTWORK_SIZE - 48) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  appIcon: {
    width: ARTWORK_SIZE * 0.5,
    height: ARTWORK_SIZE * 0.5,
  },
  trackInfo: {
    paddingHorizontal: 40,
    paddingVertical: 24,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  sayadawText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  progressSection: {
    paddingHorizontal: 32,
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingVertical: 32,
    paddingBottom: 48,
  },
  secondaryButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
