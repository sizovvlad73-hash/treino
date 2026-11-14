export type Tema = 'escuro' | 'claro' | 'sistema';

export const tema = $state({ v: (localStorage.getItem('tema') ?? 'escuro') as Tema });

/** Põe a cor da barra do sistema igual ao fundo do tema ativo. */
export function corDaBarra() {
  requestAnimationFrame(() => {
    const fundo = getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim();
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', fundo);
  });
}

export function definirTema(t: Tema) {
  tema.v = t;
  localStorage.setItem('tema', t);
  document.documentElement.dataset.tema = t;
  corDaBarra();
}
