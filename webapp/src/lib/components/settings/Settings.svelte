<script lang="ts">
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

<Dialog
  bind:open
  class="settings-dialog"
  aria-labelledby="settings-title"
>
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
  /* The dialog chrome. These have to be :global() — they land on the markup
   * @smui/dialog owns — and they are all scoped under .settings-dialog, the
   * class handed to <Dialog>, so no other dialog picks them up. The extra
   * .mdc-dialog in each selector is there to outweigh mdc's own
   * `.mdc-dialog .mdc-dialog__title`, which vite may emit after this block.
   *
   * mdc's title is typographic: no top padding, a 40px ::before spacer for the
   * baseline, and `on-surface` at 87%. MUI's DialogTitle is a plain 16px/24px
   * box that inherits the paper's white, and `dividers` on DialogContent draws
   * the rule under it. */
  :global(.mdc-dialog.settings-dialog .mdc-dialog__title) {
    margin: 0;
    padding: 16px 24px;
    color: var(--gray-105);
  }
  :global(.mdc-dialog.settings-dialog .mdc-dialog__title::before) {
    display: none;
  }
  /* MUI's IconButton is 40px with a 8px padding and a round ripple; mdc's is
   * 48px and square. */
  :global(.mdc-dialog.settings-dialog .mdc-dialog__title .mdc-icon-button) {
    width: 40px;
    height: 40px;
    padding: 8px;
    border-radius: 50%;
    color: #fafafa;
  }
  :global(
    .mdc-dialog.settings-dialog
      .mdc-dialog__title
      .mdc-icon-button:not(:focus-visible)
      .mdc-icon-button__ripple::before
  ) {
    opacity: 0;
  }

  :global(.mdc-dialog.settings-dialog .mdc-dialog__content) {
    padding: 16px 24px;
    color: var(--gray-105);
    font-family: 'Roboto', 'Arial';
    line-height: normal;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

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

  @media only screen and (max-width: 599px) {
    /* :global(.mdc-dialog.settings-dialog .mdc-dialog__surface) { */
    /*   width: calc(100vw - 16px); */
    /*   max-width: calc(100vw - 16px); */
    /* } */
    /* :global(.mdc-dialog.settings-dialog .mdc-dialog__title) { */
    /*   padding: 8px 12px; */
    /* } */
    /* :global(.mdc-dialog.settings-dialog .mdc-dialog__content) { */
    /*   padding: 12px; */
    /* } */
    /* :global(.mdc-dialog.settings-dialog .controls) { */
    /*   padding: 0.5rem 0; */
    /* } */
  }
</style>
