<script lang="ts">
  /**
   * Port of the AdvancedControls export of
   * webapp/src/components/controls/controls.jsx.
   *
   * One deliberate difference: the react version sets the iambic paddle order
   * with a single switch flanked by a "left is dit" and a "right is dit" label,
   * which reads as a toggle for something that is really a choice between two
   * named options. Here it is a radio pair, the same shape as key mode above.
   *
   * A third mode, the adaptive straight key, is commented out below; see
   * `KeyMode` in lib/api/types.ts for why.
   */
  import FormField from '@smui/form-field';
  import Radio from '@smui/radio';
  import Slider from '@smui/slider';

  import type { KeyMode } from '$lib/api/types';
  import { user } from '$lib/state/session.svelte';
  import './controls.css';

  let { class: className = '' }: { class?: string } = $props();

  /** what each mode does, in the note under the radios */
  const modeDescriptions: Record<KeyMode, string> = {
    straight:
      'You type with one key. Press it for a dit, hold it longer for a dah.' +
      'The letters you type are detected only if you type exactly at the speed you set with the WMP (words per minute) slider',
    yambic:
      'You type with two paddles, one for dits and one for dahs. The speed at which the paddles' +
      'repeat can be set with the WPM (words per minute) slider',
  };

  let modeDescription = $derived(modeDescriptions[user.settings.key_mode]);
</script>

<div class="controls {className}">
  <h2>Advanced settings</h2>

  <p>submit delay</p>
  <Slider bind:value={user.settings.submit_delay} min={5} max={50} discrete />

  <p>key frequency</p>
  <Slider bind:value={user.settings.key_frequency} min={200} max={1000} discrete />

  <p>key mode</p>
  <div class="radio-row">
    <FormField>
      <Radio bind:group={user.settings.key_mode} value="straight" />
      {#snippet label()}straight (fixed wpm){/snippet}
    </FormField>
    <FormField>
      <Radio bind:group={user.settings.key_mode} value="yambic" />
      {#snippet label()}iambic A{/snippet}
    </FormField>
  </div>

  <p class="mode-description">{modeDescription}</p>

  <p style="margin-top: 1rem">iambic paddle order</p>
  <div class="radio-row">
    <FormField>
      <Radio bind:group={user.settings.left_is_dot} value={true} />
      {#snippet label()}left is dit{/snippet}
    </FormField>
    <FormField>
      <Radio bind:group={user.settings.left_is_dot} value={false} />
      {#snippet label()}right is dit{/snippet}
    </FormField>
  </div>
</div>

<style>
  .radio-row {
    flex-direction: row;
    align-items: center;
  }

  .mode-description {
    padding: 0.6rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-left: 3px solid rgba(255, 255, 255, 0.38);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.8rem;
    line-height: 1.5;
    background-color: rgba(255, 255, 255, 0.04);
  }
</style>
