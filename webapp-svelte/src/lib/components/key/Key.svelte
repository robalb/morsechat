<script lang="ts">
  /**
   * Port of webapp/src/components/key/Key.jsx.
   *
   * Only the bar is ported. The KeyInternal of the react version is the iambic
   * keyer: a state machine over timers, the web audio oscillator and the global
   * keyboard listeners. That is the single largest piece of logic in the app
   * and it gets its own migration step; the two buttons it renders are here so
   * the row keeps its proportions.
   */
  import IconButton from '@smui/icon-button';
  import type { Snippet } from 'svelte';

  import { user } from '$lib/state/placeholder.svelte';

  let {
    class: className = '',
    leftButton,
    sheetBtHandler,
  }: {
    class?: string;
    leftButton?: Snippet;
    sheetBtHandler?: () => void;
  } = $props();

  let yambic = $derived(user.settings.key_mode === 'yambic');
</script>

<div class="key {className}">
  {#if leftButton}
    {@render leftButton()}
  {:else}
    <!-- an invisible left button; its purpose is to take the space in the flex
         layout when there are no real defined left buttons -->
    <IconButton
      class="material-icons settings_invisible"
      aria-label="disabled button">settings</IconButton
    >
  {/if}

  <button class="key_bt" oncontextmenu={(e) => e.preventDefault()}>
    {yambic ? 'dot' : 'key'}
  </button>
  {#if yambic}
    <button class="key_bt" oncontextmenu={(e) => e.preventDefault()}>dash</button>
  {/if}

  <IconButton
    class="material-icons"
    aria-label="morse table"
    onclick={sheetBtHandler}>library_books</IconButton
  >
</div>

<style>
  .key {
    background-color: var(--gray-80);
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px;
    box-sizing: border-box;
    gap: 1em;
  }
  .key_bt {
    width: 70%;
    height: 100%;
    background-color: var(--gray-95);
    border: 0;
    border-radius: 3px;
    cursor: pointer;
    box-shadow: var(--shadow-1);
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
    -webkit-user-select: none; /* Safari */
    user-select: none;
  }
  .key_bt:active {
    opacity: 0.3;
  }

  /* the class lands on the SMUI IconButton, which is a child component, so
   * scoped styles cannot reach it */
  .key :global(.settings_invisible) {
    opacity: 0;
    visibility: hidden;
  }
</style>
