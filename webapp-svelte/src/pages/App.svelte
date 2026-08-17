<script lang="ts">
  /**
   * Equivalent of webapp/src/pages/App.jsx.
   *
   * The react version renders <AppLogic> next to <AppLayout>: a headless
   * component holding the websocket, the sound engine and the keyboard
   * handlers. Here they are functions rather than components, because effects
   * do not need an element to hang from — they belong to this component, and
   * live as long as it does. The keyboard is <Key />'s, which is what goes
   * away when there is no key on screen.
   */
  import { connectSocket } from '$lib/state/chat.svelte';
  import { startSidetone } from '$lib/sound/sidetone.svelte';

  import AppLayout from './AppLayout.svelte';

  /**
   * The dom node holding the chat. There is no need to keep the chat in the
   * application state or to query it, so the socket writes into this node
   * directly. It is threaded down to the components that need it, exactly like
   * the `chatDomNode` ref of the react app.
   */
  let chatDomNode = $state<HTMLDivElement | null>(null);

  connectSocket(() => chatDomNode);
  startSidetone();
</script>

<AppLayout bind:chatDomNode />
