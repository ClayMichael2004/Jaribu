import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';

export default function TurntableVisualizer({
  isPlaying = false,
  categoryEmoji = '🇰🇪',
  durationSec = 8,
  onTogglePlay,
}) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(1)).current;
  const barHeights = useRef([
    new Animated.Value(15),
    new Animated.Value(35),
    new Animated.Value(60),
    new Animated.Value(25),
    new Animated.Value(75),
    new Animated.Value(45),
    new Animated.Value(55),
    new Animated.Value(30),
    new Animated.Value(68),
    new Animated.Value(20),
  ]).current;

  // Spin animation for the vinyl
  useEffect(() => {
    let spinAnimation;
    if (isPlaying) {
      spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3000,
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

  // Ambient aura pulsing
  useEffect(() => {
    let pulseAnim;
    if (isPlaying) {
      pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(auraPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(auraPulse, { toValue: 0.95, duration: 800, useNativeDriver: true }),
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
            toValue: 18 + Math.random() * 52,
            duration: 120 + (i * 28) % 180,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 8 + Math.random() * 20,
            duration: 120 + (i * 22) % 160,
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

  return (
    <View style={styles.container}>
      {/* Ambient Glow Aura */}
      <Animated.View
        style={[
          styles.glowAura,
          isPlaying && styles.glowAuraActive,
          { transform: [{ scale: isPlaying ? auraPulse : 1 }] },
        ]}
      />

      {/* Vinyl Disc Section (Tappable to play/pause snippet) */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          audioManager.unlockAudio();
          if (onTogglePlay) onTogglePlay();
        }}
        style={styles.turntableCase}
      >
        <Animated.View
          style={[
            styles.vinylDisc,
            isPlaying && styles.vinylGlow,
            { transform: [{ rotate: spin }] },
          ]}
        >
          {/* Vinyl Grooves with metallic reflection rims */}
          <View style={styles.grooveRing4}>
            <View style={styles.grooveRing3}>
              <View style={styles.grooveRing2}>
                <View style={styles.grooveRing1}>
                  {/* Center Sticker Label */}
                  <View style={styles.centerLabel}>
                    <Text style={styles.labelEmoji}>{isPlaying ? '🔊' : categoryEmoji}</Text>
                    <View style={styles.centerSpindle} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Tone Arm Needle with Pivot Joint */}
        <View style={[styles.toneArmBase, isPlaying && styles.toneArmActive]}>
          <View style={styles.toneArmPivot} />
          <View style={styles.toneArmRod} />
          <View style={styles.toneArmCartridge} />
        </View>
      </TouchableOpacity>

      {/* Modern Neon Spectrum Visualizer Bars */}
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
                    ? COLORS.accentMint
                    : COLORS.accentCyan,
              },
            ]}
          />
        ))}
      </View>

      {/* Interactive Capsule Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.statusCapsule, isPlaying ? styles.capsulePlaying : styles.capsulePaused]}
        onPress={() => {
          audioManager.unlockAudio();
          if (onTogglePlay) onTogglePlay();
        }}
      >
        <View style={[styles.capsuleIconBg, { backgroundColor: isPlaying ? COLORS.accentMint : COLORS.primary }]}>
          <Text style={styles.capsuleIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
        </View>
        <Text style={styles.capsuleText}>
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
    marginVertical: 10,
    position: 'relative',
  },
  glowAura: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
  },
  glowAuraActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.14)',
  },
  turntableCase: {
    position: 'relative',
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  vinylDisc: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#0A0E17',
    borderWidth: 3,
    borderColor: '#1F293D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  vinylGlow: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.accentMint,
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  grooveRing4: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1,
    borderColor: '#172033',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grooveRing3: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: '#24324D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grooveRing2: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: '#1D283E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grooveRing1: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#2E3E61',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  labelEmoji: {
    fontSize: 22,
  },
  centerSpindle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#080B11',
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  toneArmBase: {
    position: 'absolute',
    right: 10,
    top: 12,
    alignItems: 'center',
  },
  toneArmActive: {
    transform: [{ rotate: '-16deg' }],
  },
  toneArmPivot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#374761',
    borderWidth: 2,
    borderColor: '#64748B',
  },
  toneArmRod: {
    width: 3.5,
    height: 75,
    backgroundColor: '#CBD5E1',
    marginTop: -2,
    borderRadius: 2,
  },
  toneArmCartridge: {
    width: 10,
    height: 18,
    backgroundColor: COLORS.accentMint,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 40,
    gap: 5,
    marginTop: 8,
  },
  equalizerBar: {
    width: 5,
    borderRadius: 3,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginTop: 10,
    borderWidth: 2,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  capsulePlaying: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: COLORS.accentMint,
    shadowColor: COLORS.accentMint,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  capsulePaused: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  capsuleIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  capsuleIcon: {
    color: '#080B11',
    fontSize: 10,
    fontWeight: '900',
  },
  capsuleText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
