<script lang="ts">
  /**
   * Port of webapp/src/components/preview/Preview.jsx.
   *
   * The react version does three things here: translate the key buffer into
   * morse, run the submit countdown as a requestAnimationFrame animation, and
   * dispatch the send. Only the box they live in is ported; the progress bar
   * keeps its element so the 2px strip above the text stays in the layout.
   */
  import IconButton from '@smui/icon-button';

  import { chat } from '$lib/state/placeholder.svelte';

  let { class: className = '' }: { class?: string } = $props();

  let emptyBuffer = $derived(chat.messageBuffer.length === 0);
</script>

<div class="preview {className}">
  <!-- the countdown animation writes this width directly on the node, which is
       why the react version also ends up at 0% right after mounting -->
  <div class="progress" style="width: 0%"> </div>
  <div class="text">
    <p></p>
    <IconButton
      class="material-icons"
      aria-label="cancel message"
      disabled={emptyBuffer}>delete_outline</IconButton
    >
  </div>
</div>

<style>
  .preview {
    background-color: var(--gray-80);
  }
  .preview .progress {
    height: 2px;
    width: 100%; /* change this with an animation */
    background-color: var(--gray-95);
    opacity: 0.8;
  }
  .preview .text {
    white-space: pre-wrap;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: 1rem;
    height: 100%;
  }
</style>
