<script lang="ts">
  /**
   * Port of webapp/src/components/report/ReportMessage.jsx.
   *
   * The card shown when a chat message is clicked. Layout only: the react
   * version posts chat/report and reports the outcome through notistack, which
   * is api work and lands with the state migration — so Report only closes the
   * card here.
   */
  import { tick } from 'svelte';

  import Dialog, { Actions, Content, Title } from '@smui/dialog';
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';

  import '../dialog/dialog.css';
  import { portal } from '$lib/utils/portal';

  interface ReportData {
    signature: string;
    text: string;
  }

  let {
    open = $bindable(false),
    data = null,
  }: { open?: boolean; data?: ReportData | null } = $props();

  /** the body of the card, which takes the focus when the dialog opens */
  let body: HTMLDivElement | null = $state(null);

  /** The card exists only from the moment it opens until it has finished
   * closing, as the react one does; `shown` opens it a tick after it is
   * mounted. Both are explained in User.svelte. */
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
        <p>Do you believe this message is spam or contains inappropriate content?</p>
        <code>{data?.text ?? ''}</code>
      </div>
    </Content>
    <Actions>
      <!-- TODO: post chat/report. Lands with the state migration. -->
      <Button variant="raised" class="button-error" onclick={() => (open = false)}>
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
</style>
