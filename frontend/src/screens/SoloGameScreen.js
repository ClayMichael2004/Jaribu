import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { startSoloGame, submitSoloAnswer } from '../config/api';
import { audioManager } from '../utils/audio';
import TurntableVisualizer from '../components/TurntableVisualizer';
import CountdownTimer from '../components/CountdownTimer';
import OptionCard from '../components/OptionCard';

export default function SoloGameScreen({
  category = 'kenyan',
  difficulty = 'medium',
  totalRounds = 5,
  playerName = 'Player 1',
  avatarEmoji = '🦁',
  avatarColor = '#FF5722',
  onExitGame,
  onOpenLeaderboard,
}) {
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverStats, setGameOverStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const startTimeRef = useRef(Date.now());
  const timerActiveRef = useRef(true);

  // Initialize Game on Mount
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
      const data = await startSoloGame({
        playerName,
        avatarEmoji,
        avatarColor,
        category,
        difficulty,
        totalRounds,
      });

      setSession(data);
      setCurrentQuestion(data.first_question);
      setRoundNumber(1);
      setScore(0);
      setStreak(0);
      setIsGameOver(false);
      setRoundResult(null);
      setSelectedOption(null);

      playQuestionSnippet(data.first_question);
    } catch (e) {
      console.error('Game initialization failed:', e);
      setError(e.message || 'Failed to start game session');
    } finally {
      setIsLoading(false);
    }
  };

  const playQuestionSnippet = (question) => {
    if (!question || !question.preview_url) return;
    startTimeRef.current = Date.now();
    timerActiveRef.current = true;
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
    if (isAnswering || roundResult || isGameOver) return;

    setIsAnswering(true);
    timerActiveRef.current = false;
    setSelectedOption(option);
    const timeTaken = Date.now() - startTimeRef.current;

    try {
      const res = await submitSoloAnswer({
        sessionId: session.session_id,
        selectedOptionId: option.id,
        timeTakenMs: timeTaken,
      });

      setRoundResult(res.result);
      setScore(res.result.current_scores[0]?.score || score + res.result.points_earned);
      setStreak(res.result.streak);
      if (res.result.streak > maxStreak) {
        setMaxStreak(res.result.streak);
      }

      if (res.result.is_correct) {
        audioManager.playCorrect();
        if (res.result.streak >= 3) {
          setTimeout(() => audioManager.playStreak(), 400);
        }
      } else {
        audioManager.playWrong();
      }

      // Check if game over or prepare next question
      if (res.is_game_over) {
        setTimeout(() => {
          setIsGameOver(true);
          setGameOverStats({
            finalScore: res.result.current_scores[0]?.score || score + res.result.points_earned,
            maxStreak: res.result.streak > maxStreak ? res.result.streak : maxStreak,
          });
          audioManager.playVictory();
          triggerConfetti();
        }, 1800);
      } else {
        setTimeout(() => {
          advanceToNextQuestion(res.next_question);
        }, 1800);
      }
    } catch (e) {
      console.error('Answer submission error:', e);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleTimeUp = () => {
    if (roundResult || isGameOver || isAnswering) return;
    // Auto-fail on timeout
    handleSelectOption({ id: 'timeout', title: 'Time Up!', artist: '' });
  };

  const advanceToNextQuestion = (nextQ) => {
    setRoundResult(null);
    setSelectedOption(null);
    setRoundNumber((prev) => prev + 1);
    setCurrentQuestion(nextQ);
    playQuestionSnippet(nextQ);
  };

  const triggerConfetti = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const confetti = require('canvas-confetti');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Ignored if confetti is not available
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching audio beat snippets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Failed to load game</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initSoloGame}>
          <Text style={styles.retryBtnText}>RETRY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitBtn} onPress={onExitGame}>
          <Text style={styles.exitBtnText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // GAME OVER SCREEN
  if (isGameOver) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
        <View style={styles.gameOverCard}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={styles.gameOverTitle}>GAME COMPLETED!</Text>
          <Text style={styles.gameOverSub}>{category.toUpperCase()} • {difficulty.toUpperCase()}</Text>

          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
            <Text style={styles.finalScoreValue}>{gameOverStats?.finalScore || score}</Text>
            <Text style={styles.ptsLabel}>POINTS</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statVal}>{gameOverStats?.maxStreak || maxStreak}</Text>
              <Text style={styles.statLab}>Max Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🎯</Text>
              <Text style={styles.statVal}>{roundNumber}/{totalRounds}</Text>
              <Text style={styles.statLab}>Rounds</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={() => {
              audioManager.playClick();
              initSoloGame();
            }}
          >
            <Text style={styles.playAgainText}>PLAY AGAIN ↻</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hallOfFameBtn}
            onPress={() => {
              audioManager.playClick();
              onOpenLeaderboard();
            }}
          >
            <Text style={styles.hallOfFameText}>VIEW LEADERBOARD 🏆</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => {
              audioManager.playClick();
              onExitGame();
            }}
          >
            <Text style={styles.backHomeText}>HOME</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ACTIVE PLAYING SCREEN
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.gameContent}>
      {/* Top HUD */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.quitBtn} onPress={onExitGame}>
          <Text style={styles.quitBtnText}>✕ EXIT</Text>
        </TouchableOpacity>

        {/* Round Badge */}
        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>
            ROUND {roundNumber} / {totalRounds}
          </Text>
        </View>

        {/* Score Counter */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
        </View>
      </View>

      {/* Streak Multiplier Banner */}
      {streak >= 2 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            {streak}x COMBO! ({streak >= 5 ? '3.0x' : streak >= 4 ? '2.0x' : streak >= 3 ? '1.5x' : '1.25x'} MULTIPLIER)
          </Text>
        </View>
      )}

      {/* Vinyl Turntable & Audio Wave Visualizer */}
      <TurntableVisualizer
        isPlaying={isPlayingAudio}
        categoryEmoji={
          category?.startsWith('artist:') ? '🎤' :
          category === 'general' ? '🎲' :
          category === 'kenyan' ? '🇰🇪' :
          category === 'afrobeats' ? '🌍' :
          category === 'reggae' ? '🇯🇲' :
          category === 'dancehall' ? '🔊' :
          category === 'gospel' ? '🙏' :
          category === 'hiphop' ? '🎤' :
          category === 'pop' ? '🌟' :
          category === 'nineties_twothousands' ? '📼' :
          category === 'rock_classics' ? '🎸' : '🎵'
        }
        durationSec={currentQuestion?.play_snippet_sec || 8}
        onTogglePlay={() => playQuestionSnippet(currentQuestion)}
      />

      {/* Controls Row: Replay & Skip */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.replayBtn, isPlayingAudio && styles.replayBtnDisabled]}
          onPress={() => playQuestionSnippet(currentQuestion)}
          disabled={isPlayingAudio}
        >
          <Text style={styles.replayBtnText}>
            {isPlayingAudio ? '🔊 PLAYING...' : '↻ REPLAY BEAT'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipBtn, (!!roundResult || isAnswering) && styles.skipBtnDisabled]}
          onPress={() => {
            if (isAnswering || roundResult || isGameOver) return;
            audioManager.playClick();
            handleSelectOption({ id: 'skip', title: 'Skipped Beat', artist: '' });
          }}
          disabled={!!roundResult || isAnswering}
        >
          <Text style={styles.skipBtnText}>⏭️ SKIP BEAT</Text>
        </TouchableOpacity>
      </View>

      {/* Countdown Timer Bar */}
      <CountdownTimer
        durationMs={currentQuestion?.duration_limit_ms || 10000}
        isActive={!roundResult && !isGameOver}
        onTimeUp={handleTimeUp}
      />

      {/* Question Prompt */}
      <Text style={styles.questionPrompt}>WHAT SONG IS PLAYING?</Text>

      {/* Options List */}
      <View style={styles.optionsList}>
        {currentQuestion?.options.map((option, idx) => {
          const isSelected = selectedOption?.id === option.id;
          let isCorrect = false;
          let isWrong = false;

          if (roundResult) {
            if (option.id === roundResult.correct_song?.id) {
              isCorrect = true;
            } else if (isSelected && !roundResult.is_correct) {
              isWrong = true;
            }
          }

          return (
            <OptionCard
              key={option.id || idx}
              option={option}
              index={idx}
              isSelected={isSelected}
              isCorrect={isCorrect}
              isWrong={isWrong}
              isDisabled={!!roundResult || isAnswering}
              onSelect={handleSelectOption}
            />
          );
        })}
      </View>

      {/* Round Result Feedback Banner */}
      {roundResult && (
        <View
          style={[
            styles.resultBanner,
            roundResult.is_correct ? styles.resultBannerCorrect : styles.resultBannerWrong,
          ]}
        >
          <Text style={styles.resultBannerIcon}>
            {roundResult.is_correct ? '🎉' : '❌'}
          </Text>
          <View style={styles.resultBannerText}>
            <Text style={styles.resultTitle}>
              {roundResult.is_correct
                ? `CORRECT! +${roundResult.points_earned} PTS`
                : 'WRONG GUESS!'}
            </Text>
            <Text style={styles.resultSongInfo}>
              {roundResult.correct_song?.title} • {roundResult.correct_song?.artist}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gameContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 550,
    alignSelf: 'center',
    width: '100%',
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  errorSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  exitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  exitBtnText: {
    color: COLORS.textMuted,
    fontWeight: '800',
    fontSize: 13,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quitBtn: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  quitBtnText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  roundBadge: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  roundBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scoreBadge: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accentAmber,
  },
  scoreText: {
    color: COLORS.accentAmber,
    fontSize: 14,
    fontWeight: '900',
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 179, 0, 0.18)',
    borderWidth: 1,
    borderColor: COLORS.accentAmber,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  streakEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  streakText: {
    color: COLORS.accentAmber,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  replayBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  replayBtnDisabled: {
    opacity: 0.5,
  },
  replayBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  skipBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accentRed,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  skipBtnDisabled: {
    opacity: 0.4,
  },
  skipBtnText: {
    color: COLORS.accentRed,
    fontSize: 11,
    fontWeight: '900',
  },
  questionPrompt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 6,
    marginBottom: 8,
  },
  optionsList: {
    marginTop: 4,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  resultBannerCorrect: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderWidth: 1.5,
    borderColor: COLORS.accentMint,
  },
  resultBannerWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1.5,
    borderColor: COLORS.accentRed,
  },
  resultBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resultBannerText: {
    flex: 1,
  },
  resultTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  resultSongInfo: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  // Game Over Card Styles
  gameOverCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 450,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  trophyEmoji: {
    fontSize: 50,
    marginBottom: 8,
  },
  gameOverTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gameOverSub: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 16,
  },
  finalScoreBox: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  finalScoreLabel: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  finalScoreValue: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ptsLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  statVal: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  statLab: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  playAgainBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  playAgainText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hallOfFameBtn: {
    backgroundColor: COLORS.cardBorder,
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  hallOfFameText: {
    color: COLORS.accentAmber,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  backHomeBtn: {
    paddingVertical: 8,
  },
  backHomeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
