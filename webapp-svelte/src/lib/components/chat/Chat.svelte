<script lang="ts">
  /**
   * Port of webapp/src/components/chat/Chat.jsx.
   *
   * The chat body has four mutually exclusive shapes: loading, load error,
   * connection error, and the chat itself. All four are ported, driven by the
   * placeholder state, because each one has to hold the same box.
   *
   * The messages are not rendered by this component: the socket writes them
   * into `chatDomNode` directly, which is why it is bound out to App. The
   * placeholder markup below has the structure that code produces, so the
   * three-span rule of the stylesheet has something to style.
   */
  import Button, { Label } from '@smui/button';

  import { api, chat, placeholderMessages, user } from '$lib/state/placeholder.svelte';

  let {
    class: className = '',
    chatDomNode = $bindable(null),
  }: { class?: string; chatDomNode?: HTMLDivElement | null } = $props();

  let randomChannel = $derived(
    chat.channels[Math.floor(Math.random() * chat.channels.length)].name,
  );
</script>

<div class="chat {className}">
  {#if api.loading && api.error.length > 0}
    <div class="loading">
      <h2>Error: {api.error}</h2>
      <Button variant="outlined" color="secondary">
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
    <div
      bind:this={chatDomNode}
      class="chatContent"
      class:showText={user.settings.show_readable}
    >
      {#each placeholderMessages as msg, i (i)}
        <p><span>{msg.callsign}</span><span>{msg.morse}</span><span>{msg.text}</span></p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .chat {
    background-color: var(--gray-70);
    box-shadow: var(--shadow-1);
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
