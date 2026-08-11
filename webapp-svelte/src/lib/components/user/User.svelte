<script lang="ts">
  /**
   * Port of webapp/src/components/user/User.jsx.
   *
   * The card shown when a callsign in the online list is clicked. Layout only:
   * the moderator actions are rendered with the same look and the same
   * conditions as the react ones, but the ban dialog and the mute api call they
   * open belong to the state migration. They are behind `ismoderator ||
   * isadmin`, which the placeholder state leaves false, exactly as the react
   * dialog is for an ordinary visitor.
   */
  import { tick } from 'svelte';

  import Dialog, { Actions, Content, Title } from '@smui/dialog';
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';

  import '../dialog/dialog.css';
  import { portal } from '$lib/utils/portal';
  import { user as currentUser } from '$lib/state/placeholder.svelte';
  import type { OnlineUser } from '$lib/state/types';

  let {
    open = $bindable(false),
    user = null,
  }: { open?: boolean; user?: OnlineUser | null } = $props();

  let isModerator = $derived(currentUser.ismoderator || currentUser.isadmin);

  /** the body of the card, which takes the focus when the dialog opens */
  let body: HTMLDivElement | null = $state(null);

  /** MUI mounts a dialog when it opens and unmounts it once it has finished
   * closing; mdc's lives in the dom from the start. Following MUI here is not
   * only faithful — it keeps a closed popup out of <body>, where the migration
   * harness would otherwise see an extra child of its own and lose track of
   * every structural path on the page.
   *
   * Two flags rather than one: <Dialog> reads its `open` prop from an effect
   * that runs before the one creating the mdc foundation, so a dialog that is
   * mounted already open never opens. It is mounted closed and opened on the
   * next tick instead. */
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

  /** mdc has finished the closing animation: drop the markup, as MUI does, and
   * report the close to the parent — the scrim and escape routes out of the
   * dialog only tell us through this event. */
  function onClosed() {
    open = false;
    mounted = false;
  }
</script>

{#if mounted}
  <!-- use={[portal]}: the react dialog is portaled to <body>; this one is
       written inside the online list, which the layout paints as its own
       stacking context. See lib/utils/portal.ts. -->
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogOpened={() => body?.focus()}
    onSMUIDialogClosed={onClosed}
    class="mui-dialog"
    aria-labelledby="user-title"
  >
    <Title id="user-title">
      <IconButton
        class="material-icons"
        aria-label="close"
        onclick={() => (open = false)}>close</IconButton
      > User Information
    </Title>
    <Content>
      <!-- MUI hands the opening dialog's focus to the paper itself; mdc hands it
           to the first focusable element, which here is the close button — and a
           close button that opens focused comes up wearing the ripple's focus
           disc, which the react popup never shows. Taking the focus here once the
           dialog has opened keeps the two the same, and tab still reaches the
           button from here. (mdc's own data-mdc-dialog-initial-focus is read when
           the dialog mounts, before this markup exists, so it does not help.) -->
      <div class="user" bind:this={body} tabindex="-1">
        <p><strong>Callsign:</strong> {user?.callsign ?? ''}</p>
        {#if user?.is_anonymous}
          <p>(Anonymous user, not logged in)</p>
        {:else}
          <p><strong>Username:</strong> {user?.username ?? ''}</p>
        {/if}
      </div>
    </Content>
    <Actions>
      <!-- TODO: BanButton opens the ban dialog, MuteButton posts
           moderation/mute. Both land with the state migration. -->
      {#if isModerator && !user?.is_anonymous}
        <Button variant="raised" class="button-error">
          <Label>Ban</Label>
        </Button>
      {/if}
      {#if isModerator}
        <Button variant="raised">
          <Label>Mute</Label>
        </Button>
      {/if}
    </Actions>
  </Dialog>
{/if}

<style>
  /* user.module.css */
  .user {
    margin: 1rem;
  }
  /* It only holds the focus so that the close button does not; MUI's paper,
   * which is what takes it there, draws no ring either. */
  .user:focus {
    outline: none;
  }
  /* MUI's DialogContent inherits the paper's white and leaves the browser's
   * 1em margins on the paragraphs; mdc's content is a typography scale of its
   * own, which pulls them to 0.75rem and a lighter grey. */
  .user p {
    margin: 16px 0;
  }
</style>
