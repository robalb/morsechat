<script lang="ts">
  /**
   * Port of webapp/src/components/auth/Auth.jsx.
   *
   * The dialog picks its content from `page`; an empty string closes it. Only
   * the menu page is ported, because it is the one that is layout. The login,
   * register and verify forms are api work and land with the state migration —
   * until then they show a placeholder so the routing is still exercised.
   */
  import Dialog, { Content } from '@smui/dialog';

  import LoginForm from './LoginForm.svelte';
  import MainIndexForm from './MainIndexForm.svelte';
  import RegisterForm from './RegisterForm.svelte';
  import type { AuthPage } from '$lib/state/types';

  let {
    page = $bindable(''),
    fullScreen = false,
  }: { page?: AuthPage; fullScreen?: boolean } = $props();

  /** `page` is the single source of truth; the dialog's own open state follows
   * it, and the scrim / escape route back is the closed event below. */
  let open = $derived(page.length > 0);
</script>

<Dialog
  {open}
  onSMUIDialogClosed={() => (page = '')}
  fullscreen={fullScreen}
  class="auth-dialog"
  aria-label="authentication"
>
  <Content>
    <div class="auth">
      {#if page === 'menu'}
        <MainIndexForm bind:page />
      {:else if page === 'login'}
        <LoginForm bind:page />
      {:else if page === 'register'}
        <RegisterForm bind:page />
      {:else if page}
        <!-- TODO: port verificationForm -->
        <p>The {page} form is not ported yet.</p>
      {/if}
    </div>
  </Content>
</Dialog>

<style>
  .auth {
    margin: 1rem;
  }
</style>
