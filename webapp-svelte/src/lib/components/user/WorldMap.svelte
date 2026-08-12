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

  /**
   * The size, in the 2000x857 units the map is drawn in, under which a country
   * is a speck: the card shows the map about a third of that wide, so 10 units
   * is the three-odd pixels it takes to see something is there at all. Any
   * bigger and the Lesser Antilles, which are five units apart, merge into one
   * blob.
   */
  const MIN_SIZE = 10;
  /** an island nation of a few hundred metres would otherwise become a
   * continent — Nauru is a single unit across */
  const MAX_SCALE = 8;

  /**
   * Blow up the countries that are too small to see.
   *
   * A country is enlarged only when *none* of its paths reaches MIN_SIZE, so
   * the rule catches both the single small island (Malta, Barbados) and the
   * archipelago whose islands are scattered but each tiny (the Maldives, the
   * Marshall Islands), while leaving alone any country that has one landmass
   * big enough to see — the specks around Indonesia or Alaska stay specks.
   *
   * Every path of a country is scaled by the same factor, about its own
   * centre, so the group keeps its shape and its position on the map. getBBox
   * reports the geometry before the element's own transform, which makes this
   * safe to run again on the same nodes.
   */
  $effect(() => {
    if (!container || !markup) return;

    const byCode = new Map<string, SVGGraphicsElement[]>();
    for (const path of container.querySelectorAll<SVGGraphicsElement>('[data-c]')) {
      const code = path.getAttribute('data-c') ?? '';
      const group = byCode.get(code);
      if (group) group.push(path);
      else byCode.set(code, [path]);
    }

    for (const paths of byCode.values()) {
      const boxes = paths.map((path) => path.getBBox());
      const largest = Math.max(
        ...boxes.map((box) => Math.max(box.width, box.height)),
      );
      if (largest === 0 || largest >= MIN_SIZE) continue;

      const scale = Math.min(MIN_SIZE / largest, MAX_SCALE);
      paths.forEach((path, index) => {
        const box = boxes[index];
        const cx = (box.x + box.width / 2).toFixed(2);
        const cy = (box.y + box.height / 2).toFixed(2);
        path.setAttribute(
          'transform',
          `translate(${cx} ${cy}) scale(${scale.toFixed(2)}) translate(-${cx} -${cy})`,
        );
      });
    }
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
    --visited: #888888;
    /* a dark border rather than a lighter one: the light blue is the brightest
     * thing on the card, so a highlight around it made neighbouring visited
     * countries bleed into one shape instead of separating them */
    --visited-border: white;
    margin-top: 1rem;
    /* The card that holds the map is padded for text, which on a phone leaves
       the map a third of the screen narrower than it could be. --map-bleed is
       how much of that padding it may take back on each side; the card sets it,
       because the card is what knows its own padding. */
    margin-inline: calc(-1 * var(--map-bleed, 0px));
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
