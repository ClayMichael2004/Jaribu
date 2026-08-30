import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS, AVATAR_EMOJIS, AVATAR_COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';

const FUN_NICKNAMES = [
  'BeatsGuru', 'GrooveKing', 'AudioAce', 'SoundMaster',
  'MelodyQueen', 'VinylBoss', 'TrackTitan', 'RhythmPro',
  'BassHero', 'MicDrop', 'HitMaker', 'ChartTopper',
  'DJ Star', 'VibeSeeker', 'SongSniper', 'Harmonizer',
];

export default function PassPlaySetupScreen({
  category = 'kenyan',
  difficulty = 'medium',
  totalRounds = 5,
  onStartGame,
  onBack,
}) {
  const [players, setPlayers] = useState([
    { id: 'p1', name: 'Player 1', avatarEmoji: '🦁', avatarColor: '#FF4B4B' },
    { id: 'p2', name: 'Player 2', avatarEmoji: '⚡', avatarColor: '#00E5FF' },
  ]);
  const [roundsPreset, setRoundsPreset] = useState(3); // 2, 3, 5, or 'custom'
  const [customRoundsInput, setCustomRoundsInput] = useState('4');
  const [editingIndex, setEditingIndex] = useState(null);

  const addPlayer = () => {
    if (players.length >= 6) return;
    audioManager.playClick();
    const nextIdx = players.length + 1;
    const emoji = AVATAR_EMOJIS[(nextIdx - 1) % AVATAR_EMOJIS.length];
    const color = AVATAR_COLORS[(nextIdx - 1) % AVATAR_COLORS.length];
    setPlayers([
      ...players,
      {
        id: `p_${Date.now()}_${nextIdx}`,
        name: `Player ${nextIdx}`,
        avatarEmoji: emoji,
        avatarColor: color,
      },
    ]);
  };

  const removePlayer = (idx) => {
    if (players.length <= 2) return;
    audioManager.playClick();
    const updated = players.filter((_, i) => i !== idx);
    setPlayers(updated);
    if (editingIndex === idx) setEditingIndex(null);
  };

  const updatePlayerName = (text, idx) => {
    const updated = [...players];
    updated[idx].name = text;
    setPlayers(updated);
  };

  const assignRandomNickname = (idx) => {
    audioManager.playClick();
    const randomName = FUN_NICKNAMES[Math.floor(Math.random() * FUN_NICKNAMES.length)];
    const updated = [...players];
    updated[idx].name = randomName;
    setPlayers(updated);
  };

  const updatePlayerAvatar = (emoji, color, idx) => {
    audioManager.playClick();
    const updated = [...players];
    if (emoji) updated[idx].avatarEmoji = emoji;
    if (color) updated[idx].avatarColor = color;
    setPlayers(updated);
  };

  const getEffectiveRoundsPerPlayer = () => {
    if (roundsPreset === 'custom') {
      const parsed = parseInt(customRoundsInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
        return parsed;
      }
      return 4;
    }
    return roundsPreset;
  };

  const handleStart = () => {
    audioManager.playClick();
    const effectiveRounds = getEffectiveRoundsPerPlayer();

    // Ensure all players have non-empty names
    const sanitizedPlayers = players.map((p, i) => ({
      ...p,
      name: p.name.trim() || `Player ${i + 1}`,
    }));

    onStartGame({
      players: sanitizedPlayers,
      category,
      difficulty,
      roundsPerPlayer: effectiveRounds,
    });
  };

  const effectiveRounds = getEffectiveRoundsPerPlayer();
  const totalTurns = players.length * effectiveRounds;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PARTY LOBBY 👥</Text>
        <Text style={styles.subtitle}>
          PASS & PLAY • {category.replace('artist:', 'ARTIST: ').toUpperCase()}
        </Text>
      </View>

      {/* Players List with Custom Names */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            PLAYERS & CUSTOM NAMES ({players.length}/6)
          </Text>
          {players.length < 6 && (
            <TouchableOpacity style={styles.addPlayerBtn} onPress={addPlayer}>
              <Text style={styles.addPlayerText}>+ ADD PLAYER</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.sectionInstruction}>
          Type any custom name for your players or tap 🎲 for a random nickname:
        </Text>

        <View style={styles.playerGrid}>
          {players.map((p, idx) => {
            const isEditing = editingIndex === idx;
            return (
              <View
                key={p.id || idx}
                style={[
                  styles.playerCard,
                  { borderColor: p.avatarColor || COLORS.primary },
                ]}
              >
                <View style={styles.playerCardTop}>
                  {/* Avatar Icon */}
                  <TouchableOpacity
                    style={[styles.avatarBox, { backgroundColor: p.avatarColor || COLORS.primary }]}
                    onPress={() => {
                      audioManager.playClick();
                      setEditingIndex(isEditing ? null : idx);
                    }}
                  >
                    <Text style={styles.avatarEmoji}>{p.avatarEmoji || '🦁'}</Text>
                    <View style={styles.avatarEditBadge}>
                      <Text style={styles.avatarEditBadgeText}>✏️</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Player Name Input Field */}
                  <View style={styles.nameInputContainer}>
                    <View style={styles.nameInputRow}>
                      <TextInput
                        style={styles.nameInput}
                        value={p.name}
                        onChangeText={(text) => updatePlayerName(text, idx)}
                        placeholder={`Player ${idx + 1} Name`}
                        placeholderTextColor={COLORS.textMuted}
                        maxLength={18}
                      />
                      <TouchableOpacity
                        style={styles.randomNameBtn}
                        onPress={() => assignRandomNickname(idx)}
                        title="Random Name"
                      >
                        <Text style={styles.randomNameEmoji}>🎲</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.turnOrderText}>
                      Turn #{idx + 1} • {p.name ? `"${p.name}"` : `Player ${idx + 1}`}
                    </Text>
                  </View>

                  {players.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removePlayer(idx)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Avatar & Color Customization Drawer */}
                {isEditing && (
                  <View style={styles.avatarPickerDrawer}>
                    <Text style={styles.pickerLabel}>Choose Avatar Emoji & Theme Color:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                      {AVATAR_EMOJIS.map((emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          style={styles.emojiChoice}
                          onPress={() => updatePlayerAvatar(emoji, null, idx)}
                        >
                          <Text style={styles.emojiChoiceText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={styles.colorRow}>
                      {AVATAR_COLORS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.colorChoice,
                            { backgroundColor: c },
                            p.avatarColor === c && styles.colorChoiceActive,
                          ]}
                          onPress={() => updatePlayerAvatar(null, c, idx)}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Rounds per player with Custom Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ROUNDS PER PLAYER</Text>
        <View style={styles.roundsRow}>
          {[2, 3, 5].map((num) => {
            const isSelected = roundsPreset === num;
            return (
              <TouchableOpacity
                key={num}
                style={[styles.roundChoiceBtn, isSelected && styles.roundChoiceSelected]}
                onPress={() => {
                  audioManager.playClick();
                  setRoundsPreset(num);
                }}
              >
                <Text style={[styles.roundChoiceText, isSelected && styles.roundChoiceTextSelected]}>
                  {num} Rounds each
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.roundChoiceBtn, roundsPreset === 'custom' && styles.roundChoiceSelected]}
            onPress={() => {
              audioManager.unlockAudio();
              audioManager.playClick();
              setRoundsPreset('custom');
            }}
          >
            <Text style={[styles.roundChoiceText, roundsPreset === 'custom' && styles.roundChoiceTextSelected]}>
              ✏️ Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Rounds Stepper */}
        {roundsPreset === 'custom' && (
          <View style={styles.customRoundsBox}>
            <Text style={styles.customRoundsPrompt}>Enter Rounds per Player (1-20):</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  audioManager.playClick();
                  const val = Math.max(1, (parseInt(customRoundsInput, 10) || 1) - 1);
                  setCustomRoundsInput(val.toString());
                }}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.customRoundsInput}
                keyboardType="number-pad"
                value={customRoundsInput}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setCustomRoundsInput(cleaned);
                }}
                maxLength={2}
              />

              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  audioManager.playClick();
                  const val = Math.min(20, (parseInt(customRoundsInput, 10) || 1) + 1);
                  setCustomRoundsInput(val.toString());
                }}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.roundsUnitText}>Rounds each</Text>
            </View>
          </View>
        )}
      </View>

      {/* Match Summary Box */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>MATCH OVERVIEW</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Match Turns:</Text>
          <Text style={styles.summaryVal}>
            {totalTurns} Turns ({players.length} Players × {effectiveRounds} Rounds)
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Turn Order:</Text>
          <Text style={styles.summaryVal} numberOfLines={1}>
            {players.map((p) => p.name || 'Player').join(' → ')}
          </Text>
        </View>
      </View>

      {/* Start Button */}
      <TouchableOpacity style={styles.startPartyBtn} onPress={handleStart}>
        <Text style={styles.startPartyText}>START PARTY MATCH ({totalTurns} TURNS) 🚀</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 550,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 4,
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontWeight: '800',
    fontSize: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sectionInstruction: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 10,
  },
  addPlayerBtn: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  addPlayerText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  playerGrid: {
    gap: 10,
  },
  playerCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
  },
  playerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  avatarEditBadgeText: {
    fontSize: 8,
  },
  nameInputContainer: {
    flex: 1,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  nameInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    padding: 0,
  },
  randomNameBtn: {
    padding: 4,
  },
  randomNameEmoji: {
    fontSize: 16,
  },
  turnOrderText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    marginLeft: 2,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeBtnText: {
    color: COLORS.accentRed,
    fontWeight: '900',
    fontSize: 13,
  },
  avatarPickerDrawer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  pickerLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  pickerScroll: {
    marginBottom: 8,
  },
  emojiChoice: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emojiChoiceText: {
    fontSize: 18,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorChoice: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorChoiceActive: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  roundChoiceBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  roundChoiceSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
  },
  roundChoiceText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  roundChoiceTextSelected: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  customRoundsBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  customRoundsPrompt: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  stepperBtnText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  customRoundsInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    width: 55,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: 0,
  },
  roundsUnitText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 20,
  },
  summaryTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  summaryVal: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  startPartyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startPartyText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
});

