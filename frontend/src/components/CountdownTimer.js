import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';

export default function CountdownTimer({
  durationMs = 10000,
  isActive = true,
  onTimeUp,
  onTick,
}) {
  const [timeLeftMs, setTimeLeftMs] = useState(durationMs);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const lastTickSecRef = useRef(Math.ceil(durationMs / 1000));

  useEffect(() => {
    setTimeLeftMs(durationMs);
    startTimeRef.current = Date.now();
    lastTickSecRef.current = Math.ceil(durationMs / 1000);
    progressAnim.setValue(1);

    if (!isActive) return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeLeftMs(remaining);

      const ratio = remaining / durationMs;
      progressAnim.setValue(ratio);

      if (onTick) {
        onTick(elapsed);
      }

      // Audio tick and pulse warning during last 3 seconds
      const currentSec = Math.ceil(remaining / 1000);
      if (currentSec <= 3 && currentSec > 0 && currentSec !== lastTickSecRef.current) {
        lastTickSecRef.current = currentSec;
        audioManager.playTick();

        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 90, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
      }

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        if (onTimeUp) {
          onTimeUp();
        }
      }
    }, 40);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [durationMs, isActive]);

  const seconds = (timeLeftMs / 1000).toFixed(1);
  const ratio = timeLeftMs / durationMs;

  let timerColor = COLORS.accentMint;
  let timerShadow = COLORS.accentMintGlow;
  if (ratio <= 0.3) {
    timerColor = COLORS.accentRed;
    timerShadow = 'rgba(239, 68, 68, 0.4)';
  } else if (ratio <= 0.6) {
    timerColor = COLORS.accentAmber;
    timerShadow = 'rgba(255, 179, 0, 0.4)';
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.timerIcon}>⏱️</Text>
          <Text style={styles.label}>TIME LEFT</Text>
        </View>
        <Animated.View style={[styles.timerBadge, { borderColor: timerColor, backgroundColor: timerShadow }]}>
          <Animated.Text
            style={[
              styles.timerText,
              { color: timerColor, transform: [{ scale: ratio <= 0.3 ? pulseAnim : 1 }] },
            ]}
          >
            {seconds}s
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Progress Track */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: timerColor,
              width: `${Math.max(0, ratio * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  track: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
});
