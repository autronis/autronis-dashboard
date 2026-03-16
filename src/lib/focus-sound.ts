let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function playFocusDing(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.5);

    // Second tone (harmony)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15); // E6
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 1.5);
  } catch {
    // Audio not supported, silently fail
  }
}

export function requestNotificationPermission(): void {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showFocusNotification(projectNaam: string): void {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("Focus sessie voltooid!", {
      body: `Je hebt gefocust op ${projectNaam}`,
      icon: "/icons/icon-192x192.png",
    });
  }
}
