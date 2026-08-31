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
import { startPassPlayGame, submitPassPlayAnswer } from '../config/api';
import { audioManager } from '../utils/audio';
import TurntableVisualizer from '../components/TurntableVisualizer';
import CountdownTimer from '../components/CountdownTimer';
import OptionCard from '../components/OptionCard';
import { Icon } from '../components/Icons';

export default function PassPlayGameScreen({
  players = [],
  category = 'kenyan',
  difficulty = 'medium',
  roundsPerPlayer = 3,
  onExitGame,
  onOpenLeaderboard,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(1);
  const [totalTurns, setTotalTurns] = useState(players.length * roundsPerPlayer);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [roundOutcome, setRoundOutcome] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReadyPhase, setIsReadyPhase] = useState(true); // Handover phase

  const startTimeRef = useRef(Date.now());
  const isTransitioningRef = useRef(false);

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
      isTransitioningRef.current = false;
      const data = await startPassPlayGame({
        players,
        category,
        difficulty,
        roundsPerPlayer,
      });

      setSession(data);
      setCurrentTurnIndex(1);
      setTotalTurns(data.total_turns || players.length * roundsPerPlayer);
      setCurrentPlayer(data.first_player || players[0]);
      setCurrentQuestion(data.first_question);
      setIsReadyPhase(true);
      setIsGameOver(false);
      setRoundOutcome(null);
      setSelectedOption(null);
    } catch (e) {
      console.error('Failed to init Pass & Play:', e);
      setError(e.message || 'Failed to start match session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPlayerTurn = () => {
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
    if (isAnswering || isTransitioningRef.current || !session || !currentQuestion) return;

    isTransitioningRef.current = true;
    setIsAnswering(true);
    setSelectedOption(option);
    audioManager.stopSongPreview();
    setIsPlayingAudio(false);

    const timeTakenMs = Math.max(100, Date.now() - startTimeRef.current);

    try {
      const res = await submitPassPlayAnswer({
        sessionId: session.session_id,
        selectedOptionId: option.id,
        timeTakenMs,
      });

      const outcome = res.result || res;
      const isCorrect = outcome.is_correct === true;
      const pointsEarned = outcome.points_earned || 0;
      const correctSongId = outcome.correct_song?.id || outcome.correct_option_id;

      setRoundOutcome({
        is_correct: isCorrect,
        correct_song_id: correctSongId,
        points_earned: pointsEarned,
      });

      if (isCorrect) {
        audioManager.playCorrect();
      } else {
        audioManager.playWrong();
      }

      setTimeout(() => {
        if (res.is_game_over || outcome.is_game_over) {
          setIsGameOver(true);
          setFinalScores(outcome.current_scores || res.leaderboard || res.player_scores || []);
          audioManager.playVictory();
        } else if (res.next_question) {
          setCurrentTurnIndex((prev) => prev + 1);
          setCurrentPlayer(res.next_player);
          setCurrentQuestion(res.next_question);
          setIsReadyPhase(true); // Handover to next player
          setSelectedOption(null);
          setRoundOutcome(null);
          setIsAnswering(false);
          isTransitioningRef.current = false;
        }
      }, 1600);
    } catch (e) {
      console.error('Pass & Play submit error:', e);
      setIsAnswering(false);
      isTransitioningRef.current = false;
    }
  };

  const handleTimeUp = () => {
    if (isAnswering || isTransitioningRef.current || !currentQuestion) return;
    handleSelectOption({ id: 'timeout', title: 'Time Up', artist: 'None' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>PREPARING MULTIPLAYER LOBBY...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="zap" size={40} color={COLORS.error} style={{ marginBottom: 12 }} />
        <Text style={styles.errorTitle}>MATCH LAUNCH FAILED</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={initMatch} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>RETRY</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={onExitGame} style={styles.exitSecondaryBtn}>
          <Text style={styles.exitSecondaryText}>EXIT TO SETUP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity activeOpacity={0.8} onPress={onExitGame} style={styles.closeBtn}>
            <Icon name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerCenterInfo}>
            <Text style={styles.turnLabel}>
              TURN {currentTurnIndex} / {totalTurns}
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={onExitGame} style={styles.exitPill}>
            <Text style={styles.exitPillText}>EXIT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Handover "Pass Phone" Ready Screen */}
      {isReadyPhase && !isGameOver ? (
        <View style={styles.handoverContainer}>
          <View style={styles.handoverCard}>
            <View
              style={[
                styles.handoverAvatarCircle,
                { borderColor: currentPlayer?.avatarColor || COLORS.primary },
              ]}
            >
              <Text style={{ fontSize: 48 }}>{currentPlayer?.avatarEmoji || '🎧'}</Text>
            </View>

            <Text style={styles.handoverTitle}>
              Pass device to{' '}
              <Text style={{ color: currentPlayer?.avatarColor || COLORS.primaryLight }}>
                {currentPlayer?.name}
              </Text>
            </Text>
            <Text style={styles.handoverSubtitle}>
              Turn {currentTurnIndex} of {totalTurns} • Tap ready when you have the device!
            </Text>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleStartPlayerTurn}
              style={styles.imReadyBtn}
            >
              <Icon name="play" size={16} color={COLORS.onPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.imReadyBtnText}>I'M READY!</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Active Turn Screen */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Player Status Badge */}
          <View style={styles.activePlayerBanner}>
            <View
              style={[
                styles.activePlayerDot,
                { backgroundColor: currentPlayer?.avatarColor || COLORS.primary },
              ]}
            />
            <Text style={styles.activePlayerName}>
              NOW PLAYING: <Text style={{ color: COLORS.primaryLight }}>{currentPlayer?.name}</Text>
            </Text>
          </View>

          {/* Vinyl Centerpiece */}
          <TurntableVisualizer
            isPlaying={isPlayingAudio}
            categoryEmoji={currentPlayer?.avatarEmoji || '🎧'}
            durationSec={currentQuestion?.play_snippet_sec || 8}
            size={isDesktop ? 'hero' : 'normal'}
            onTogglePlay={() => playQuestionSnippet(currentQuestion)}
          />

          {/* Timer */}
          <CountdownTimer
            questionId={currentQuestion?.id || currentTurnIndex}
            durationMs={(currentQuestion?.play_snippet_sec || 8) * 1000}
            isActive={!isAnswering && !isGameOver && !isReadyPhase}
            onTimeUp={handleTimeUp}
          />

          {/* Question Prompt */}
          <Text style={styles.questionPrompt}>
            WHAT SONG IS PLAYING?
          </Text>

          {/* 4 Choices */}
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
      )}

      {/* Multiplayer Championship Podium Modal */}
      {isGameOver && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverCard}>
            <Icon name="trophy" size={48} color="#FFD700" style={{ marginBottom: 10 }} />
            <Text style={styles.gameOverTitle}>CHAMPIONSHIP PODIUM</Text>
            <Text style={styles.gameOverSubtitle}>Pass & Play Match Results</Text>

            {/* Podium Players List */}
            <View style={styles.podiumList}>
              {finalScores.map((p, idx) => (
                <View
                  key={p.player_id || idx}
                  style={[
                    styles.podiumRow,
                    idx === 0 && styles.podiumRowWinner,
                  ]}
                >
                  <View style={styles.podiumLeft}>
                    <Text
                      style={[
                        styles.podiumRank,
                        idx === 0 && { color: '#FFD700' },
                        idx === 1 && { color: '#C0C0C0' },
                        idx === 2 && { color: '#CD7F32' },
                      ]}
                    >
                      #{idx + 1}
                    </Text>
                    <View
                      style={[
                        styles.podiumAvatarCircle,
                        { borderColor: p.avatar_color || COLORS.primary },
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>{p.avatar_emoji || '👤'}</Text>
                    </View>
                    <Text style={styles.podiumPlayerName}>{p.player_name}</Text>
                  </View>

                  <View style={styles.podiumRight}>
                    <Text style={styles.podiumScoreVal}>
                      {(p.score || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.podiumPtsText}>PTS</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.gameOverActions}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={initMatch}
                style={styles.rematchBtn}
              >
                <Icon name="refresh" size={14} color={COLORS.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.rematchBtnText}>REMATCH</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onExitGame}
                style={styles.homeBtn}
              >
                <Icon name="home" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.homeBtnText}>RETURN TO LOBBY</Text>
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
    marginBottom: 6,
  },
  errorSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    marginBottom: 10,
  },
  retryBtnText: {
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
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
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
  },
  headerCenterInfo: {},
  turnLabel: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  exitPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exitPillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  handoverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  handoverCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 193, 255, 0.25)',
    padding: 28,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  handoverAvatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  handoverTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  handoverSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
  },
  imReadyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  imReadyBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
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
  activePlayerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
    gap: 8,
  },
  activePlayerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activePlayerName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  questionPrompt: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 16,
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
  },
  gameOverTitle: {
    color: COLORS.primaryLight,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  gameOverSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 20,
  },
  podiumList: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  podiumRowWinner: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  podiumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  podiumRank: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '900',
    width: 24,
  },
  podiumAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumPlayerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  podiumRight: {
    alignItems: 'flex-end',
  },
  podiumScoreVal: {
    color: COLORS.secondary,
    fontSize: 15,
    fontWeight: '900',
  },
  podiumPtsText: {
    color: COLORS.textSecondary,
    fontSize: 8,
    fontWeight: '800',
  },
  gameOverActions: {
    width: '100%',
    gap: 10,
  },
  rematchBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 14,
  },
  rematchBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  homeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 9999,
    paddingVertical: 12,
  },
  homeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
