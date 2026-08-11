<script lang="ts">
  /** Port of webapp/src/components/settings/Settings.jsx */
  import Dialog, { Content, Title } from '@smui/dialog';
  import IconButton from '@smui/icon-button';

  import AdvancedControls from '../controls/AdvancedControls.svelte';
  import DialectControls from '../controls/DialectControls.svelte';
  import KeybindingsControls from '../controls/KeybindingsControls.svelte';
  import SideControls from '../controls/SideControls.svelte';

  let {
    open = $bindable(false),
    mobileView = false,
  }: { open?: boolean; mobileView?: boolean } = $props();
</script>

<Dialog bind:open surface$style="elevation: 1" aria-labelledby="settings-title">
  <Title id="settings-title">
    <IconButton
      class="material-icons"
      aria-label="close"
      onclick={() => (open = false)}>close</IconButton
    >
  </Title>
  <Content>
    <div class="settingsContainer">
      {#if mobileView}
        <SideControls />
      {/if}
      <AdvancedControls />
      <DialectControls />
      <KeybindingsControls />
    </div>
  </Content>
</Dialog>

<style>
  .settingsContainer {
    width: 100%;
    box-sizing: border-box;
  }

  @media only screen and (min-width: 600px) {
    .settingsContainer {
      width: auto;
      min-width: 500px;
    }
  }
</style>
