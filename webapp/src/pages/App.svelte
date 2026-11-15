<script lang="ts">
  import { connectSocket } from '$lib/state/chat.svelte';
  import { startSidetone } from '$lib/sound/sidetone.svelte';

  import AppLayout from './AppLayout.svelte';

  let chatDomNode = $state<HTMLDivElement | null>(null);

  connectSocket(() => chatDomNode);
  startSidetone();
</script>

<AppLayout bind:chatDomNode />
