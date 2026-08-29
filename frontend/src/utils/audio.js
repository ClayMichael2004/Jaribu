import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { API_BASE } from '../config/api';

class AudioManager {
  constructor() {
    this.soundObject = null;
    this.currentAudio = null;
    this.audioContext = null;
    this.isPlaying = false;
    this.snippetTimer = null;
    this.isUnlocked = false;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.initWebAudio();
    }
  }

  initWebAudio() {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioContext = new AudioCtx();
        } catch (e) {}
      }
    }
  }

  // Explicitly unlock audio on any user touch/click
  unlockAudio() {
    this.isUnlocked = true;
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.25) {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

      gain.gain.setValueAtTime(gainVal, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    } catch (e) {}
  }

  playClick() {
    this.unlockAudio();
    this.playTone(800, 'sine', 0.05, 0.15);
  }

  playTick() {
    this.playTone(1200, 'triangle', 0.04, 0.1);
  }

  playCorrect() {
    this.unlockAudio();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.3, 0.2);
      }, idx * 75);
    });
  }

  playWrong() {
    this.unlockAudio();
    this.playTone(180, 'sawtooth', 0.2, 0.3);
    setTimeout(() => {
      this.playTone(130, 'sawtooth', 0.3, 0.35);
    }, 120);
  }

  playStreak() {
    this.unlockAudio();
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.2, 0.25);
      }, idx * 60);
    });
  }

  playVictory() {
    this.unlockAudio();
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    chord.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 'triangle', 0.5, 0.25);
      }, i * 90);
    });
  }

  // Play music stream preview (mp3) with resilient multi-tier playback
  async playSongPreview(url, snippetDurationSec = 10, onPlaybackEnd = null) {
    await this.stopSongPreview();

    if (!url) {
      console.warn('playSongPreview: No preview URL provided');
      return;
    }

    this.unlockAudio();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const audio = new window.Audio();
        audio.preload = 'auto';
        audio.volume = 1.0;
        this.currentAudio = audio;

        const tryPlay = (streamUrl) => {
          return new Promise((resolve, reject) => {
            audio.src = streamUrl;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  this.isPlaying = true;
                  resolve(true);
                })
                .catch((err) => {
                  reject(err);
                });
            } else {
              this.isPlaying = true;
              resolve(true);
            }
          });
        };

        // Try direct stream first (most CDNs allow direct <audio> src without CORS restrictions)
        tryPlay(url).catch(() => {
          // If blocked, fallback to backend proxy stream
          const proxyUrl = `${API_BASE}/audio/proxy?url=${encodeURIComponent(url)}`;
          return tryPlay(proxyUrl);
        }).catch((e) => {
          console.warn('Audio playback could not auto-start:', e);
        });

        if (snippetDurationSec > 0) {
          this.snippetTimer = setTimeout(() => {
            this.stopSongPreview();
            if (onPlaybackEnd) onPlaybackEnd();
          }, snippetDurationSec * 1000);
        }
      } catch (err) {
        console.warn('Web audio playback exception:', err);
      }
    } else {
      // React Native Expo-AV for Mobile (Android / iOS)
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, volume: 1.0 }
        );
        this.soundObject = sound;
        this.isPlaying = true;

        if (snippetDurationSec > 0) {
          this.snippetTimer = setTimeout(async () => {
            await this.stopSongPreview();
            if (onPlaybackEnd) onPlaybackEnd();
          }, snippetDurationSec * 1000);
        }
      } catch (err) {
        console.warn('Mobile audio playback error, trying proxy fallback:', err);
        try {
          const proxyUrl = `${API_BASE}/audio/proxy?url=${encodeURIComponent(url)}`;
          const { sound } = await Audio.Sound.createAsync(
            { uri: proxyUrl },
            { shouldPlay: true, volume: 1.0 }
          );
          this.soundObject = sound;
          this.isPlaying = true;
        } catch (e2) {
          console.error('All mobile audio playback attempts failed:', e2);
        }
      }
    }
  }

  async stopSongPreview() {
    if (this.snippetTimer) {
      clearTimeout(this.snippetTimer);
      this.snippetTimer = null;
    }

    if (Platform.OS === 'web' && this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.currentAudio.load();
      } catch (e) {}
      this.currentAudio = null;
    }

    if (this.soundObject) {
      try {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
      } catch (e) {}
      this.soundObject = null;
    }

    this.isPlaying = false;
  }
}

export const audioManager = new AudioManager();
