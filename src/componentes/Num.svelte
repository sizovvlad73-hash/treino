<script lang="ts">
  // Campo numérico com vírgula decimal.
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { fmt, lerNum } from '../lib/formato';

  let {
    valor = $bindable(),
    casas = 1,
    ...resto
  }: { valor: number | null; casas?: number } & HTMLInputAttributes = $props();

  const texto_ = (v: number | null) => (v == null ? '' : fmt(v, casas).replace('−', '-'));
  let texto = $state('');
  let foco = false;

  $effect(() => {
    const t = texto_(valor);
    if (!foco) texto = t;
  });
</script>

<input
  type="text"
  inputmode="decimal"
  autocomplete="off"
  bind:value={texto}
  oninput={() => (valor = lerNum(texto))}
  onfocus={(e) => {
    foco = true;
    e.currentTarget.select();
  }}
  onblur={() => {
    foco = false;
    texto = texto_(valor);
  }}
  {...resto}
/>
