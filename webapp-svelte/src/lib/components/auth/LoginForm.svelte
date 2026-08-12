<script lang="ts">
  /**
   * The login page of the auth dialog.
   *
   * Port of webapp/src/components/auth/loginForm.jsx: the same client side
   * validation, the same call, and the same two ways of reporting a failure —
   * wrong credentials mark both fields and raise a snackbar, anything else goes
   * to the snackbar with the code the server sent.
   */
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';
  import Textfield from '@smui/textfield';
  import HelperText from '@smui/textfield/helper-text';

  import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';
  import { login } from '$lib/state/session.svelte';
  import type { AuthPage } from '$lib/state/types';

  import './auth.css';

  let { page = $bindable('') }: { page?: AuthPage } = $props();

  let username = $state('');
  let password = $state('');

  /** true while the call is in flight, to keep the button from sending it twice */
  let pending = $state(false);

  let errors = $state({ username: '', password: '' });

  /** The checks of loginForm.jsx's clientValidate(), one per field. */
  function validate(): boolean {
    errors.username =
      username.length < 3 || username.length > 20
        ? 'invalid length'
        : /^[A-Za-z0-9-_]+$/.test(username)
          ? ''
          : 'invalid characters';
    errors.password =
      password.length < 8 || password.length > 255 ? 'too short' : '';
    return !errors.username && !errors.password;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!validate() || pending) return;

    pending = true;
    const res = await login({ username, password });
    pending = false;

    if (res.ok) {
      page = '';
      return;
    }
    if (res.error === 'invalid_credentials') {
      enqueueSnackbar('wrong username or password', {
        variant: 'error',
        preventDuplicate: true,
      });
      // a space, not a message: it marks the field without repeating what the
      // snackbar already says
      errors.username = ' ';
      errors.password = ' ';
    } else {
      enqueueSnackbar(`login failed. ${res.error} ${res.details ?? ''}`, {
        variant: 'error',
        preventDuplicate: true,
      });
    }
  }
</script>

<form class="auth-form" onsubmit={handleSubmit}>
  <div class="close">
    <IconButton
      class="material-icons"
      type="button"
      aria-label="close"
      onclick={() => (page = '')}>close</IconButton
    >
  </div>

  <h5 class="title">Login</h5>

  <div class="field">
    <Textfield
      bind:value={username}
      label="Username"
      type="text"
      invalid={!!errors.username}
      input$autocomplete="username"
      input$oninput={() => (errors.username = '')}
    >
      {#snippet helper()}
        {#if errors.username}
          <HelperText validationMsg persistent>{errors.username}</HelperText>
        {/if}
      {/snippet}
    </Textfield>
  </div>

  <div class="field">
    <Textfield
      bind:value={password}
      label="password"
      type="password"
      invalid={!!errors.password}
      input$autocomplete="current-password"
      input$oninput={() => (errors.password = '')}
    >
      {#snippet helper()}
        {#if errors.password}
          <HelperText validationMsg persistent>{errors.password}</HelperText>
        {/if}
      {/snippet}
    </Textfield>
  </div>

  <div class="actions">
    <Button variant="raised" color="secondary" type="submit" disabled={pending}>
      <Label>Login</Label>
    </Button>
    <span>Don't have an account?</span>
    <button class="link" type="button" onclick={() => (page = 'register')}>
      register
    </button>
  </div>
</form>
