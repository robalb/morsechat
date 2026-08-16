<script lang="ts">
  /**
   * The decoder playground: one key, every algorithm, side by side.
   *
   * A page rather than a mode of the chat, and a separate vite entry
   * (src/pages/playground.html), because it is a workbench and not a feature:
   * it talks to no server, joins no channel and sends nothing. It exists to
   * collect hand-keyed messages and to watch several decoders read the same one
   * at the same instant, which is the only way to see the thing that actually
   * matters — not whether a reading is right, but whether it keeps changing
   * after the operator has read it.
   *
   * Two rules of the page follow from that and are worth stating:
   *
   *   - the boxes are never cleared by a message *ending*. A comparison you
   *     have to catch mid-flight is no comparison; what is on screen stays
   *     there until something new is started.
   *   - live keying and replay go through the same path, so a box cannot tell
   *     which it is showing. See lib/playground/engine.svelte.ts.
   */
  import Button from '@smui/button';
  import FormField from '@smui/form-field';
  import Slider from '@smui/slider';
  import Switch from '@smui/switch';

  import Key from '$lib/components/key/Key.svelte';
  import { playground } from '$lib/playground/engine.svelte';

  import DecoderBox from './DecoderBox.svelte';
  import RecordingList from './RecordingList.svelte';
</script>

<div class="playground">
  <RecordingList {playground} />

  <main>
    <header>
      <div class="buttons">
        <Button
          variant="outlined"
          class="button-small"
          disabled={!playground.canReplay}
          onclick={() => playground.restart()}>restart</Button
        >
        <Button
          variant="outlined"
          class="button-small"
          disabled={playground.empty}
          onclick={() => playground.clear()}>clear</Button
        >
        <Button
          variant="raised"
          class="button-small"
          disabled={!playground.canSave}
          onclick={() => playground.save()}>save recording</Button
        >
        <span class="mode" data-mode={playground.mode}>{playground.mode}</span>
      </div>

      <div class="settings">
        <div class="wpm">
          <span>wpm</span>
          <!-- the playground's own, not the account's: a test run must not
               rewrite the settings the user chats with -->
          <Slider bind:value={playground.wpm} min={5} max={50} discrete />
          <span class="value">{playground.wpm}</span>
        </div>
        <FormField>
          <Switch bind:checked={playground.showReadable} color="secondary" icons={false} />
          {#snippet label()}show letters{/snippet}
        </FormField>
      </div>
    </header>

    <div class="boxes">
      {#each playground.slots as slot (slot.id)}
        <DecoderBox {slot} />
      {/each}
    </div>

    <Key class="key" keyer={playground} straight />
  </main>
</div>

<style>
  .playground {
    display: grid;
    /* the list is a list of short lines; the boxes are the experiment */
    grid-template-columns: minmax(220px, 20%) 1fr;
    height: 100%;
    overflow: hidden;
  }
  main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--gray-70);
  }
  .buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .mode {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.5;
  }
  /* the one thing worth catching out of the corner of an eye: whether what is
     on screen is being keyed or being replayed */
  .mode[data-mode='recording'] {
    color: var(--pastel-red);
    opacity: 1;
  }
  .mode[data-mode='playing'] {
    color: var(--blue);
    opacity: 1;
  }
  .settings {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .wpm {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }
  .wpm .value {
    min-width: 2ch;
    opacity: 0.6;
  }
  .wpm :global(.mdc-slider) {
    width: 160px;
    margin: 0 0.5rem;
  }
  .boxes {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem 1rem;
  }
  /* the key is a child component, so a scoped rule cannot reach it */
  .playground :global(.key) {
    height: 4rem;
    flex: none;
  }
</style>
