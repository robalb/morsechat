<script lang="ts">
  import { tick } from 'svelte';

  import Dialog, { Actions, Content, Title } from '@smui/dialog';
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';

  import '../dialog/dialog.css';
  import { reportMessage } from '$lib/api/client';
  import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';
  import { portal } from '$lib/utils/portal';

  interface ReportData {
    signature: string;
    text: string;
    callsign: string;
    /** empty when the sender is anonymous */
    username: string;
  }

  let {
    open = $bindable(false),
    data = null,
    onViewProfile,
  }: {
    open?: boolean;
    data?: ReportData | null;
    onViewProfile?: () => void;
  } = $props();

  /** the body of the card, which takes the focus when the dialog opens */
  let body: HTMLDivElement | null = $state(null);

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

  let pending = $state(false);

  async function handleReport() {
    if (!data?.text || !data?.signature) {
      enqueueSnackbar('Failed to generate report', {
        variant: 'error',
        preventDuplicate: true,
      });
      return;
    }
    if (pending) return;
    pending = true;
    const res = await reportMessage({ text: data.text, signature: data.signature });
    pending = false;
    if (!res.ok) {
      enqueueSnackbar(`Report failed: ${res.error}`, {
        variant: 'error',
        preventDuplicate: true,
      });
      return;
    }
    enqueueSnackbar('Message reported', {
      variant: 'success',
      preventDuplicate: true,
    });
    open = false;
  }
</script>

{#if mounted}
  <!-- portaled to <body> as MUI's <Dialog> is: see lib/utils/portal.ts -->
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogOpened={() => body?.focus()}
    onSMUIDialogClosed={onClosed}
    class="mui-dialog"
    aria-labelledby="report-title"
  >
    <Title id="report-title">
      <IconButton
        class="material-icons"
        aria-label="close"
        onclick={() => (open = false)}>close</IconButton
      > Report Message
    </Title>
    <Content>
      <!-- takes the focus when the dialog opens, as MUI's paper does. See the
           same comment in User.svelte. -->
      <div bind:this={body} tabindex="-1">
        <p>
          This message was typed by
          {#if data?.username}
            <button class="link" type="button" onclick={() => onViewProfile?.()}
              >{data?.callsign ?? ''}</button
            >
          {:else}
            <span class="callsign">{data?.callsign ?? ''}</span>
            (anonymous user, not logged in)
          {/if}
        </p>
        <p>Do you believe this message is spam or contains inappropriate content?</p>
        <code>{data?.text ?? ''}</code>
      </div>
    </Content>
    <Actions>
      <!-- action={null}: SMUI would close the card on click, before the call
           answers; a failed report has to leave it open -->
      <Button
        variant="raised"
        class="button-error"
        disabled={pending}
        action={null}
        onclick={handleReport}
      >
        <Label>Report</Label>
      </Button>
      <Button variant="raised" onclick={() => (open = false)}>
        <Label>Close</Label>
      </Button>
    </Actions>
  </Dialog>
{/if}

<style>
  /* The body only holds the focus so that the close button does not; MUI's
   * paper, which is what takes it there, draws no ring either. */
  div:focus {
    outline: none;
  }
  /* MUI's DialogContent inherits the paper's white and leaves the browser's
   * 1em margin on the paragraph; mdc's content is a typography scale of its
   * own, which pulls it to 0.75rem and a lighter grey. */
  p {
    margin: 16px 0;
  }
  /* The message itself, as the browser renders <code>: monospace at the
   * default 13px. mdc would otherwise hand it the dialog's Roboto. */
  code {
    font-family: monospace;
    font-size: 13px;
  }
  /* the callsign is set the way the app writes callsigns elsewhere */
  .callsign {
    font-family: 'Courier New', Courier, monospace;
  }
  /* the sender's profile, on the callsign itself: the button that reads as a
   * link of auth.css, with the callsign's own typeface */
  .link {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-family: 'Courier New', Courier, monospace;
    letter-spacing: inherit;
    color: var(--mdc-theme-primary, #fafafa);
    text-decoration: underline;
    cursor: pointer;
  }
  .link:hover {
    text-decoration: none;
  }
</style>
