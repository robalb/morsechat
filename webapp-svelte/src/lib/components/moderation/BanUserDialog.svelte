<script lang="ts">
  /** Port of webapp/src/components/moderation/BanUserDialog.jsx */
  import { tick } from 'svelte';

  import Dialog, { Actions, Content, Title } from '@smui/dialog';
  import Button, { Label } from '@smui/button';
  import Textfield from '@smui/textfield';

  import '../dialog/dialog.css';
  import { moderationBan } from '$lib/api/client';
  import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';
  import { portal } from '$lib/utils/portal';

  import { banDialog, closeBanDialog } from './banDialog.svelte';

  let notes = $state('');
  let pending = $state(false);
  let controller: AbortController | undefined;

  let mounted = $state(false);
  let shown = $state(false);

  $effect(() => {
    if (banDialog.open) {
      notes = '';
      mounted = true;
      tick().then(() => {
        if (banDialog.open) {
          shown = true;
        }
      });
    } else {
      shown = false;
    }
  });

  function onClosed() {
    closeBanDialog();
    mounted = false;
    controller?.abort();
  }

  async function confirm() {
    if (!notes.trim() || pending) return;
    pending = true;
    controller = new AbortController();
    const res = await moderationBan(
      {
        baduser_username: banDialog.username,
        baduser_session: banDialog.session,
        notes,
        is_revert: banDialog.revert,
      },
      controller.signal,
    );
    pending = false;
    if (!res.ok && res.error === 'abort_error') return;
    const action = banDialog.revert ? 'ban REVERT' : 'ban';
    enqueueSnackbar(res.ok ? `${action} successful` : `${action} failed`, {
      variant: res.ok ? 'success' : 'error',
      preventDuplicate: true,
    });
    closeBanDialog();
  }

  let title = $derived(banDialog.revert ? 'Revert Ban' : 'Ban User');
  let actionLabel = $derived(banDialog.revert ? 'Revert Ban' : 'Ban');
  let displayUser = $derived(
    banDialog.username ? `user "${banDialog.username}"` : 'this anonymous user',
  );
  let description = $derived(
    banDialog.revert
      ? `Are you sure you want to REVERT the ban on ${displayUser}?`
      : `Are you sure you want to BAN ${displayUser}?`,
  );
</script>

{#if mounted}
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogClosed={onClosed}
    class="mui-dialog ban-dialog"
    aria-labelledby="ban-title"
  >
    <Title id="ban-title">{title}</Title>
    <Content>
      <p>{description}</p>
      {#if banDialog.session}
        <p class="device">User device: {banDialog.session}</p>
      {/if}
      <Textfield
        textarea
        bind:value={notes}
        label="Moderator Notes"
        input$rows={3}
        input$required
        input$placeholder="Write your reason or notes here..."
      />
    </Content>
    <Actions>
      <Button action={null} onclick={closeBanDialog}>
        <Label>Cancel</Label>
      </Button>
      <!-- action={null}: the popup closes when the call answers, not when the
           button is pressed -->
      <Button
        variant="raised"
        class={banDialog.revert ? '' : 'button-error'}
        disabled={!notes.trim() || pending}
        action={null}
        onclick={confirm}
      >
        <Label>{actionLabel}</Label>
      </Button>
    </Actions>
  </Dialog>
{/if}

<style>
  p {
    margin: 16px 0;
  }
  .device {
    font-family: monospace;
    overflow-wrap: anywhere;
  }
  /* opens over the moderation dashboard, which is itself a dialog */
  :global(.mdc-dialog.ban-dialog) {
    z-index: 8;
  }
  :global(.mdc-dialog.ban-dialog .mdc-text-field) {
    width: 100%;
  }
  :global(.mdc-dialog.ban-dialog .mdc-dialog__content) {
    padding-bottom: 8px;
  }
</style>
