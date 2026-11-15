<script lang="ts">
  import IconButton from '@smui/icon-button';

  import { keyer } from '$lib/morse/keyer.svelte';

  let { class: className = '' }: { class?: string } = $props();
</script>

<div class="preview {className}">
  <div class="progress" style="width: {keyer.progress}%"></div>
  <div class="text">
    <p data-harness="preview-text">{keyer.text}</p>
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
    width: 100%;
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
    flex: 1;
    min-width: 0;
  }
</style>
