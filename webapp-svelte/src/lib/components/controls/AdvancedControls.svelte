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
   * "straight (adaptive)" is new and not in the react version: a straight key
   * read at the speed it is being keyed at rather than at the slider's, for
   * operators who do not hold a steady speed. See lib/morse/adaptive.ts.
   */
  import FormField from '@smui/form-field';
  import Radio from '@smui/radio';
  import Slider from '@smui/slider';

  import { user } from '$lib/state/session.svelte';
  import './controls.css';

  let { class: className = '' }: { class?: string } = $props();
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
      {#snippet label()}straight{/snippet}
    </FormField>
    <FormField>
      <Radio bind:group={user.settings.key_mode} value="straight_dynamic" />
      {#snippet label()}straight (adaptive){/snippet}
    </FormField>
    <FormField>
      <Radio bind:group={user.settings.key_mode} value="yambic" />
      {#snippet label()}iambic A{/snippet}
    </FormField>
  </div>

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
</style>
