<script lang="ts">
  /**
   * The login page of the auth dialog.
   *
   * Layout port of webapp/src/components/auth/loginForm.jsx. The react version
   * dispatches loginUser() and reports failures through notistack; that is api
   * work and lands with the state migration, so submitting here runs the client
   * side validation and stops. The fields, the errors they raise and the switch
   * to the register page are all real.
   */
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';
  import Textfield from '@smui/textfield';
  import HelperText from '@smui/textfield/helper-text';

  import type { AuthPage } from '$lib/state/types';

  import './auth.css';

  let { page = $bindable('') }: { page?: AuthPage } = $props();

  let username = $state('');
  let password = $state('');

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

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!validate()) return;
    // TODO: dispatch the login call, then `page = ''` on success.
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
    <Button variant="raised" color="secondary" type="submit">
      <Label>Login</Label>
    </Button>
    <span>Don't have an account?</span>
    <button class="link" type="button" onclick={() => (page = 'register')}>
      register
    </button>
  </div>
</form>
