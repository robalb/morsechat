<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';

  import { closeSnackbar, snacks } from './snackbar.svelte';
</script>

<!-- aria-live so a message that appears without any interaction of the user's
     is still announced; `polite` because none of these interrupt a task -->
<div class="snackbars" role="region" aria-live="polite" aria-label="notifications">
  {#each snacks as snack (snack.id)}
    <div
      class="snack {snack.variant}"
      animate:flip={{ duration: 200 }}
      in:fly={{ y: -20, duration: 200 }}
      out:fly={{ y: -20, duration: 150 }}
    >
      <span class="message">{snack.message}</span>
      <button
        class="dismiss material-icons"
        aria-label="dismiss"
        onclick={() => closeSnackbar(snack.id)}>close</button
      >
    </div>
  {/each}
</div>

<style>
  .snackbars {
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 1400;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    /* the container spans the corner but must not swallow clicks meant for the
       page underneath it; the bars themselves take theirs back */
    pointer-events: none;
  }

  .snack {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 288px;
    max-width: min(calc(100vw - 28px), 500px);
    box-sizing: border-box;
    padding: 6px 8px 6px 16px;
    border-radius: 4px;
    font-family: 'Roboto', 'Arial', sans-serif;
    font-size: 0.875rem;
    line-height: 1.43;
    letter-spacing: 0.01071em;
    color: #fff;
    /* MUI's elevation 6, which is what notistack gives a snackbar */
    box-shadow:
      0px 3px 5px -1px rgba(0, 0, 0, 0.2),
      0px 6px 10px 0px rgba(0, 0, 0, 0.14),
      0px 1px 18px 0px rgba(0, 0, 0, 0.12);
  }

  .message {
    flex: 1 1 auto;
    /* a `details` string from the server can be a paragraph of go validator
       output; wrap it rather than let it stretch the bar off screen */
    overflow-wrap: anywhere;
  }

  .default {
    background-color: #313131;
  }
  .error {
    background-color: #d32f2f;
  }
  .success {
    background-color: #43a047;
  }
  .warning {
    background-color: #ff9800;
  }
  .info {
    background-color: #2196f3;
  }

  .dismiss {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.7;
  }
  .dismiss:hover,
  .dismiss:focus-visible {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.12);
  }

  @media (prefers-reduced-motion: reduce) {
    .snack {
      transition: none;
    }
  }
</style>
