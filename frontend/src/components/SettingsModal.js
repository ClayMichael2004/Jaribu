import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { COLORS, AVATAR_EMOJIS, AVATAR_COLORS } from '../constants/theme';
import { resetAllRecords } from '../config/api';
import { audioManager } from '../utils/audio';

export default function SettingsModal({
  visible = false,
  onClose,
  playerName = 'Clay',
  avatarEmoji = '🎧',
  avatarColor = '#c0c1ff',
  onUpdateProfile,
  onRecordsReset,
}) {
  const [name, setName] = useState(playerName);
  const [selectedEmoji, setSelectedEmoji] = useState(avatarEmoji);
  const [selectedColor, setSelectedColor] = useState(avatarColor);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(playerName);
      setSelectedEmoji(avatarEmoji);
      setSelectedColor(avatarColor);
    }
  }, [visible, playerName, avatarEmoji, avatarColor]);

  const handleSave = () => {
    audioManager.playClick();
    if (onUpdateProfile) {
      onUpdateProfile({
        playerName: name.trim() || 'Clay',
        avatarEmoji: selectedEmoji,
        avatarColor: selectedColor,
      });
    }
    onClose();
  };

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      audioManager.playClick();
      await resetAllRecords(name);
      if (onRecordsReset) onRecordsReset();
      setShowConfirmReset(false);
      if (Platform.OS === 'web') {
        window.alert('All match records and scores have been reset successfully.');
      } else {
        Alert.alert('Success', 'All match records and scores have been reset.');
      }
    } catch (e) {
      console.error('Reset error:', e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>GAME SETTINGS</Text>
            <TouchableOpacity
              onPress={() => {
                audioManager.playClick();
                onClose();
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Player Profile Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PLAYER PROFILE</Text>
              
              {/* Avatar Preview */}
              <View style={styles.avatarRow}>
                <View
                  style={[
                    styles.avatarPreview,
                    { borderColor: selectedColor, backgroundColor: 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  <Text style={styles.avatarEmojiText}>{selectedEmoji}</Text>
                </View>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.inputLabel}>PLAYER CALLSIGN</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter player name"
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={16}
                  />
                </View>
              </View>

              {/* Emoji Picker */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>CHOOSE AVATAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                <View style={styles.pickerRow}>
                  {AVATAR_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => {
                        audioManager.playClick();
                        setSelectedEmoji(emoji);
                      }}
                      style={[
                        styles.emojiOption,
                        selectedEmoji === emoji && styles.emojiOptionActive,
                      ]}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Color Picker */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>ACCENT GLOW COLOR</Text>
              <View style={styles.colorRow}>
                {AVATAR_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedColor(c);
                    }}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorCircleActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Audio Engine Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AUDIO & PERFORMANCE</Text>
              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>Live Beat Engine</Text>
                  <Text style={styles.settingSub}>30-sec HD Master Previews</Text>
                </View>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>READY</Text>
                </View>
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: COLORS.error }]}>DANGER ZONE</Text>
              {showConfirmReset ? (
                <View style={styles.confirmResetBox}>
                  <Text style={styles.confirmResetText}>
                    Are you sure you want to reset all highscores and statistics?
                  </Text>
                  <View style={styles.confirmButtonsRow}>
                    <TouchableOpacity
                      onPress={() => setShowConfirmReset(false)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleResetData}
                      disabled={isResetting}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>
                        {isResetting ? 'Resetting...' : 'Confirm Reset'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    audioManager.playClick();
                    setShowConfirmReset(true);
                  }}
                  style={styles.resetButton}
                >
                  <Text style={styles.resetButtonText}>RESET ALL RECORDS</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* App Info */}
            <View style={styles.footer}>
              <Text style={styles.versionText}>JARIBU MUSIC QUIZ • V2.0 STITCH EDITION</Text>
              <Text style={styles.subVersionText}>Powered by Go Engine & React Native</Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>SAVE & CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  body: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarEmojiText: {
    fontSize: 26,
  },
  nameInputContainer: {
    flex: 1,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: COLORS.surfaceContainerHigh,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerScroll: {
    marginHorizontal: -4,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  emojiOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
    transform: [{ scale: 1.1 }],
  },
  emojiText: {
    fontSize: 20,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  activeTag: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTagText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  confirmResetBox: {
    backgroundColor: 'rgba(255, 180, 171, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
  },
  confirmResetText: {
    color: COLORS.text,
    fontSize: 13,
    marginBottom: 12,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.errorContainer,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subVersionText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    opacity: 0.6,
  },
  footerActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  saveButtonText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
