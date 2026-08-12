<script lang="ts">
  /**
   * The online list as a popup, for the sizes where the side column is gone.
   *
   * Below the tablet breakpoint the header's online users button is the only
   * way to the list, and this is what it opens. This has no counterpart in
   * webapp/src — it is the one place where the svelte layout does more than the
   * react one.
   *
   * It does not reuse <Online />: that component is written for the side
   * column, where the status pill, the rule and the list are stacked inside one
   * scrolling box. A popup wants the card shape the other dialogs have — a
   * header that stays put, a rule spanning the full width of the surface, and a
   * content area that is the only thing that scrolls — so the two pieces worth
   * sharing (the status pill and a row per user) are restated here against that
   * layout.
   */
  import { tick } from 'svelte';

  import Dialog, { Content, Title } from '@smui/dialog';
  import IconButton from '@smui/icon-button';

  import User from '../user/User.svelte';
  import { chat } from '$lib/state/placeholder.svelte';
  import type { OnlineUser } from '$lib/state/types';
  import '../dialog/dialog.css';
  import { portal } from '$lib/utils/portal';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  /** The card exists only from the moment it opens until it has finished
   * closing, as the react popups do; `shown` opens it a tick after it is
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

  /** the user whose card is open, and the card's own open state */
  let dialogOpen = $state(false);
  let selectedUser = $state<OnlineUser | null>(null);

  function openUser(userObj: OnlineUser) {
    selectedUser = userObj;
    dialogOpen = true;
  }

  /**
   * The status pill replays its resize animation whenever the connection
   * changes, by alternating between two identical keyframes. Toggling a class
   * is the only way to restart a css animation, hence the pair.
   */
  let animationClass = $state(true);
  let firstRender = true;
  $effect(() => {
    // read it so the effect re-runs when the connection flips
    chat.connected;
    if (firstRender) {
      firstRender = false;
    } else {
      animationClass = !animationClass;
    }
  });
</script>

{#if mounted}
  <!-- portaled to <body>, as the other two cards are: see lib/utils/portal.ts.
       Here it also keeps the popup clear of the header, which is a scroll
       container (`overflow: hidden`) painted under the grid. -->
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogClosed={onClosed}
    class="mui-dialog online-dialog"
    aria-labelledby="online-title"
  >
    <Title id="online-title">
      <IconButton
        class="material-icons"
        aria-label="close"
        onclick={() => (open = false)}>close</IconButton
      > Online Users
      <p
        class="status"
        class:a_1={animationClass}
        class:a_2={!animationClass}
        class:ws_online={chat.connected}
      >
        {chat.connectionStatus}
      </p>
    </Title>
    <Content>
      <!-- no tabindex="-1" body to catch the focus, as the user and report
           cards have: this card's content is a list of buttons, so mdc's own
           choice — the first focusable element — is the right one here. -->
      <div class="online">
        {#each Object.entries(chat.onlineUsers) as [id, userObj] (id)}
          <div>
            <div class="left">
              <button onclick={() => openUser(userObj)}>
                <p>{userObj.callsign}{id === chat.myID ? ' (you)' : ''}</p>
              </button>
              {#if userObj.typing}
                <div class="typing">
                  <div></div>
                  <div></div>
                </div>
              {/if}
            </div>
            <IconButton
              class="material-icons"
              aria-label="{userObj.allowSound
                ? 'disable'
                : 'enable'} sound for user {userObj.callsign}"
              onclick={() => (userObj.allowSound = !userObj.allowSound)}
            >
              {userObj.allowSound ? 'volume_up' : 'volume_off'}
            </IconButton>
          </div>
        {/each}
      </div>
    </Content>
  </Dialog>
  <User bind:open={dialogOpen} user={selectedUser} />
{/if}

<style>
  /* The header. dialog.css already gives the title MUI's box and sits the close
   * button and the heading on one line; the status pill joins them as a third
   * inline item, pushed to the far end so the rule below separates a complete
   * header from the list. */
  :global(.mdc-dialog.mui-dialog.online-dialog .mdc-dialog__title) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  /* the pill is last on the line and the heading is a bare text node between
   * the two flex items, so the margin has to push from the pill's side */
  .status {
    margin: 0 0 0 auto;
  }

  /* The rule under the header, and the scrolling. mdc gives the content
   * `overflow-y: auto` and caps the surface, so the list scrolls on its own
   * once the card is at its full height; what it does not draw is the rule —
   * it paints those two 1px borders only while the content is actually
   * scrolling. Declared outright here, as Settings.svelte does with the
   * dividers of its own card, so the header is always closed off by a line
   * that runs the full width of the surface. */
  :global(.mdc-dialog.mui-dialog.online-dialog .mdc-dialog__content) {
    padding: 0.5rem 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
  /* mdc measures the surface against the viewport; without a floor a card
   * holding two callsigns is a sliver, and the list wants a readable width. */
  :global(.mdc-dialog.mui-dialog.online-dialog .mdc-dialog__surface) {
    min-width: min(17rem, calc(100vw - 2 * var(--dialog-gutter)));
  }

  /* One row per user, as in the side column. */
  .online > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 2rem;
  }
  .online .left {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .online .left button {
    all: unset;
    cursor: pointer;
  }
  .online .left button:hover {
    text-decoration: underline;
  }
  .online .left button:focus-visible p {
    outline: 1px solid white;
  }

  .online .typing {
    margin-left: 1rem;
  }

  .online .typing div {
    width: 13px;
    height: 13px;
    background-color: var(--gray-95);
    display: inline-block;
    animation: sk-bouncedelay 1.2s infinite ease-in-out both;
  }

  .online .typing div:first-child {
    animation-delay: -0.2s;
  }

  @keyframes sk-bouncedelay {
    0%,
    80%,
    100% {
      transform: scale(0);
    }
    40% {
      transform: scale(0.4);
    }
  }

  .status {
    display: inline;
    color: black;
    padding: 2px 5px 2px 5px;
    border-radius: 5px;
    font-size: 0.8rem;
    background: #ff9966; /* fallback for old browsers */
    background: var(--orange-gradient);
  }
  .status.ws_online {
    background: #0cebeb;
    background: var(--blue-gradient);
  }
  .status.a_1 {
    animation: resize 1s;
  }
  .status.a_2 {
    animation: resize2 1s;
  }
  @keyframes resize {
    0% {
      padding: 2px 5px 2px 5px;
    }
    20% {
      padding: 2px 15px 2px 15px;
    }
    100% {
      padding: 2px 5px 2px 5px;
    }
  }
  @keyframes resize2 {
    0% {
      padding: 2px 5px 2px 5px;
    }
    20% {
      padding: 2px 15px 2px 15px;
    }
    100% {
      padding: 2px 5px 2px 5px;
    }
  }
</style>
