<script lang="ts">
  /** Port of the DialectControls export of webapp/src/components/controls/controls.jsx */
  import Select, { Option } from '@smui/select';

  import { user } from '$lib/state/placeholder.svelte';
  import { dialects } from '$lib/utils/dialects';
  import './controls.css';

  let { class: className = '' }: { class?: string } = $props();
</script>

<div class="controls dialects {className}">
  <Select id="dialect-select" bind:value={user.settings.dialect} noLabel>
    {#each Object.keys(dialects) as name (name)}
      <Option value={name}>{dialects[name].name}</Option>
    {/each}
  </Select>
</div>
