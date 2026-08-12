<script lang="ts">
  /**
   * Port of webapp/src/components/key/Key.jsx.
   *
   * The react KeyInternal was the largest piece of logic in the app: two redux
   * state flags for the paddles, three effects to run the iambic timer, the
   * oscillator, and window listeners re-bound on every settings change with a
   * comment apologising for it. None of that is here — the keyer is a class now
   * (lib/morse/keyer.svelte.ts) and this component is what it always should
   * have been: a bar with buttons that say when they are pressed.
   *
   * Pointer events replace the react version's four handlers (touchstart,
   * touchend, mousedown, mouseup). They cover a mouse, a finger and a stylus at
   * once, and capturing the pointer means a press that ends with the finger
   * somewhere else still ends: dragging off the key was one way to leave it
   * down.
   */
  import IconButton from '@smui/icon-button';
  import type { Snippet } from 'svelte';

  import { keyer } from '$lib/morse/keyer.svelte';
  import { user } from '$lib/state/session.svelte';

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

  /**
   * The keyboard, for as long as the key is on screen. Reading the mode makes a
   * change of it re-run this, and the cleanup lets go of whatever was held: the
   * paddle you were holding when the mode changed under you never comes up
   * otherwise.
   */
  $effect(() => {
    user.settings.key_mode;
    return keyer.listen();
  });

  function press(e: PointerEvent, isLeft: boolean) {
    // anti-ch3at measure, as in the react version
    if (!e.isTrusted) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture?.(e.pointerId);
    keyer.press(isLeft);
  }

  function release(e: PointerEvent, isLeft: boolean) {
    if (!e.isTrusted) return;
    e.preventDefault();
    keyer.release(isLeft);
  }
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

  <button
    class="key_bt"
    data-mig="key-left"
    onpointerdown={(e) => press(e, true)}
    onpointerup={(e) => release(e, true)}
    onpointercancel={(e) => release(e, true)}
    oncontextmenu={(e) => e.preventDefault()}
  >
    {yambic ? 'dot' : 'key'}
  </button>
  {#if yambic}
    <button
      class="key_bt"
      data-mig="key-right"
      onpointerdown={(e) => press(e, false)}
      onpointerup={(e) => release(e, false)}
      onpointercancel={(e) => release(e, false)}
      oncontextmenu={(e) => e.preventDefault()}>dash</button
    >
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
    /* a press must not also scroll the page or select the label */
    touch-action: none;
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
