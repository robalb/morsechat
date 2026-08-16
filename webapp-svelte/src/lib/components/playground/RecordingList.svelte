<script lang="ts">
  /**
   * The corpus, in two groups.
   *
   * The split is the workflow made visible: the recordings at the top exist
   * only in this tab and are one refresh from being gone, and the ones below
   * are in source and are safe. The "copy" button belongs to the top group
   * alone, because moving a recording from the first group to the second is a
   * paste into lib/playground/recordings.ts and nothing else.
   */
  import Button from '@smui/button';
  import IconButton from '@smui/icon-button';

  import { summarise, type Playground } from '$lib/playground/engine.svelte';
  import type { Recording } from '$lib/playground/types';

  let { playground }: { playground: Playground } = $props();
</script>

<aside class="recordings">
  <div class="top">
    <Button variant="raised" onclick={() => playground.record()}>record new</Button>
    <Button
      variant="outlined"
      class="button-small"
      disabled={playground.fresh.length === 0}
      onclick={() => void playground.copyFresh()}>copy new recordings</Button
    >
    {#if playground.copyStatus}
      <p class="status">{playground.copyStatus}</p>
    {/if}
    {#if playground.exported}
      <!-- the clipboard was refused: the json has to be selectable by hand -->
      <textarea
        readonly
        rows="6"
        value={playground.exported}
        onfocus={(e) => e.currentTarget.select()}
      ></textarea>
    {/if}
  </div>

  {#snippet row(recording: Recording, index: number, isNew: boolean)}
    <li class:selected={playground.selected?.id === recording.id}>
      <button class="play" onclick={() => playground.play(recording)}>
        <span class="index">{index + 1}</span>
        <span class="body">
          <span class="decoded">{summarise(recording) || '(silence)'}</span>
          <span class="meta">{recording.wpm} wpm · {recording.buffer.length} elements</span>
        </span>
      </button>
      {#if isNew}
        <IconButton
          class="material-icons discard"
          aria-label="discard recording"
          onclick={() => playground.discard(recording.id)}>close</IconButton
        >
        <!-- the ground truth, and the only thing on this page a machine cannot
             fill in -->
        <input
          class="expected"
          placeholder="what you meant to key"
          value={recording.expected}
          oninput={(e) => playground.setExpected(recording.id, e.currentTarget.value)}
        />
      {:else if recording.expected}
        <p class="expected-saved">{recording.expected}</p>
      {/if}
    </li>
  {/snippet}

  <h3>new <span class="count">{playground.fresh.length}</span></h3>
  {#if playground.fresh.length === 0}
    <p class="empty">nothing keyed yet this session.</p>
  {:else}
    <ul>
      {#each playground.fresh as recording, i (recording.id)}
        {@render row(recording, i, true)}
      {/each}
    </ul>
  {/if}

  <h3>saved <span class="count">{playground.saved.length}</span></h3>
  {#if playground.saved.length === 0}
    <p class="empty">
      none in source yet — key some, then paste them into
      <code>lib/playground/recordings.ts</code>.
    </p>
  {:else}
    <ul>
      {#each playground.saved as recording, i (recording.id)}
        {@render row(recording, i, false)}
      {/each}
    </ul>
  {/if}
</aside>

<style>
  .recordings {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    padding: 1rem 0.75rem;
    background-color: var(--gray-70);
    box-sizing: border-box;
    height: 100%;
  }
  .top {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .status {
    margin: 0;
    font-size: 0.75rem;
    opacity: 0.6;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: monospace;
    font-size: 0.7rem;
    background-color: var(--gray-60);
    color: var(--gray-100);
    border: 1px solid var(--gray-90);
    border-radius: 3px;
  }
  h3 {
    margin: 0.75rem 0 0;
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.6;
  }
  .count {
    opacity: 0.6;
  }
  .empty {
    margin: 0.25rem 0;
    font-size: 0.75rem;
    opacity: 0.5;
  }
  ul {
    list-style: none;
    margin: 0.25rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  li {
    background-color: var(--gray-80);
    border-radius: 3px;
    padding: 0.15rem 0.15rem 0.15rem 0;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
  }
  li.selected {
    outline: 1px solid var(--blue);
  }
  .play {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    padding: 0.4rem 0.5rem;
    cursor: pointer;
    border-radius: 3px;
  }
  .play:hover {
    background-color: var(--gray-90);
  }
  .index {
    font-size: 0.75rem;
    opacity: 0.5;
    min-width: 1.2em;
    text-align: right;
  }
  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .decoded {
    font-size: 0.85rem;
    /* a decode can be a long run of unreadable morse, and the row must not
       stretch the column to fit it */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: 0.7rem;
    opacity: 0.45;
  }
  .expected,
  .expected-saved {
    grid-column: 1 / -1;
    margin: 0 0.5rem 0.35rem;
    font-size: 0.75rem;
  }
  .expected {
    background-color: var(--gray-70);
    color: var(--gray-100);
    border: 1px solid var(--gray-90);
    border-radius: 3px;
    padding: 0.25rem 0.35rem;
  }
  .expected-saved {
    opacity: 0.7;
    font-style: italic;
  }
  .recordings :global(.discard) {
    --mdc-icon-button-size: 32px;
    --mdc-icon-size: 18px;
    opacity: 0.5;
  }
</style>
