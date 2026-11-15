<script lang="ts">
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

  <p>wpm</p>
  <Slider bind:value={user.settings.wpm} min={5} max={50} discrete />

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
