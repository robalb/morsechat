<script lang="ts">
  /**
   * A table cell that copies its text on click. Merges the react
   * TableCellCopy.jsx and TableCellTooltip.jsx, whose only difference was the
   * truncation `maxLength` turns on.
   */
  import { onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

  import { Cell } from '@smui/data-table';
  import Tooltip, { Wrapper } from '@smui/tooltip';

  let {
    text = '',
    maxLength = 0,
  }: {
    text?: string;
    /** 0 prints the whole value; above it the rest goes in a tooltip */
    maxLength?: number;
  } = $props();

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => clearTimeout(timer));

  let truncated = $derived(maxLength > 0 && text.length > maxLength);
  let shown = $derived(truncated ? text.slice(0, maxLength) + '…' : text);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1000);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void copy();
    }
  }
</script>

<Cell
  class="copy-cell"
  tabindex={0}
  aria-label="{text}, click to copy"
  onclick={copy}
  {onkeydown}
>
  {#if truncated}
    <Wrapper>
      <span class="text">{shown}</span>
      <Tooltip>{text}</Tooltip>
    </Wrapper>
  {:else}
    <span class="text">{shown}</span>
  {/if}
  {#if copied}
    <span class="copied" transition:fade={{ duration: 150 }}>Copied!</span>
  {/if}
</Cell>

<style>
  :global(.mdc-data-table__cell.copy-cell) {
    position: relative;
    cursor: pointer;
    user-select: none;
  }
  .text {
    white-space: nowrap;
  }
  .copied {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 4px 12px;
    border-radius: 4px;
    background-color: var(--gray-95);
    color: var(--gray-50);
    font-size: 0.75rem;
    font-weight: 600;
    pointer-events: none;
    z-index: 1;
  }
</style>
