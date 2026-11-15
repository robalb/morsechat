<script lang="ts">
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
  let leftLabel = $derived(user.settings.left_is_dot ? 'dit' : 'dah');
  let rightLabel = $derived(user.settings.left_is_dot ? 'dah' : 'dit');

  $effect(() => {
    user.settings.key_mode;
    JSON.stringify(user.settings.keybinds);
    return keyer.listen();
  });

  function press(e: PointerEvent, isLeft: boolean) {
    if (!e.isTrusted) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
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
    <IconButton class="material-icons settings_invisible" aria-label="disabled button"
      >settings</IconButton
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
    {yambic ? leftLabel : 'key'}
  </button>
  {#if yambic}
    <button
      class="key_bt"
      data-mig="key-right"
      onpointerdown={(e) => press(e, false)}
      onpointerup={(e) => release(e, false)}
      onpointercancel={(e) => release(e, false)}
      oncontextmenu={(e) => e.preventDefault()}>{rightLabel}</button
    >
  {/if}

  {#if sheetBtHandler}
    <IconButton class="material-icons" aria-label="morse table" onclick={sheetBtHandler}
      >library_books</IconButton
    >
  {:else}
    <IconButton class="material-icons settings_invisible" aria-label="disabled button"
      >library_books</IconButton
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
    -webkit-user-select: none;
    user-select: none;
    touch-action: none;
  }
  .key_bt:active {
    opacity: 0.3;
  }
  .key :global(.settings_invisible) {
    opacity: 0;
    visibility: hidden;
  }
</style>
