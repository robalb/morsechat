<script lang="ts">
  /**
   * Port of webapp/src/components/auth/Auth.jsx.
   *
   * The dialog picks its content from `page`; an empty string closes it. As in
   * the react version, none of the forms are shown until the session request
   * has answered — logging in on top of a session that is not open yet would
   * race it — so while it is in flight the dialog holds <MainDataLoading />
   * instead, which is also where a failed one is reported. The verify page is
   * the one that is still a placeholder.
   */
  import Dialog, { Content } from '@smui/dialog';

  import LoginForm from './LoginForm.svelte';
  import MainDataLoading from './MainDataLoading.svelte';
  import MainIndexForm from './MainIndexForm.svelte';
  import RegisterForm from './RegisterForm.svelte';
  import { api } from '$lib/state/session.svelte';
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
      {#if api.loading}
        <MainDataLoading />
      {:else if page === 'menu'}
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
