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

  import { keyer as chatKeyer } from '$lib/morse/keyer.svelte';
  import { user } from '$lib/state/session.svelte';

  /**
   * What this bar drives. The chat drives the keyer; the decoder playground
   * drives its own engine (lib/playground/engine.svelte.ts), which is the same
   * three methods and none of the sending. The component cannot tell.
   */
  interface KeySource {
    press(isLeft?: boolean): void;
    release(isLeft?: boolean): void;
    /** binds the keyboard, and returns the function that unbinds it */
    listen(): () => void;
  }

  let {
    class: className = '',
    leftButton,
    sheetBtHandler,
    keyer = chatKeyer,
    straight = false,
  }: {
    class?: string;
    leftButton?: Snippet;
    sheetBtHandler?: () => void;
    keyer?: KeySource;
    /** forces the single key, whatever the account's key_mode says */
    straight?: boolean;
  } = $props();

  let yambic = $derived(!straight && user.settings.key_mode === 'yambic');

  /**
   * The keyboard, for as long as the key is on screen. Reading the mode and the
   * bindings makes a change of either re-run this, and the cleanup lets go of
   * whatever was held: the paddle you were holding when the mode changed under
   * you never comes up otherwise, and neither does the key whose binding was
   * taken away while it was down — its keyup matches nothing now.
   *
   * The handler itself reads the bindings on every event, so this is only about
   * the held key; nothing has to be re-registered for an edit to take effect.
   */
  $effect(() => {
    user.settings.key_mode;
    // the keys of every action, read deeply enough for a change inside one of
    // the lists to count as a change
    JSON.stringify(user.settings.keybinds);
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

  {#if sheetBtHandler}
    <IconButton
      class="material-icons"
      aria-label="morse table"
      onclick={sheetBtHandler}>library_books</IconButton
    >
  {:else}
    <!-- as on the left: the space is part of the layout even when the button
         is not there -->
    <IconButton
      class="material-icons settings_invisible"
      aria-label="disabled button">library_books</IconButton
    >
  {/if}
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
