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
