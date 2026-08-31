import { Platform } from 'react-native';
import { API_BASE } from '../config/api';

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.currentAudio = null;
    this.isPlaying = false;
    this.snippetTimer = null;
    this.isUnlocked = false;
    this.playbackId = 0; // Monotonic token preventing asynchronous audio overlap
    this.preloadedAudioMap = new Map(); // Cache of pre-buffered Audio objects

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

      // Auto-unlock audio context on any user tap / key
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
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
        this.playTone(freq, 'triangle', 0.25, 0.2);
      }, idx * 60);
    });
  }

  playWrong() {
    this.unlockAudio();
    this.playTone(180, 'sawtooth', 0.2, 0.25);
    setTimeout(() => {
      this.playTone(130, 'sawtooth', 0.25, 0.3);
    }, 100);
  }

  playStreak() {
    this.unlockAudio();
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.2, 0.25);
      }, idx * 50);
    });
  }

  playVictory() {
    this.unlockAudio();
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    chord.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 'triangle', 0.45, 0.22);
      }, i * 80);
    });
  }

  // Pre-buffer next audio track in memory to eliminate inter-round latency
  preBufferAudio(url) {
    if (!url || Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (this.preloadedAudioMap.has(url)) return;

    try {
      const audio = new window.Audio();
      audio.preload = 'auto';
      audio.src = url;
      audio.load();
      this.preloadedAudioMap.set(url, audio);

      // Clean up oldest if cache exceeds 10 items
      if (this.preloadedAudioMap.size > 10) {
        const firstKey = this.preloadedAudioMap.keys().next().value;
        const oldAudio = this.preloadedAudioMap.get(firstKey);
        if (oldAudio) {
          oldAudio.src = '';
        }
        this.preloadedAudioMap.delete(firstKey);
      }
    } catch (e) {}
  }

  // Play music stream preview (mp3/m4a) with zero latency & instant proxy fallback
  async playSongPreview(url, snippetDurationSec = 8, onPlaybackEnd = null) {
    // 1. Immediately kill any currently active sound
    await this.stopSongPreview();

    if (!url) {
      console.warn('playSongPreview: No preview URL provided');
      return;
    }

    // 2. Generate unique playback token for this specific question
    const currentToken = ++this.playbackId;
    this.unlockAudio();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        let audio = this.preloadedAudioMap.get(url);
        if (!audio) {
          audio = new window.Audio();
          audio.preload = 'auto';
          audio.src = url;
        } else {
          this.preloadedAudioMap.delete(url);
        }

        audio.volume = 1.0;
        audio.currentTime = 0;
        this.currentAudio = audio;

        const executePlay = (streamUrl) => {
          return new Promise((resolve, reject) => {
            if (this.playbackId !== currentToken) {
              reject(new Error('Playback superseded'));
              return;
            }

            audio.src = streamUrl;
            const playPromise = audio.play();

            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  if (this.playbackId !== currentToken) {
                    audio.pause();
                    audio.src = '';
                    reject(new Error('Playback cancelled'));
                    return;
                  }
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

        // Attempt direct stream playback first
        executePlay(url)
          .catch(() => {
            // Instant fallback to backend proxy if CDN or CORS restricted
            if (this.playbackId !== currentToken) return;
            const proxyUrl = `${API_BASE}/audio/proxy?url=${encodeURIComponent(url)}`;
            return executePlay(proxyUrl);
          })
          .catch((e) => {
            if (this.playbackId === currentToken) {
              console.warn('Audio playback info:', e.message);
            }
          });

        if (snippetDurationSec > 0) {
          this.snippetTimer = setTimeout(() => {
            if (this.playbackId === currentToken) {
              this.stopSongPreview();
              if (onPlaybackEnd) onPlaybackEnd();
            }
          }, snippetDurationSec * 1000);
        }
      } catch (e) {
        console.warn('Web Audio Playback error:', e);
      }
    }
  }

  async stopSongPreview() {
    this.playbackId++; // Invalidate pending play operations
    if (this.snippetTimer) {
      clearTimeout(this.snippetTimer);
      this.snippetTimer = null;
    }

    if (Platform.OS === 'web' && this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.currentAudio = null;
      } catch (e) {}
    }

    this.isPlaying = false;
  }
}

export const audioManager = new AudioManager();
