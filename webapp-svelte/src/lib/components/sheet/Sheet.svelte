<script lang="ts">
  /** Port of webapp/src/components/sheet/Sheet.jsx */
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';

  import { user } from '$lib/state/placeholder.svelte';
  import getDialect, { dialects } from '$lib/utils/dialects';

  let {
    class: className = '',
    closeBtHandler,
  }: { class?: string; closeBtHandler?: () => void } = $props();

  let dialect = $derived(getDialect(user.settings.dialect));

  /** change the current dialect to the next one in the dialects array */
  function rotateDialect() {
    const names = Object.keys(dialects);
    const next = names[(names.indexOf(user.settings.dialect) + 1) % names.length];
    user.settings.dialect = next;
  }
</script>

<div class="sheet {className}">
  <div class="bar">
    <IconButton
      class="material-icons"
      aria-label="close morse view"
      onclick={closeBtHandler}>close</IconButton
    >
    <Button onclick={rotateDialect}>
      <Label>{dialect.name}</Label>
    </Button>
  </div>
  <div class="list">
    {#each Object.entries(dialect.table) as [code, symbol] (code)}
      <p>{symbol} {code}</p>
    {/each}
  </div>
</div>

<style>
  .sheet {
    background-color: var(--gray-60);
    color: var(--gray-100);
    box-shadow: var(--shadow-1);
    display: flex;
    flex-direction: column;
  }
  /* react calls this div `controls` too, but its sheet.module.css hashes the
   * name; here controls.css is a plain global stylesheet, and the 1rem padding
   * and button margins meant for the settings panels were landing on this bar
   * and tripling its height. Same div, name that cannot collide. */
  .sheet .bar {
    background-color: var(--gray-80);
    flex-basis: 2em;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    /* not in the react css, where the dialect button has no height of its own
       and so stretches to fill the bar. mdc pins its buttons to 36px, which
       stretch cannot override, leaving it hanging 4px off the bottom. */
    align-items: center;
  }
  /* MUI's IconButton is 40px with 8px of padding; mdc's is 48/12. */
  .sheet .bar :global(.mdc-icon-button) {
    width: 40px;
    height: 40px;
    padding: 8px;
  }
  .sheet .list {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    font-family: monospace;
    font-weight: bold;
    padding: 1em;
    overflow: auto;
    text-transform: uppercase;
  }
  .sheet p {
    margin-right: 1rem;
  }
</style>
