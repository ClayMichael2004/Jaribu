import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';

export default function TurntableVisualizer({
  isPlaying = false,
  categoryEmoji = '🇰🇪',
  durationSec = 8,
  size = 'normal', // 'normal' | 'hero' | 'compact'
  onTogglePlay,
}) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(1)).current;
  const barHeights = useRef([
    new Animated.Value(12),
    new Animated.Value(28),
    new Animated.Value(45),
    new Animated.Value(20),
    new Animated.Value(55),
    new Animated.Value(35),
    new Animated.Value(42),
    new Animated.Value(25),
    new Animated.Value(50),
    new Animated.Value(16),
  ]).current;

  // Continuous smooth spin animation
  useEffect(() => {
    let spinAnimation;
    if (isPlaying) {
      spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
    } else {
      spinValue.stopAnimation();
    }
    return () => spinAnimation && spinAnimation.stop();
  }, [isPlaying]);

  // Ambient neon aura pulsing
  useEffect(() => {
    let pulseAnim;
    if (isPlaying) {
      pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(auraPulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(auraPulse, { toValue: 0.96, duration: 900, useNativeDriver: true }),
        ])
      );
      pulseAnim.start();
    } else {
      auraPulse.setValue(1);
    }
    return () => pulseAnim && pulseAnim.stop();
  }, [isPlaying]);

  // Audio equalizer bars bounce animation
  useEffect(() => {
    if (!isPlaying) return;

    const animations = barHeights.map((anim, i) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 14 + Math.random() * 40,
            duration: 110 + (i * 24) % 150,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 6 + Math.random() * 16,
            duration: 110 + (i * 20) % 140,
            useNativeDriver: false,
          }),
        ])
      );
    });

    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, [isPlaying]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const discSize = size === 'hero' ? 220 : size === 'compact' ? 140 : 180;
  const outerSize = discSize + 40;

  return (
    <View style={styles.container}>
      {/* Outer Neon Glow Pulse Ring from Stitch */}
      <Animated.View
        style={[
          styles.outerPulseRing,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            transform: [{ scale: isPlaying ? auraPulse : 1 }],
          },
        ]}
      />
      <View
        style={[
          styles.innerPulseRing,
          {
            width: outerSize - 16,
            height: outerSize - 16,
            borderRadius: (outerSize - 16) / 2,
          },
        ]}
      />

      {/* Vinyl Disc Container */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          audioManager.unlockAudio();
          if (onTogglePlay) onTogglePlay();
        }}
        style={[
          styles.turntableCase,
          { width: discSize + 20, height: discSize + 20 },
        ]}
      >
        <Animated.View
          style={[
            styles.vinylDisc,
            {
              width: discSize,
              height: discSize,
              borderRadius: discSize / 2,
              transform: [{ rotate: spin }],
            },
            isPlaying && styles.vinylGlow,
          ]}
        >
          {/* Concentric Vinyl Grooves */}
          <View style={[styles.grooveRing, { width: discSize * 0.86, height: discSize * 0.86, borderRadius: (discSize * 0.86) / 2 }]}>
            <View style={[styles.grooveRing, { width: discSize * 0.72, height: discSize * 0.72, borderRadius: (discSize * 0.72) / 2 }]}>
              <View style={[styles.grooveRing, { width: discSize * 0.58, height: discSize * 0.58, borderRadius: (discSize * 0.58) / 2 }]}>
                <View style={[styles.grooveRing, { width: discSize * 0.44, height: discSize * 0.44, borderRadius: (discSize * 0.44) / 2 }]}>
                  {/* Glowing Center Core Label */}
                  <View
                    style={[
                      styles.centerLabel,
                      {
                        width: discSize * 0.32,
                        height: discSize * 0.32,
                        borderRadius: (discSize * 0.32) / 2,
                      },
                    ]}
                  >
                    <Text style={[styles.labelEmoji, { fontSize: discSize * 0.12 }]}>
                      {isPlaying ? '🔊' : categoryEmoji}
                    </Text>
                    {/* Emerald Center Spindle Core */}
                    <View style={styles.centerSpindle} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Modern Neon Equalizer Spectrum */}
      <View style={styles.equalizerContainer}>
        {barHeights.map((animHeight, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.equalizerBar,
              {
                height: isPlaying ? animHeight : 6,
                backgroundColor:
                  idx % 3 === 0
                    ? COLORS.primary
                    : idx % 3 === 1
                    ? COLORS.secondary
                    : COLORS.tertiary,
              },
            ]}
          />
        ))}
      </View>

      {/* Interactive Pill Play/Pause Control */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.statusCapsule, isPlaying ? styles.capsulePlaying : styles.capsulePaused]}
        onPress={() => {
          audioManager.unlockAudio();
          if (onTogglePlay) onTogglePlay();
        }}
      >
        <View style={[styles.capsuleIconBg, { backgroundColor: isPlaying ? COLORS.secondary : COLORS.primary }]}>
          <Text style={styles.capsuleIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
        </View>
        <Text style={[styles.capsuleText, { color: isPlaying ? COLORS.secondaryFixed : COLORS.primaryLight }]}>
          {isPlaying ? `PLAYING BEAT (${durationSec}s)` : 'TAP TO PLAY BEAT 🎵'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  outerPulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(192, 193, 255, 0.25)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  innerPulseRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.2)',
  },
  turntableCase: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  vinylDisc: {
    backgroundColor: '#0e0e0e',
    borderWidth: 2,
    borderColor: '#353534',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  vinylGlow: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 28,
  },
  grooveRing: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  labelEmoji: {
    textAlign: 'center',
  },
  centerSpindle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 36,
    gap: 5,
    marginTop: 12,
  },
  equalizerBar: {
    width: 4,
    borderRadius: 2,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 9999,
    marginTop: 12,
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  capsulePlaying: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  capsulePaused: {
    backgroundColor: 'rgba(192, 193, 255, 0.1)',
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  capsuleIconBg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  capsuleIcon: {
    color: '#131313',
    fontSize: 9,
    fontWeight: '900',
  },
  capsuleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

