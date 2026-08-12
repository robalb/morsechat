<script lang="ts">
  /**
   * Port of webapp/src/components/preview/Preview.jsx.
   *
   * The react version did three jobs here: translate the key buffer into morse,
   * run the submit countdown as a requestAnimationFrame animation, and dispatch
   * the send. All three are the keyer's now — they are the same message, and
   * they were only in the preview because that is where the redux state
   * happened to be readable from. What is left is the two things the preview
   * actually is: a line of text and a bar.
   */
  import IconButton from '@smui/icon-button';

  import { keyer } from '$lib/morse/keyer.svelte';

  let { class: className = '' }: { class?: string } = $props();
</script>

<div class="preview {className}">
  <!-- the submit countdown: full when the message goes out -->
  <div class="progress" style="width: {keyer.progress}%"> </div>
  <div class="text">
    <p data-mig="preview-text">{keyer.text}</p>
    <IconButton
      class="material-icons"
      aria-label="cancel message"
      onclick={() => keyer.clear()}
      disabled={keyer.empty}>delete_outline</IconButton
    >
  </div>
</div>

<style>
  .preview {
    background-color: var(--gray-80);
  }
  .preview .progress {
    height: 2px;
    width: 100%; /* the keyer's countdown writes this */
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
