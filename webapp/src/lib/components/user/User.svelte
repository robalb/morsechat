<script lang="ts">
  import { tick } from 'svelte';

  import Dialog, { Actions, Content, Title } from '@smui/dialog';
  import IconButton from '@smui/icon-button';

  import '../dialog/dialog.css';
  import BanButton from '../moderation/BanButton.svelte';
  import MuteButton from '../moderation/MuteButton.svelte';
  import WorldMap from './WorldMap.svelte';
  import { portal } from '$lib/utils/portal';
  import { userStats } from '$lib/api/client';
  import { user as currentUser } from '$lib/state/session.svelte';
  import type { OnlineUser, UserProfile } from '$lib/state/types';

  let {
    open = $bindable(false),
    user = null,
  }: { open?: boolean; user?: OnlineUser | null } = $props();

  let isModerator = $derived(currentUser.ismoderator || currentUser.isadmin);

  let profile = $state<UserProfile | null>(null);

  /**
   * Whether that request is still in flight.
   *
   * The card is laid out for a profile from the moment it opens, not from the
   * moment the numbers arrive: the popup is otherwise a narrow two-line box for
   * as long as the request takes, and then jumps to 720px with a map in it. So
   * the profile block is rendered while loading too — empty, but taking the
   * room it will need — and a card that opens already the right size only fills
   * itself in.
   */
  let loading = $state(false);

  $effect(() => {
    const callsign = user && !user.is_anonymous ? user.callsign : null;
    if (!open || !callsign) {
      profile = null;
      loading = false;
      return;
    }
    const controller = new AbortController();
    // the abort resolves the promise rather than rejecting it, and it resolves
    // a microtask after the run that replaced this one has set its own flag
    let cancelled = false;
    loading = true;
    userStats(callsign, controller.signal).then((res) => {
      if (cancelled) return;
      loading = false;
      if (res.ok) profile = res.data;
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  });

  /** "14 June 2023", the way the popup writes a joined date */
  function formatJoined(date: string): string {
    return new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

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
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogOpened={() => body?.focus()}
    onSMUIDialogClosed={onClosed}
    class="mui-dialog {profile || loading ? 'profile-dialog' : ''}"
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
      <div class="user" bind:this={body} tabindex="-1">
        {#if user?.is_anonymous}
          <p><strong>Callsign:</strong> {user?.callsign ?? ''}</p>
          <p>(Anonymous user, not logged in)</p>
        {:else}
          <p class="callsign">{user?.callsign ?? ''}</p>
          <!-- the stubbed endpoint sends no username; `||` so an empty one
               falls back to the name the online list already carries -->
          <p class="username">{profile?.username || user?.username || ''}</p>
          {#if profile || loading}
            <p class="joined">{profile ? `Joined ${formatJoined(profile.joined)}` : ''}</p>
            <p class="met">
              {#if profile}
                Met {profile.met_users.toLocaleString()} users, from
                {profile.met_countries.length.toLocaleString()} countries around the world.
              {/if}
            </p>
            <!-- mounted empty: the map reserves its own height from its aspect
                 ratio, and starting the 140kB fetch now rather than when the
                 numbers land is the same drawing on screen sooner -->
            <WorldMap countries={profile?.met_countries ?? []} />
          {/if}
        {/if}
      </div>
    </Content>
    <Actions>
      {#if isModerator && !user?.is_anonymous}
        <BanButton
          variant="raised"
          class="button-error"
          username={user?.username ?? ''}
        >
          Ban
        </BanButton>
      {/if}
      {#if isModerator}
        <MuteButton variant="raised" callsign={user?.callsign ?? ''}>
          Mute
        </MuteButton>
      {/if}
    </Actions>
  </Dialog>
{/if}

<style>
  /* user.module.css */
  .user {
    margin: 1rem;
    /* What the map may claim back on each side: this margin plus the 24px
     * dialog.css leaves on .mdc-dialog__content. The full amount, so the map
     * runs to the edge of the popup — on a phone that is 80px of a 384px card,
     * a fifth of the drawing. Everything else in the card keeps the padding. */
    --map-bleed: 40px;
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

  /* The profile card. The callsign is the identity here, so it is set the way
   * the app writes callsigns elsewhere — monospace, a step up in size — and
   * the three lines under it are the supporting detail. */
  .user .callsign {
    margin: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 1.75rem;
    letter-spacing: 0.06em;
  }
  .user .username {
    margin: 0.15rem 0 0;
    color: var(--gray-95);
  }
  /* Both hold one line's worth of height while they are still empty: a
   * paragraph with no text in it draws no line box at all, and the card would
   * grow by the two of them the moment the numbers arrive. */
  .user .joined {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
    color: var(--gray-95);
    min-height: 1lh;
  }
  .user .met {
    margin: 1.75rem 0 2.75rem 0;
    min-height: 1lh;
  }
</style>
