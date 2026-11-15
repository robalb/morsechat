<script lang="ts">
  import { tick } from 'svelte';

  import Dialog, { Content, Title } from '@smui/dialog';
  import IconButton from '@smui/icon-button';

  import { portal } from '$lib/utils/portal';

  import ModerationMenu from './ModerationMenu.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let mounted = $state(false);
  let shown = $state(false);

  $effect(() => {
    if (open) {
      mounted = true;
      tick().then(() => {
        if (open) {
          shown = true;
        }
      });
    } else {
      shown = false;
    }
  });

  function onClosed() {
    open = false;
    mounted = false;
  }
</script>

{#if mounted}
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogClosed={onClosed}
    class="moderation-dialog"
    aria-labelledby="moderation-title"
  >
    <Title id="moderation-title">
      Moderation Menu
      <IconButton
        class="material-icons close"
        aria-label="close"
        onclick={() => (open = false)}>close</IconButton
      >
    </Title>
    <Content>
      <ModerationMenu />
    </Content>
  </Dialog>
{/if}

<style>
  /* MUI's fullScreen. mdc has no such variant, and base.css caps every surface
   * at 560px, hence the widths below. */
  :global(.mdc-dialog.moderation-dialog .mdc-dialog__surface) {
    width: 100vw;
    max-width: 100vw;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
    background-image: none;
    box-shadow: none;
  }
  :global(.mdc-dialog.moderation-dialog .mdc-dialog__container) {
    width: 100%;
    height: 100%;
  }

  :global(.mdc-dialog.moderation-dialog .mdc-dialog__title) {
    position: relative;
    margin: 0;
    padding: 16px 24px;
    color: var(--gray-105);
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.6;
    letter-spacing: 0.0075em;
    white-space: normal;
    overflow: visible;
  }
  :global(.mdc-dialog.moderation-dialog .mdc-dialog__title::before) {
    display: none;
  }
  :global(.mdc-dialog.moderation-dialog .mdc-dialog__title .close) {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 40px;
    height: 40px;
    padding: 8px;
    border-radius: 50%;
    color: var(--gray-95);
  }
  :global(
    .mdc-dialog.moderation-dialog
      .mdc-dialog__title
      .close:not(:focus-visible)
      .mdc-icon-button__ripple::before
  ) {
    opacity: 0;
  }

  :global(.mdc-dialog.moderation-dialog .mdc-dialog__content) {
    padding: 0;
    color: var(--gray-105);
    font-family: 'Roboto', 'Arial';
    line-height: normal;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
</style>
