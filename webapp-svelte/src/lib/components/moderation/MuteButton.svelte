<script lang="ts">
  /** Port of webapp/src/components/moderation/MuteButton.jsx */
  import Button, { Label } from '@smui/button';
  import { onDestroy, type Snippet } from 'svelte';

  import { moderationMute } from '$lib/api/client';
  import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';

  let {
    callsign = '',
    mute = true,
    variant = 'text',
    class: className = '',
    children,
  }: {
    callsign?: string;
    mute?: boolean;
    variant?: 'text' | 'raised' | 'unelevated' | 'outlined';
    class?: string;
    children: Snippet;
  } = $props();

  let controller: AbortController | undefined;
  let pending = $state(false);

  onDestroy(() => controller?.abort());

  async function handleClick() {
    if (pending) return;
    pending = true;
    controller = new AbortController();
    const res = await moderationMute({ callsign, mute }, controller.signal);
    pending = false;
    if (!res.ok && res.error === 'abort_error') return;
    const action = mute ? 'MUTE' : 'mute REVERT';
    enqueueSnackbar(res.ok ? `${action} successful` : `${action} failed`, {
      variant: res.ok ? 'success' : 'error',
      preventDuplicate: true,
    });
  }
</script>

<!-- action={null}: see BanButton.svelte -->
<Button
  {variant}
  class={className}
  disabled={pending}
  action={null}
  onclick={handleClick}
>
  <Label>{@render children()}</Label>
</Button>
