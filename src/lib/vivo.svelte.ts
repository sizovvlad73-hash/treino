import { liveQuery } from 'dexie';

/** Consulta à base de dados que se atualiza sozinha quando os dados mudam. */
export function vivo<T, I = T>(
  consulta: () => Promise<T> | T,
  inicial: I,
  deps?: () => unknown, // estado de que a consulta depende (ex. a data escolhida)
): { readonly v: T | I } {
  let v = $state.raw<T | I>(inicial);
  $effect(() => {
    deps?.();
    const s = liveQuery(consulta).subscribe({ next: (x) => (v = x), error: (e) => console.error(e) });
    return () => s.unsubscribe();
  });
  return {
    get v() {
      return v;
    },
  };
}
