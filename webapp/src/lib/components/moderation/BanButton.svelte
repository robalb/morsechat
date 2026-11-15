<script lang="ts">
  import Button, { Label } from '@smui/button';
  import type { Snippet } from 'svelte';

  import { openBanDialog } from './banDialog.svelte';

  let {
    username = '',
    session = '',
    revert = false,
    variant = 'text',
    class: className = '',
    disabled = false,
    children,
  }: {
    username?: string;
    session?: string;
    revert?: boolean;
    variant?: 'text' | 'raised' | 'unelevated' | 'outlined';
    class?: string;
    disabled?: boolean;
    children: Snippet;
  } = $props();
</script>

<!-- action={null}: SMUI marks every button inside a dialog's <Actions> as its
     close action, and opening the ban popup must not close the card it was
     opened from -->
<Button
  {variant}
  {disabled}
  class={className}
  action={null}
  onclick={() => openBanDialog({ username, session, revert })}
>
  <Label>{@render children()}</Label>
</Button>
