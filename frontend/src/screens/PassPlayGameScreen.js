import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { startPassPlayGame, submitPassPlayAnswer } from '../config/api';
import { audioManager } from '../utils/audio';
import TurntableVisualizer from '../components/TurntableVisualizer';
import CountdownTimer from '../components/CountdownTimer';
import OptionCard from '../components/OptionCard';

export default function PassPlayGameScreen({
  players = [],
  category = 'kenyan',
  difficulty = 'medium',
  roundsPerPlayer = 3,
  onExitGame,
}) {
  const [session, setSession] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(players[0]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(1);
  const [totalTurns, setTotalTurns] = useState(players.length * roundsPerPlayer);
  const [isReadyPhase, setIsReadyPhase] = useState(true); // "Pass phone to..." phase
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    initMatch();
    return () => {
      audioManager.stopSongPreview();
    };
  }, []);

  const initMatch = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await startPassPlayGame({
        players,
        category,
        difficulty,
        roundsPerPlayer,
      });

      setSession(data);
      setCurrentPlayer(data.current_player);
      setCurrentQuestion(data.first_question);
      setCurrentTurnIndex(1);
      setTotalTurns(data.total_rounds);
      setIsReadyPhase(true); // Wait for first player to press Ready
      setRoundResult(null);
      setSelectedOption(null);
      setIsGameOver(false);
    } catch (e) {
      console.error('Pass & Play init error:', e);
      setError(e.message || 'Failed to start match');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerReady = () => {
    audioManager.playClick();
    setIsReadyPhase(false);
    playQuestionSnippet(currentQuestion);
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
    if (isAnswering || roundResult || isGameOver) return;

    setIsAnswering(true);
    setSelectedOption(option);
    const timeTaken = Date.now() - startTimeRef.current;

    try {
      const res = await submitPassPlayAnswer({
        sessionId: session.session_id,
        selectedOptionId: option.id,
        timeTakenMs: timeTaken,
      });

      setRoundResult(res.result);
      if (res.result.current_scores) {
        setFinalScores(res.result.current_scores);
      }

      if (res.result.is_correct) {
        audioManager.playCorrect();
      } else {
        audioManager.playWrong();
      }

      if (res.is_game_over) {
        setTimeout(() => {
          setIsGameOver(true);
          audioManager.playVictory();
          triggerConfetti();
        }, 2000);
      } else {
        setTimeout(() => {
          // Advance to next player turn
          audioManager.stopSongPreview();
          setCurrentTurnIndex((prev) => prev + 1);
          setCurrentPlayer(res.next_player);
          setCurrentQuestion(res.next_question);
          setRoundResult(null);
          setSelectedOption(null);
          setIsReadyPhase(true); // Prompt to pass phone
        }, 2200);
      }
    } catch (e) {
      console.error('Answer submission error:', e);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleTimeUp = () => {
    if (roundResult || isGameOver || isAnswering) return;
    handleSelectOption({ id: 'timeout', title: 'Time Up!', artist: '' });
  };

  const triggerConfetti = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const confetti = require('canvas-confetti');
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch (e) {
        // Ignored
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.accentMint} />
        <Text style={styles.loadingText}>Preparing party match & beats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Party match error</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initMatch}>
          <Text style={styles.retryBtnText}>RETRY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitBtn} onPress={onExitGame}>
          <Text style={styles.exitBtnText}>EXIT TO HOME</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 1. FINAL PODIUM / WINNER SCREEN
  if (isGameOver) {
    const sortedPlayers = [...(finalScores.length > 0 ? finalScores : players)].sort(
      (a, b) => b.score - a.score
    );
    const winner = sortedPlayers[0];

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
        <View style={styles.victoryCard}>
          <Text style={styles.victoryTitle}>🎉 MATCH FINISHED! 🎉</Text>
          <Text style={styles.victorySubtitle}>PARTY PODIUM</Text>

          {/* Winner Showcase */}
          <View style={[styles.winnerBox, { borderColor: winner.avatarColor || COLORS.accentMint }]}>
            <View style={[styles.winnerAvatar, { backgroundColor: winner.avatarColor || COLORS.accentMint }]}>
              <Text style={styles.winnerEmoji}>{winner.avatarEmoji || '👑'}</Text>
            </View>
            <Text style={styles.winnerBadge}>🥇 1ST PLACE CHAMPION</Text>
            <Text style={styles.winnerName}>{winner.player_name || winner.name}</Text>
            <Text style={styles.winnerScore}>{winner.score} PTS</Text>
          </View>

          {/* Leaderboard Table */}
          <View style={styles.podiumList}>
            {sortedPlayers.map((p, idx) => (
              <View key={p.player_id || idx} style={styles.podiumRow}>
                <Text style={styles.rankNum}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </Text>
                <View style={[styles.miniAvatar, { backgroundColor: p.avatarColor || '#333' }]}>
                  <Text style={styles.miniEmoji}>{p.avatarEmoji || '👤'}</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {p.player_name || p.name}
                </Text>
                <Text style={styles.podiumScore}>{p.score} pts</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.rematchBtn}
            onPress={() => {
              audioManager.playClick();
              initMatch();
            }}
          >
            <Text style={styles.rematchText}>PLAY REMATCH ↻</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exitPartyBtn}
            onPress={() => {
              audioManager.playClick();
              onExitGame();
            }}
          >
            <Text style={styles.exitPartyText}>BACK TO MAIN MENU</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 2. PASS THE PHONE TRANSITION PHASE
  if (isReadyPhase) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.readyScrollContent}>
        <View style={styles.readyContent}>
          {/* Top Bar with Exit and Turn Badge */}
          <View style={styles.readyTopBar}>
            <TouchableOpacity style={styles.quitBtnTop} onPress={onExitGame}>
              <Text style={styles.quitBtnText}>✕ EXIT MATCH</Text>
            </TouchableOpacity>
            <View style={styles.readyTurnBadge}>
              <Text style={styles.readyTurnBadgeText}>TURN {currentTurnIndex} / {totalTurns}</Text>
            </View>
          </View>

          <View style={styles.passHeader}>
            <Text style={styles.passPrompt}>📱 PASS PHONE TO:</Text>
          </View>

          <View style={[styles.targetPlayerCard, { borderColor: currentPlayer?.avatarColor || COLORS.primary }]}>
            <View style={[styles.largeAvatar, { backgroundColor: currentPlayer?.avatarColor || COLORS.primary }]}>
              <Text style={styles.largeAvatarEmoji}>{currentPlayer?.avatarEmoji || '🦁'}</Text>
            </View>
            <Text style={styles.targetPlayerName}>{currentPlayer?.name || 'Player'}</Text>
            <Text style={styles.targetCurrentScore}>Current Score: {currentPlayer?.score || 0} pts</Text>
          </View>

          <Text style={styles.readyInstruction}>
            Hold the phone and listen to the song snippet when you're ready!
          </Text>

          {/* HIGH CONTRAST, GLOWING READY BUTTON - ALWAYS VISIBLE */}
          <TouchableOpacity
            style={[styles.readyBtn, { backgroundColor: currentPlayer?.avatarColor || COLORS.primary }]}
            onPress={handlePlayerReady}
            activeOpacity={0.85}
          >
            <Text style={styles.readyBtnText}>I'M READY! PLAY BEAT 🎵</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 3. ACTIVE TURN GAMEPLAY
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.gameContent}>
      {/* Turn Player HUD */}
      <View style={styles.hud}>
        <View style={styles.turnPlayerBox}>
          <View style={[styles.hudAvatar, { backgroundColor: currentPlayer.avatarColor }]}>
            <Text style={styles.hudEmoji}>{currentPlayer.avatarEmoji}</Text>
          </View>
          <View>
            <Text style={styles.hudTurnLabel}>CURRENT TURN</Text>
            <Text style={styles.hudPlayerName}>{currentPlayer.name}</Text>
          </View>
        </View>

        <View style={styles.turnCounterBadge}>
          <Text style={styles.turnCounterText}>
            {currentTurnIndex}/{totalTurns}
          </Text>
        </View>
      </View>

      {/* Turntable Visualizer */}
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
          <Text style={styles.skipBtnText}>⏭️ SKIP TURN</Text>
        </TouchableOpacity>
      </View>

      {/* Countdown Timer */}
      <CountdownTimer
        durationMs={currentQuestion?.duration_limit_ms || 10000}
        isActive={!roundResult && !isGameOver}
        onTimeUp={handleTimeUp}
      />

      {/* Prompt */}
      <Text style={styles.questionPrompt}>
        {currentPlayer.name.toUpperCase()}, GUESS THE TRACK:
      </Text>

      {/* Options */}
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

      {/* Turn Result Banner */}
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
                ? `${currentPlayer.name} EARNED +${roundResult.points_earned} PTS!`
                : `${currentPlayer.name} MISSED!`}
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
  readyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  readyContent: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    alignSelf: 'center',
  },
  readyTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  quitBtnTop: {
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  quitBtnText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  readyTurnBadge: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  readyTurnBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  passHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  passPrompt: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  targetPlayerCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2.5,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    marginBottom: 14,
  },
  largeAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  largeAvatarEmoji: {
    fontSize: 34,
  },
  targetPlayerName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  targetCurrentScore: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  readyInstruction: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  readyBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  readyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  turnPlayerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  hudAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  hudEmoji: {
    fontSize: 16,
  },
  hudTurnLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudPlayerName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
  },
  turnCounterBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accentMint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  turnCounterText: {
    color: COLORS.accentMint,
    fontSize: 12,
    fontWeight: '900',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 6,
  },
  replayBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    paddingVertical: 6,
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
    fontSize: 11,
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
  },
  resultSongInfo: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  // Victory Podium
  victoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  victoryTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  victorySubtitle: {
    color: COLORS.accentMint,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
    marginBottom: 16,
  },
  winnerBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 2,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  winnerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  winnerEmoji: {
    fontSize: 32,
  },
  winnerBadge: {
    color: COLORS.accentMint,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  winnerName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  winnerScore: {
    color: COLORS.accentAmber,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  podiumList: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rankNum: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniEmoji: {
    fontSize: 15,
  },
  podiumName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  podiumScore: {
    color: COLORS.accentAmber,
    fontSize: 14,
    fontWeight: '900',
  },
  rematchBtn: {
    backgroundColor: COLORS.accentMint,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  rematchText: {
    color: '#090D14',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  exitPartyBtn: {
    paddingVertical: 8,
  },
  exitPartyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
});
