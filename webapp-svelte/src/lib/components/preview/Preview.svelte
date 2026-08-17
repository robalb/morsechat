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

  /**
   * What a preview reads. The chat passes the keyer, which has the required
   * ones as `$derived` getters; the decoder playground passes one of these per
   * algorithm, so that the same box can be stacked once per decoder
   * (lib/playground/engine.svelte.ts). Nothing here knows which it has. The
   * optional two are the playground's: nothing in the chat measures a speed.
   */
  interface PreviewSource {
    /** the message, read back */
    text: string;
    /** the submit countdown, 0 to 100 */
    progress: number;
    /** whether there is anything to throw away */
    empty: boolean;
    clear(): void;
    /** the speed it is being read at, shown only when `showWpm` and `dynamic` */
    wpm?: number;
    /** whether the speed is measured rather than set, and so worth showing */
    dynamic?: boolean;
  }

  let {
    class: className = '',
    source = keyer,
    showProgress = true,
    showClear = true,
    showWpm = false,
  }: {
    class?: string;
    source?: PreviewSource;
    /** a box that is not a message being sent has no countdown to draw */
    showProgress?: boolean;
    showClear?: boolean;
    /**
     * The measured speed. Only the decoder playground has one to show, where
     * the number is part of what is compared between the algorithms.
     */
    showWpm?: boolean;
  } = $props();
</script>

<div class="preview {className}">
  <!-- the submit countdown: full when the message goes out -->
  {#if showProgress}
    <div class="progress" style="width: {source.progress}%"> </div>
  {/if}
  <div class="text">
    <p data-mig="preview-text">{source.text}</p>
    <!-- the measured speed, where it is asked for and where there is one -->
    {#if showWpm && source.dynamic}
      <span class="wpm" data-mig="preview-wpm">{source.wpm} wpm</span>
    {/if}
    {#if showClear}
      <IconButton
        class="material-icons"
        aria-label="cancel message"
        onclick={() => source.clear()}
        disabled={source.empty}>delete_outline</IconButton
      >
    {/if}
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
  .preview .text p {
    /* the message takes the room, the readout takes what it needs */
    flex: 1;
    min-width: 0;
  }
  .preview .wpm {
    font-size: 0.75rem;
    opacity: 0.6;
    white-space: nowrap;
    margin-right: 0.5rem;
  }
</style>
