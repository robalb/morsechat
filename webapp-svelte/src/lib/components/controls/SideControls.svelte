<script lang="ts">
  /**
   * Port of the SideControls export of
   * webapp/src/components/controls/controls.jsx.
   *
   * The react version wraps every slider in a memo to avoid re-rendering the
   * whole panel on each settings change, and commits the value to the api on
   * `onChangeCommitted`. Svelte updates only what changed, so the memo has no
   * equivalent; the api call is state work and comes later.
   *
   * The wpm slider is hidden in the adaptive straight mode, which is the
   * default: there the sending speed is measured from the keying itself
   * (lib/morse/window.ts) and the slider would do nothing the operator can see.
   * The setting is kept, not reset, so switching back restores the old speed.
   */
  import Slider from '@smui/slider';
  import Switch from '@smui/switch';
  import type { Snippet } from 'svelte';

  import { user } from '$lib/state/session.svelte';
  import './controls.css';

  let {
    class: className = '',
    settingsButton,
  }: { class?: string; settingsButton?: Snippet } = $props();
</script>

<div class="controls {className}">
  <h2>Controls</h2>

  {#if user.settings.key_mode !== 'straight_dynamic'}
    <p>wpm</p>
    <Slider bind:value={user.settings.wpm} min={5} max={50} discrete />
  {/if}

  <p>receiver volume</p>
  <Slider bind:value={user.settings.volume_receiver} min={0} max={100} discrete />

  <p>key volume</p>
  <Slider bind:value={user.settings.volume_key} min={0} max={100} discrete />

  <div class="control-row">
    <p>show letters</p>
    <Switch bind:checked={user.settings.show_readable} color="secondary" icons={false} />
  </div>

  {#if settingsButton}{@render settingsButton()}{/if}
</div>
