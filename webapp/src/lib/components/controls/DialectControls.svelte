<script lang="ts">
  import Select, { Option } from '@smui/select';

  import { user } from '$lib/state/session.svelte';
  import { dialects } from '$lib/utils/dialects';
  import './controls.css';

  let { class: className = '' }: { class?: string } = $props();

  /* The width of the panel, which is the width of the select in it, and so the
   * width MUI gives the open menu. It has to be measured: the menu is fixed
   * (see menu$fixed below) so that the settings dialog cannot clip it, and a
   * fixed element's `width: 100%` — which is what SMUI asks mdc for — resolves
   * against the viewport rather than against the select. */
  let selectWidth = $state(0);
</script>

<div class="controls dialects {className}">
  <!-- MUI's <Select /> defaults to the outlined variant, SMUI's to standard,
       which is why this had a bare underline instead of a box.
       menu$fixed: mdc renders the menu inside .mdc-dialog__content, whose
       `overflow: auto` cuts off whatever falls outside the settings popup —
       and mdc aligns the selected option over the anchor, so the options above
       it land there. Fixed positioning takes the menu out of that box. -->

  <div class="dialect-select-slot" bind:clientWidth={selectWidth}>
    <Select
      id="dialect-select"
      class="dialect-select"
      variant="outlined"
      bind:value={user.settings.dialect}
      noLabel
      menu$fixed={true}
      menu$style="width: {selectWidth}px"
    >
      {#each Object.keys(dialects) as name (name)}
        <Option value={name}>{dialects[name].name}</Option>
      {/each}
    </Select>
  </div>
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
