<script lang="ts">
  /**
   * Equivalent of webapp/src/pages/App.jsx.
   *
   * The react version renders <AppLogic> next to <AppLayout>: a headless
   * component holding the websocket, the sound engine and the keyboard
   * handlers. None of that is ported yet, so only the layout is mounted.
   */
  import AppLayout from './AppLayout.svelte';

  /**
   * The dom node holding the chat. There is no need to keep the chat in the
   * application state or to query it, so the socket writes into this node
   * directly. It is threaded down to the components that need it, exactly like
   * the `chatDomNode` ref of the react app.
   */
  let chatDomNode = $state<HTMLDivElement | null>(null);
</script>

<AppLayout bind:chatDomNode />
