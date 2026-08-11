<script lang="ts">
  /** Port of the DialectControls export of webapp/src/components/controls/controls.jsx */
  import Select, { Option } from '@smui/select';

  import { user } from '$lib/state/placeholder.svelte';
  import { dialects } from '$lib/utils/dialects';
  import './controls.css';

  let { class: className = '' }: { class?: string } = $props();
</script>

<div class="controls dialects {className}">
  <!-- MUI's <Select /> defaults to the outlined variant, SMUI's to standard,
       which is why this had a bare underline instead of a box. -->
  <Select
    id="dialect-select"
    class="dialect-select"
    variant="outlined"
    bind:value={user.settings.dialect}
    noLabel
  >
    {#each Object.keys(dialects) as name (name)}
      <Option value={name}>{dialects[name].name}</Option>
    {/each}
  </Select>
</div>

<style>
  /* mdc sizes a select to a fixed 200px; MUI's fills its container. The colour
     is MUI's notched-outline default. */
  .dialects :global(.dialect-select) {
    width: 100%;
    --mdc-outlined-select-outline-color: rgba(255, 255, 255, 0.23);
  }
  /* mdc inks the value at 87% of on-surface; MUI's is the plain body white.
     The extra .mdc-select outweighs mdc's own :not(.mdc-select--disabled)
     selector, which ties on specificity. */
  .dialects :global(.mdc-select.dialect-select .mdc-select__selected-text) {
    color: var(--gray-105);
  }
</style>
