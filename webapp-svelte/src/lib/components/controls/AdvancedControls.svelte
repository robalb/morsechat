<script lang="ts">
  /** Port of the AdvancedControls export of webapp/src/components/controls/controls.jsx */
  import FormField from '@smui/form-field';
  import Radio from '@smui/radio';
  import Slider from '@smui/slider';
  import Switch from '@smui/switch';

  import { user } from '$lib/state/placeholder.svelte';
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
      <Radio bind:group={user.settings.key_mode} value="yambic" />
      {#snippet label()}iambic A{/snippet}
    </FormField>
  </div>

  <p style="margin-top: 1rem">iambic paddle order</p>
  <div>
    <p>left is dit</p>
    <Switch
      checked={!user.settings.left_is_dot}
      onSMUISwitchChange={(e: CustomEvent<{ selected: boolean }>) =>
        (user.settings.left_is_dot = !e.detail.selected)}
      color="primary"
    />
    <p>right is dit</p>
  </div>
</div>

<style>
  .radio-row {
    flex-direction: row;
  }
</style>
