<script lang="ts">
  /**
   * Port of webapp/src/components/chat/Chat.jsx.
   *
   * The chat body has four mutually exclusive shapes: loading, load error,
   * connection error, and the chat itself.
   *
   * The messages are not rendered by this component and never will be: the
   * socket writes them into `chatDomNode` directly, which is why it is bound
   * out to App. Everything below `.chatContent` in the stylesheet is therefore
   * `:global` — see the note there — and the log starts empty, the connection
   * status line being the first thing written into it.
   */
  import Button, { Label } from '@smui/button';

  import ReportMessage from '../report/ReportMessage.svelte';
  import User from '../user/User.svelte';
  import { chat } from '$lib/state/chat.svelte';
  import { api, retrySession, user } from '$lib/state/session.svelte';
  import type { OnlineUser } from '$lib/state/types';

  let {
    class: className = '',
    chatDomNode = $bindable(null),
  }: { class?: string; chatDomNode?: HTMLDivElement | null } = $props();

  /** the message whose report card is open, and the card's own open state */
  let dialogOpen = $state(false);
  let selectedMessage = $state<{
    signature: string;
    text: string;
    callsign: string;
    /** empty when the sender is anonymous */
    username: string;
  } | null>(null);

  /** the sender whose profile card is open, and that card's own open state */
  let profileOpen = $state(false);
  let profileUser = $state<OnlineUser | null>(null);

  /**
   * A click anywhere in the log, read back off the dom: the messages are not
   * this component's markup, so the paragraph that was hit is the only handle
   * on which message it was. Only the ones carrying a signature are
   * reportable — the system messages the socket writes have none.
   */
  function handleChatClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'P' && target.tagName !== 'SPAN') {
      return;
    }
    const p = target.tagName === 'P' ? target : (target.parentNode as HTMLElement);
    const signature = p.getAttribute('data-signature');
    if (!signature) {
      return;
    }
    selectedMessage = {
      signature,
      text: p.innerText,
      callsign: p.getAttribute('data-callsign') ?? '',
      username: p.getAttribute('data-username') ?? '',
    };
    dialogOpen = true;
  }

  /**
   * Opens the profile card for the sender of the message the report card is
   * showing. Built from what the message carries rather than from the online
   * list: the sender may have left the channel since.
   */
  function viewProfile() {
    if (!selectedMessage) return;
    const { callsign, username } = selectedMessage;
    profileUser = {
      callsign,
      username,
      is_anonymous: !username,
      typing: false,
      allowSound: false,
    };
    profileOpen = true;
  }

  /** guards the retry button against a second click while a call is in flight */
  let retrying = $state(false);

  async function retry() {
    if (retrying) return;
    retrying = true;
    await retrySession();
    retrying = false;
  }

  let randomChannel = $derived(
    chat.channels[Math.floor(Math.random() * chat.channels.length)].name,
  );
</script>

<div class="chat {className}">
  {#if api.loading && api.error.length > 0}
    <div class="loading">
      <h2>Error: {api.error}</h2>
      <Button variant="outlined" onclick={retry} disabled={retrying}>
        <Label>retry</Label>
      </Button>
    </div>
  {:else if api.loading}
    <div class="loading">
      <h2>loading</h2>
    </div>
  {:else if chat.connectionStatus === 'connection denied'}
    <div class="info">
      <h2>Connection denied</h2>
      <p>This channel is for logged users only</p>
    </div>
  {:else if chat.connectionStatus === 'connection busy'}
    <div class="info">
      <h2>Channel busy</h2>
      <p>There are too many users connected to this channel</p>
      <p>
        Come back later, or <a href="/?channel={randomChannel}"
          >join another channel</a
        >
      </p>
    </div>
  {:else if chat.connectionStatus === 'connection failed'}
    <div class="info">
      <h2>Connection failed</h2>
      <p>The connection to this channel failed</p>
    </div>
  {:else}
    <!-- The log is a plain box that happens to hold clickable paragraphs; the
         click is delegated here because the paragraphs are written into it by
         the socket, not rendered by this component. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      bind:this={chatDomNode}
      onclick={handleChatClick}
      class="chatContent"
      class:showText={user.settings.show_readable}
    ></div>
  {/if}
</div>
<ReportMessage
  bind:open={dialogOpen}
  data={selectedMessage}
  onViewProfile={viewProfile}
/>
<User bind:open={profileOpen} user={profileUser} />

<style>
  .chat {
    background-color: var(--gray-70);
    box-shadow: var(--shadow-1);
  }

  /* The retry button. SMUI colours an outlined button with the theme primary,
   * and `color="secondary"` — the react version's is `color="error"` — is the
   * cyan of the palette; on the near-black loading panel both read as a link
   * rather than as the one thing to press. White, with a matching outline. */
  .loading :global(.mdc-button) {
    color: var(--gray-105);
    --mdc-outlined-button-outline-color: rgba(255, 255, 255, 0.5);
  }

  .loading,
  .info {
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .chatContent {
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;
    padding: 1rem;
    box-sizing: border-box;
  }
  /* Everything below .chatContent has to be :global. The messages are written
   * into this node by the socket code, so they never get svelte's scoping
   * class and a scoped selector would not reach them. */
  .chatContent :global(p) {
    white-space: pre-wrap;
    color: var(--gray-95);
  }
  .chatContent :global(p[data-signature]:hover) {
    text-decoration: underline;
    text-decoration-color: white;
    cursor: pointer;
  }

  .chatContent :global(span:nth-child(1)) {
    margin-right: 1rem;
    color: var(--blue-2);
  }

  .chatContent :global(span:nth-child(2)) {
    display: inline;
    color: white;
  }
  .chatContent :global(span:nth-child(3)) {
    display: none;
    color: white;
  }
  .chatContent.showText :global(span:nth-child(2)) {
    display: none;
  }
  .chatContent.showText :global(span:nth-child(3)) {
    display: inline;
  }
</style>
