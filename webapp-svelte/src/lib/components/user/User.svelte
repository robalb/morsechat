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
  import ActivityGraph from './ActivityGraph.svelte';
  import WorldMap from './WorldMap.svelte';
  import { portal } from '$lib/utils/portal';
  import {
    placeholderProfiles,
    user as currentUser,
  } from '$lib/state/placeholder.svelte';
  import type { OnlineUser, UserProfile } from '$lib/state/types';

  let {
    open = $bindable(false),
    user = null,
  }: { open?: boolean; user?: OnlineUser | null } = $props();

  let isModerator = $derived(currentUser.ismoderator || currentUser.isadmin);

  /**
   * The statistics of a registered user. New in the svelte app; the react card
   * showed a callsign and a username and stopped there.
   *
   * Read from the placeholder map for now — when the state migration lands
   * this is where the profile request goes, keyed by the same callsign. An
   * anonymous user has none, and keeps the small card the react one had.
   */
  let profile = $derived<UserProfile | null>(
    user && !user.is_anonymous ? (placeholderProfiles[user.callsign] ?? null) : null,
  );

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
  <!-- use={[portal]}: the react dialog is portaled to <body>; this one is
       written inside the online list, which the layout paints as its own
       stacking context. See lib/utils/portal.ts. -->
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogOpened={() => body?.focus()}
    onSMUIDialogClosed={onClosed}
    class="mui-dialog {profile ? 'profile-dialog' : ''}"
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
        {#if user?.is_anonymous}
          <!-- the anonymous card is the react one, unchanged: a callsign and a
               line saying there is nothing else to show -->
          <p><strong>Callsign:</strong> {user?.callsign ?? ''}</p>
          <p>(Anonymous user, not logged in)</p>
        {:else}
          <p class="callsign">{user?.callsign ?? ''}</p>
          <p class="username">{profile?.username ?? user?.username ?? ''}</p>
          {#if profile}
            <p class="joined">Joined {formatJoined(profile.joined)}</p>
            <p class="met">
              Met {profile.met_users.toLocaleString()} users, from
              {profile.met_countries.length.toLocaleString()} countries in the world.
            </p>
            <WorldMap countries={profile.met_countries} />
            <ActivityGraph activity={profile.activity} />
          {/if}
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
  .user .joined {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
    color: var(--gray-95);
  }
  .user .met {
    margin: 1.75rem 0 1.75rem 0;
  }
</style>
