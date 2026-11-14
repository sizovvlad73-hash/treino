// Navegação por hash: #/ginasio/sessao/ID → ['ginasio', 'sessao', 'ID']
const ler = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

export const rota = $state({ p: ler() });

addEventListener('hashchange', () => {
  rota.p = ler();
  scrollTo(0, 0);
});

export const ir = (caminho: string) => {
  location.hash = '#/' + caminho;
};
