// Temporizador de descanso entre séries (um só, para toda a app), com som no fim.
export const descanso = $state({ fim: 0, total: 0 });

let audio: AudioContext | undefined;
let bips: OscillatorNode[] = [];

function cancelarSom() {
  for (const o of bips) {
    try {
      o.stop();
    } catch {
      // já tinha parado
    }
    o.disconnect();
  }
  bips = [];
}

/** Agenda três bips no relógio do áudio; tem de ser chamado a partir de um toque. */
function agendarSom(seg: number) {
  try {
    audio ??= new AudioContext();
    audio.resume();
    cancelarSom();
    for (const atraso of [0, 0.25, 0.5]) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.25;
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + seg + atraso);
      o.stop(audio.currentTime + seg + atraso + 0.15);
      bips.push(o);
    }
  } catch {
    // sem áudio: o temporizador continua a funcionar
  }
}

export function iniciarDescanso(seg: number) {
  descanso.total = seg;
  descanso.fim = Date.now() + seg * 1000;
  agendarSom(seg);
}

export function maisDescanso(seg: number) {
  descanso.fim = Math.max(descanso.fim, Date.now()) + seg * 1000;
  descanso.total += seg;
  agendarSom((descanso.fim - Date.now()) / 1000);
}

export function pararDescanso() {
  descanso.fim = 0;
  cancelarSom();
}
