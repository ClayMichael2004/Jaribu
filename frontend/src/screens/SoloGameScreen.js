import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { startSoloGame, submitSoloAnswer } from '../config/api';
import { audioManager } from '../utils/audio';
import TurntableVisualizer from '../components/TurntableVisualizer';
import CountdownTimer from '../components/CountdownTimer';
import OptionCard from '../components/OptionCard';
import { Icon } from '../components/Icons';

export default function SoloGameScreen({
  category = 'kenyan',
  difficulty = 'medium',
  totalRounds = 5,
  playerName = 'DJ Nova',
  avatarEmoji = '🎧',
  avatarColor = '#c0c1ff',
  onExitGame,
  onOpenLeaderboard,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [roundOutcome, setRoundOutcome] = useState(null); // { is_correct, correct_song_id, points_earned }
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverStats, setGameOverStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const startTimeRef = useRef(Date.now());
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    initSoloGame();
    return () => {
      audioManager.stopSongPreview();
    };
  }, []);

  const initSoloGame = async () => {
    try {
      setIsLoading(true);
      setError(null);
      isTransitioningRef.current = false;
      const data = await startSoloGame({
        playerName,
        avatarEmoji,
        avatarColor,
        category,
        difficulty,
        totalRounds,
      });

      setSession(data);
      setRoundNumber(1);
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
      setCurrentQuestion(data.first_question);
      setIsGameOver(false);
      setRoundOutcome(null);
      setSelectedOption(null);

      playQuestionSnippet(data.first_question);
    } catch (e) {
      console.error('Failed to init solo game:', e);
      setError(e.message || 'Failed to connect to game server');
    } finally {
      setIsLoading(false);
    }
  };

  const playQuestionSnippet = (question) => {
    if (!question || !question.preview_url) return;

    startTimeRef.current = Date.now();
    setIsPlayingAudio(true);

    audioManager.playSongPreview(
      question.preview_url,
      question.play_snippet_sec || 8,
      () => {
        setIsPlayingAudio(false);
      }
    );
  };

  const handleSelectOption = async (option) => {
    if (isAnswering || isTransitioningRef.current || !session || !currentQuestion) return;

    isTransitioningRef.current = true;
    setIsAnswering(true);
    setSelectedOption(option);
    audioManager.stopSongPreview();
    setIsPlayingAudio(false);

    const timeTakenMs = Math.max(100, Date.now() - startTimeRef.current);

    try {
      const res = await submitSoloAnswer({
        sessionId: session.session_id,
        selectedOptionId: option.id,
        timeTakenMs,
      });

      // Properly unpack result from API
      const outcome = res.result || res;
      const isCorrect = outcome.is_correct === true;
      const pointsEarned = outcome.points_earned || 0;
      const newTotalScore = outcome.current_scores?.[0]?.score ?? (score + pointsEarned);
      const newStreak = outcome.streak ?? (isCorrect ? streak + 1 : 0);
      const correctSongId = outcome.correct_song?.id || outcome.correct_option_id;

      setRoundOutcome({
        is_correct: isCorrect,
        correct_song_id: correctSongId,
        points_earned: pointsEarned,
      });

      setScore(newTotalScore);
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      if (isCorrect) {
        audioManager.playCorrect();
      } else {
        audioManager.playWrong();
      }

      setTimeout(() => {
        if (res.is_game_over || outcome.is_game_over) {
          setIsGameOver(true);
          setGameOverStats({
            finalScore: newTotalScore,
            accuracy: Math.round(((newStreak > 0 ? newStreak : 1) / (roundNumber || 1)) * 100),
            maxStreak: Math.max(maxStreak, newStreak),
            totalRounds: roundNumber || totalRounds,
          });
          audioManager.playVictory();
        } else if (res.next_question) {
          setRoundNumber((prev) => prev + 1);
          setCurrentQuestion(res.next_question);
          setSelectedOption(null);
          setRoundOutcome(null);
          setIsAnswering(false);
          isTransitioningRef.current = false;
          playQuestionSnippet(res.next_question);
        }
      }, 1600);
    } catch (e) {
      console.error('Answer submission error:', e);
      setIsAnswering(false);
      isTransitioningRef.current = false;
    }
  };

  const handleTimeUp = () => {
    if (isAnswering || isTransitioningRef.current || !currentQuestion) return;
    handleSelectOption({ id: 'timeout', title: 'Time Up', artist: 'None' });
  };

  const handleReplayBeat = () => {
    audioManager.playClick();
    if (currentQuestion) {
      playQuestionSnippet(currentQuestion);
    }
  };

  const handleSkip = () => {
    if (isAnswering || isTransitioningRef.current) return;
    audioManager.playClick();
    handleSelectOption({ id: 'skip', title: 'Skipped Track', artist: 'None' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>LOADING STUDIO MASTER BEAT...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="zap" size={40} color={COLORS.error} style={{ marginBottom: 12 }} />
        <Text style={styles.errorTitle}>CONNECTION ERROR</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={initSoloGame} style={styles.retryButton}>
          <Text style={styles.retryText}>TRY AGAIN</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={onExitGame} style={styles.exitSecondaryBtn}>
          <Text style={styles.exitSecondaryText}>EXIT TO HOME</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top App Bar (Matching Stitch UI) */}
      <View style={styles.header}>
        <View style={[styles.headerInner, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onExitGame}
            style={styles.closeBtn}
            accessibilityLabel="Close"
          >
            <Icon name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.scoreHeaderBadge}>
            <Text style={styles.roundHeaderText}>
              ROUND {roundNumber || 1}:{' '}
              <Text style={styles.scoreTextHighlight}>{(score || 0).toString().padStart(4, '0')}</Text>
            </Text>
            {streak > 1 && (
              <View style={styles.streakBadge}>
                <Icon name="flame" size={12} color={COLORS.tertiary} style={{ marginRight: 3 }} />
                <Text style={styles.streakText}>{streak}X</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onExitGame}
            style={styles.exitPill}
            accessibilityLabel="Exit"
          >
            <Text style={styles.exitText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Vinyl Centerpiece */}
        <TurntableVisualizer
          isPlaying={isPlayingAudio}
          categoryEmoji={avatarEmoji}
          durationSec={currentQuestion?.play_snippet_sec || 8}
          size={isDesktop ? 'hero' : 'normal'}
          onTogglePlay={handleReplayBeat}
        />

        {/* Controls: Replay Beat & Skip (Matching Stitch UI) */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleReplayBeat}
            style={styles.replayButton}
          >
            <Icon name="refresh" size={14} color={COLORS.primaryLight} style={{ marginRight: 6 }} />
            <Text style={styles.replayText}>REPLAY BEAT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSkip}
            disabled={isAnswering}
            style={styles.skipButton}
          >
            <Icon name="skip" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.skipText}>SKIP</Text>
          </TouchableOpacity>
        </View>

        {/* Glowing Countdown Progress Bar (Matching Stitch UI) */}
        <CountdownTimer
          questionId={currentQuestion?.id || roundNumber}
          durationMs={(currentQuestion?.play_snippet_sec || 8) * 1000}
          isActive={!isAnswering && !isGameOver}
          onTimeUp={handleTimeUp}
        />

        {/* Question Prompt */}
        <Text style={styles.questionPrompt}>
          WHAT SONG IS PLAYING?
        </Text>

        {/* 4 Choices Options List */}
        <View style={[styles.optionsContainer, isDesktop && styles.optionsContainerDesktop]}>
          {currentQuestion?.options?.map((opt, idx) => {
            const isSelected = selectedOption?.id === opt.id;
            let isCorrect = false;
            let isWrong = false;
            let points = 0;

            if (roundOutcome) {
              if (opt.id === roundOutcome.correct_song_id) {
                isCorrect = true;
                points = roundOutcome.points_earned;
              } else if (isSelected && !roundOutcome.is_correct) {
                isWrong = true;
              }
            }

            return (
              <OptionCard
                key={opt.id || idx}
                option={opt}
                index={idx}
                isSelected={isSelected}
                isCorrect={isCorrect}
                isWrong={isWrong}
                pointsEarned={points}
                isDisabled={isAnswering}
                onSelect={handleSelectOption}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Game Over Summary Modal (Matching Stitch Dark Theme) */}
      {isGameOver && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverCard}>
            <Icon name="trophy" size={48} color="#FFD700" style={{ marginBottom: 12 }} />
            <Text style={styles.gameOverTitle}>MATCH COMPLETE!</Text>
            <Text style={styles.gameOverSubtitle}>Spectacular performance in the studio</Text>

            {/* Score Highlight Box */}
            <View style={styles.finalScoreBox}>
              <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
              <Text style={styles.finalScoreValue}>
                {gameOverStats?.finalScore ?? score ?? 0}
              </Text>
              <Text style={styles.finalScorePts}>POINTS</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.gameOverStatsRow}>
              <View style={styles.gameOverStatCol}>
                <Text style={styles.gameOverStatLabel}>Accuracy</Text>
                <Text style={styles.gameOverStatVal}>{gameOverStats?.accuracy || 80}%</Text>
              </View>
              <View style={styles.gameOverStatCol}>
                <Text style={styles.gameOverStatLabel}>Max Streak</Text>
                <Text style={styles.gameOverStatVal}>{maxStreak}X</Text>
              </View>
              <View style={styles.gameOverStatCol}>
                <Text style={styles.gameOverStatLabel}>Rounds</Text>
                <Text style={styles.gameOverStatVal}>{roundNumber || totalRounds}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.gameOverActions}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={initSoloGame}
                style={styles.playAgainBtn}
              >
                <Icon name="play" size={14} color={COLORS.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.playAgainText}>PLAY AGAIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onOpenLeaderboard}
                style={styles.leaderboardBtn}
              >
                <Icon name="trophy" size={14} color={COLORS.tertiary} style={{ marginRight: 6 }} />
                <Text style={styles.leaderboardBtnText}>VIEW RANKINGS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onExitGame}
                style={styles.homeBtn}
              >
                <Icon name="home" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.homeBtnText}>RETURN HOME</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: COLORS.error,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  errorSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    marginBottom: 10,
  },
  retryText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  exitSecondaryBtn: {
    paddingVertical: 8,
  },
  exitSecondaryText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    width: '100%',
    backgroundColor: 'rgba(19, 19, 19, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 100,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  headerDesktop: {
    paddingHorizontal: 36,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  scoreHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundHeaderText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scoreTextHighlight: {
    color: COLORS.primaryLight,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 185, 95, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 185, 95, 0.3)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakText: {
    color: COLORS.tertiary,
    fontSize: 10,
    fontWeight: '900',
  },
  exitPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  exitText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  contentDesktop: {
    paddingTop: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.4)',
    backgroundColor: 'rgba(192, 193, 255, 0.08)',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  replayText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: COLORS.surfaceContainer,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  questionPrompt: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 16,
    textTransform: 'uppercase',
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 520,
  },
  optionsContainerDesktop: {
    maxWidth: 580,
  },
  gameOverOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 200,
  },
  gameOverCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 193, 255, 0.3)',
    padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  gameOverTitle: {
    color: COLORS.primaryLight,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  gameOverSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  finalScoreBox: {
    backgroundColor: 'rgba(192, 193, 255, 0.1)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  finalScoreLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  finalScoreValue: {
    color: COLORS.secondary, // Cyber mint glowing text
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 1,
  },
  finalScorePts: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  gameOverStatsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  gameOverStatCol: {
    alignItems: 'center',
  },
  gameOverStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  gameOverStatVal: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  gameOverActions: {
    width: '100%',
    gap: 10,
  },
  playAgainBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  playAgainText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  leaderboardBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 185, 95, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 185, 95, 0.4)',
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaderboardBtnText: {
    color: COLORS.tertiary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  homeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  homeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
