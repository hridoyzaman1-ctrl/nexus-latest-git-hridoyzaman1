/**
 * Global registry for managing audio elements across the application.
 * Allows stopping all non-meditation audio on navigation.
 */

class AudioRegistry {
  private static instance: AudioRegistry;
  private registry: Set<HTMLAudioElement> = new Set();
  private speechActive: boolean = false;

  private constructor() {}

  public static getInstance(): AudioRegistry {
    if (!AudioRegistry.instance) {
      AudioRegistry.instance = new AudioRegistry();
    }
    return AudioRegistry.instance;
  }

  /**
   * Register an audio element to be managed.
   */
  public register(audio: HTMLAudioElement): void {
    this.registry.add(audio);
  }

  /**
   * Unregister an audio element.
   */
  public unregister(audio: HTMLAudioElement): void {
    this.registry.delete(audio);
  }

  /**
   * Stop all registered audio elements.
   * This is intended for use during navigation to clear page-specific audio (like alarms or narrations).
   */
  public stopAll(): void {
    this.registry.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (err) {
        console.error('Error stopping registered audio:', err);
      }
    });
    // We don't clear the registry because some elements might be reused (e.g. singletons in libraries)
    // but typically they should unregister on cleanup.
    
    this.stopSpeech();
  }

  /**
   * Stop any active Web Speech Synthesis.
   */
  public stopSpeech(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioRegistry = AudioRegistry.getInstance();
