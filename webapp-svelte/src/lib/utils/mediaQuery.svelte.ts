/**
 * The svelte equivalent of MUI's `useMediaQuery`.
 *
 * Usage mirrors the react app:
 *
 *   const tablet = mediaQuery('(min-width:800px)');
 *   {#if tablet.matches} ... {/if}
 *
 * `matches` is a rune-backed getter, so reading it inside markup or an
 * `$effect` subscribes to it. The listener is torn down with the component
 * that created it, which is why this must be called during initialisation.
 */
export function mediaQuery(query: string): { readonly matches: boolean } {
  const list = window.matchMedia(query);
  let matches = $state(list.matches);

  const onChange = (e: MediaQueryListEvent) => {
    matches = e.matches;
  };

  $effect(() => {
    // re-read once on mount: the query can have flipped between the
    // initialisation above and the moment the effect runs
    matches = list.matches;
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  });

  return {
    get matches() {
      return matches;
    },
  };
}
