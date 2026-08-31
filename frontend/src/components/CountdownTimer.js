import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';

export default function CountdownTimer({
  questionId,
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
  const hasFiredRef = useRef(false);

  useEffect(() => {
    setTimeLeftMs(durationMs);
    startTimeRef.current = Date.now();
    lastTickSecRef.current = Math.ceil(durationMs / 1000);
    hasFiredRef.current = false;
    progressAnim.setValue(1);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

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

      const currentSec = Math.ceil(remaining / 1000);
      if (currentSec <= 3 && currentSec > 0 && currentSec !== lastTickSecRef.current) {
        lastTickSecRef.current = currentSec;
        audioManager.playTick();

        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 80, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
      }

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (!hasFiredRef.current) {
          hasFiredRef.current = true;
          if (onTimeUp) {
            onTimeUp(questionId);
          }
        }
      }
    }, 40);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [questionId, durationMs, isActive]);

  const seconds = (timeLeftMs / 1000).toFixed(1);
  const ratio = timeLeftMs / durationMs;

  let timerColor = COLORS.primary;
  let timerShadow = 'rgba(192, 193, 255, 0.8)';
  if (ratio <= 0.3) {
    timerColor = COLORS.error;
    timerShadow = 'rgba(255, 180, 171, 0.8)';
  } else if (ratio <= 0.6) {
    timerColor = COLORS.tertiary;
    timerShadow = 'rgba(255, 185, 95, 0.8)';
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.labelGroup}>
          <View style={[styles.statusDot, { backgroundColor: timerColor }]} />
          <Text style={styles.label}>BEAT REMAINING</Text>
        </View>
        <Animated.View style={[styles.timerBadge, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
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
              shadowColor: timerShadow,
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
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  track: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 9999,
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    height: '100%',
    borderRadius: 9999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});

