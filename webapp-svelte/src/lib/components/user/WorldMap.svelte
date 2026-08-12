<script lang="ts">
  /**
   * The world map of the profile card: countries this user has met somebody
   * from are painted light blue, the rest stay grey.
   *
   * The drawing is src/assets/world.svg, a simplemaps map (MIT, attribution in
   * the file's own header) in which every path carries a data-c="<ISO 3166-1
   * alpha-2>" — see the note there. Several paths share a code: a country with
   * islands is drawn as one path per landmass, and highlighting is per code,
   * so all of them light up together.
   *
   * It is fetched rather than bundled: 140kB of path data is half the size of
   * the app's whole javascript, and nothing needs it until a profile popup
   * opens.
   */
  import worldUrl from '$assets/world.svg?url';

  let { countries = [] }: { countries?: string[] } = $props();

  let markup = $state('');
  let container: HTMLDivElement | null = $state(null);

  $effect(() => {
    let cancelled = false;
    fetch(worldUrl)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) markup = text;
      })
      // a map that fails to load leaves the rest of the card intact, which is
      // the whole reason it is a separate fetch
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });

  /* The svg is inserted as markup, so it is outside svelte's reach: the
   * highlight is applied to the dom, not expressed in the template. It reruns
   * whenever the map or the list changes. */
  $effect(() => {
    if (!container || !markup) return;
    const visited = new Set(countries.map((code) => code.toUpperCase()));
    for (const path of container.querySelectorAll('[data-c]')) {
      path.classList.toggle('visited', visited.has(path.getAttribute('data-c') ?? ''));
    }
  });
</script>

<div class="world-map" bind:this={container}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- static asset, see above -->
  {@html markup}
</div>

<style>
  .world-map {
    --land: var(--gray-80);
    --land-border: #5a6169;
    --visited: white;
    /* a dark border rather than a lighter one: the light blue is the brightest
     * thing on the card, so a highlight around it made neighbouring visited
     * countries bleed into one shape instead of separating them */
    --visited-border: black;
    margin-top: 1rem;
    /* the map keeps its slot while it is being fetched, so the card does not
       jump a couple of hundred pixels when it arrives */
    min-height: 40px;
  }

  :global(.world-map svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  :global(.world-map path),
  :global(.world-map circle) {
    fill: var(--land);
    stroke: var(--land-border);
    /* the map is drawn at 2000 units and displayed at a third of that, so a
       stroke in user units would all but disappear; this keeps every border a
       hairline whatever the card is wide */
    vector-effect: non-scaling-stroke;
    stroke-width: 0.5px;
  }

  :global(.world-map path.visited) {
    fill: var(--visited);
    stroke: var(--visited-border);
  }
</style>
