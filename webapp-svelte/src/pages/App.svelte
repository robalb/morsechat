<script lang="ts">
  /**
   * Equivalent of webapp/src/pages/App.jsx.
   *
   * The react version renders <AppLogic> next to <AppLayout>: a headless
   * component holding the websocket, the sound engine and the keyboard
   * handlers. The websocket half of it is `connectSocket()`, which is a
   * function rather than a component because effects do not need an element to
   * hang from — it belongs to this component, and lives as long as it does.
   * The sound engine and the keyer are still to come.
   */
  import { connectSocket } from '$lib/state/chat.svelte';

  import AppLayout from './AppLayout.svelte';

  /**
   * The dom node holding the chat. There is no need to keep the chat in the
   * application state or to query it, so the socket writes into this node
   * directly. It is threaded down to the components that need it, exactly like
   * the `chatDomNode` ref of the react app.
   */
  let chatDomNode = $state<HTMLDivElement | null>(null);

  connectSocket(() => chatDomNode);
</script>

<AppLayout bind:chatDomNode />
