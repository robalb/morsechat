<script lang="ts">
  /**
   * The register page of the auth dialog.
   *
   * Port of webapp/src/components/auth/registerForm.jsx: the same client side
   * validation, the same call, and the same split between failures that belong
   * to a field (a taken username) and failures that belong to the snackbar.
   *
   * The call sign editor at the top is the layout of
   * webapp/src/components/callSignEditor/, inlined. The react version drives it
   * from a schema array, renders a module component per entry and re-runs an
   * abortable validation promise on every keystroke; none of that survives the
   * port, because the shape it produces is fixed: a country, two digits, three
   * letters, joined into one string.
   */
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';
  import Select, { Option } from '@smui/select';
  import Textfield from '@smui/textfield';
  import HelperText from '@smui/textfield/helper-text';

  import { validateCallsign } from '$lib/api/client';
  import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';
  import type { AuthPage } from '$lib/state/types';
  import { countryCodes } from '$lib/utils/countryCodes';
  import { register, user } from '$lib/state/session.svelte';

  import './auth.css';

  let { page = $bindable('') }: { page?: AuthPage } = $props();

  let username = $state('');
  let password = $state('');

  /** true while the call is in flight, to keep the button from sending it twice */
  let pending = $state(false);

  /* --- call sign ------------------------------------------------------- */

  /* uppercased so it matches an <Option>: the placeholder state carries 'it',
   * while the codes — and Intl's region names — are 'IT'. */
  let country = $state((user.country ?? 'US').toUpperCase());
  let digits = $state('');
  let letters = $state('');

  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const countryName = (code: string) => (code ? regionNames.of(code) : '');

  /* The country list is 249 entries, and SMUI keeps its menu in the document
   * rather than mounting it on open the way MUI's <Select> does — so all 249
   * <Option> components were being created with the dialog, which is what made
   * it open slowly. Until the select is touched only the selected one is
   * mounted, which is all the closed anchor displays; the rest arrive on the
   * pointerdown or focus that precedes the click that opens the menu. */
  let optionsMounted = $state(false);
  let options = $derived(optionsMounted ? countryCodes : [country]);

  /** the value the api will be asked about, once that call exists */
  let callsign = $derived(country + digits + letters);

  /** the same value with the empty places still shown, e.g. US1___ */
  let preview = $derived(
    country + digits.padEnd(2, '_') + letters.padEnd(3, '_')
  );

  let digitsValid = $derived(digits.length === 2);
  let lettersValid = $derived(letters.length === 3);
  let callsignValid = $derived(digitsValid && lettersValid);

  /* Availability check, ported from the effect of callSignEditor.jsx: as soon
   * as the three parts make a complete call sign, ask the server whether it is
   * free, and abort that request when the value changes under it — which is
   * what makes it safe to run on every keystroke, with no debounce, as the
   * react editor does. `abort_error` is the one failure that must not clear the
   * indicator: it means a newer request has taken over the state. */
  type CallsignCheck = 'none' | 'checking' | 'free' | 'taken';
  let callsignCheck = $state<CallsignCheck>('none');

  $effect(() => {
    if (!callsignValid) {
      callsignCheck = 'none';
      return;
    }
    const controller = new AbortController();
    callsignCheck = 'checking';
    validateCallsign(callsign, controller.signal).then((res) => {
      if (res.ok) callsignCheck = 'free';
      else if (res.error === 'already_taken') callsignCheck = 'taken';
      else if (res.error !== 'abort_error') callsignCheck = 'none';
    });
    return () => controller.abort();
  });

  /* Keystrokes are filtered rather than validated: the fields only ever hold a
   * prefix of something valid, which is what the react modules do too.
   *
   * The filtering has to run as an effect on the bound value. Writing it into
   * an oninput handler does not hold: SMUI keeps its own copy of the value and
   * restores it into the input after our handler has run, so a rejected
   * character disappears from the state but stays on screen. */
  $effect(() => {
    const clean = digits.replace(/[^0-9]/g, '').slice(0, 2);
    if (clean !== digits) digits = clean;
  });

  $effect(() => {
    const clean = letters
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase();
    if (clean !== letters) letters = clean;
  });

  let errors = $state({ username: '', password: '' });

  /** registerForm.jsx's passwordIsDumb(). */
  const COMMON_PASSWORDS = [
    '123456789', 'picture1', 'password', '12345678', '1234567890',
    'Million2', 'iloveyou', 'aaron431', 'password1', 'qqww1122',
    'starwars', 'qwertyuiop', 'asdfghjkl', 'aa123456', 'trustno1',
    'princess', 'morsecode', 'morsechat', '00000000',
  ];

  function passwordIsDumb(): boolean {
    return COMMON_PASSWORDS.includes(password) || password === username;
  }

  /** The checks of registerForm.jsx's clientValidate(), one per field. */
  function validate(): boolean {
    errors.username =
      username.length < 3 || username.length > 20
        ? 'invalid length'
        : /^[A-Za-z0-9-_]+$/.test(username)
          ? ''
          : 'invalid characters';
    errors.password =
      password.length < 8 || password.length > 255
        ? 'too short'
        : passwordIsDumb()
          ? 'too dumb'
          : '';
    return !errors.username && !errors.password;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!validate() || !callsignValid || pending) return;

    pending = true;
    const res = await register({ username, password, callsign });
    pending = false;

    if (res.ok) {
      // registering logs the user in; the verify page is where the react
      // version goes next, and it is still a placeholder
      page = 'verify';
      return;
    }
    if (res.error === 'invalid_username') {
      errors.username = 'invalid username';
    } else if (res.error === 'username_taken') {
      errors.username = 'username already registered';
    } else if (res.error === 'callsign_taken') {
      enqueueSnackbar('callsign already taken', {
        variant: 'error',
        preventDuplicate: true,
      });
    } else {
      enqueueSnackbar(`registration failed. ${res.error} ${res.details ?? ''}`, {
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

  <h5 class="title">Create your call sign</h5>
  <p>This is the name you'll be known as when you broadcast messages to the internet</p>

  <!-- the preview and, beside it, what the server says about it — the <Chip>
       row of the react editor -->
  <div class="callsign-preview">
    <span>{preview}</span>
    {#if callsignCheck === 'checking'}
      <span class="callsign-status">checking availability</span>
    {:else if callsignCheck === 'taken'}
      <span class="callsign-status taken">already taken</span>
    {:else if callsignCheck === 'free'}
      <span class="callsign-status free">
        <span class="material-icons" aria-hidden="true">done</span> available
      </span>
    {/if}
  </div>

  <!-- The three inputs sit flush against each other, as the react modules do:
       they read as one value being assembled. -->
  <div class="callsign">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="callsign-country-slot"
      onpointerdown={() => (optionsMounted = true)}
      onfocusin={() => (optionsMounted = true)}
    >
      <!-- menu$fixed: the menu is 249 entries and taller than the dialog, and
           mdc renders it inside .mdc-dialog__content, whose `overflow: auto`
           cuts off everything above the dialog. Fixed positioning takes it out
           of that box and mdc keeps it against the anchor itself. -->
      <Select
        bind:value={country}
        variant="outlined"
        class="callsign-country"
        menu$fixed={true}
      >
        {#each options as code (code)}
          <!-- Two labels per option: the closed select shows the country code,
               the open menu the name with the code after it. SMUI takes the
               anchor's text from .mdc-deprecated-list-item__primary-text when
               an option has one, and from the whole option when it does not —
               so the code goes in that element, hidden from the menu, and the
               long form is what the list actually renders. -->
          <Option value={code}>
            <span class="mdc-deprecated-list-item__primary-text country-code"
              >{code}</span
            >
            <span class="country-name">{countryName(code)} ({code})</span>
          </Option>
        {/each}
      </Select>
    </div>

    <div class="field callsign-part">
      <Textfield
        variant="outlined"
        bind:value={digits}
        invalid={!digitsValid}
        input$inputmode="numeric"
        input$aria-label="call sign numbers"
      >
        {#snippet helper()}
          <HelperText persistent validationMsg>2 numbers</HelperText>
        {/snippet}
      </Textfield>
    </div>

    <div class="field callsign-part">
      <Textfield
        variant="outlined"
        bind:value={letters}
        invalid={!lettersValid}
        input$aria-label="call sign letters"
      >
        {#snippet helper()}
          <HelperText persistent validationMsg>3 letters</HelperText>
        {/snippet}
      </Textfield>
    </div>
  </div>

  <hr />

  <h5 class="title">your data</h5>

  <!-- xs={12} md={6}: the two fields share a row once there is room -->
  <div class="fields">
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
        input$autocomplete="new-password"
        input$oninput={() => (errors.password = '')}
      >
        {#snippet helper()}
          {#if errors.password}
            <HelperText validationMsg persistent>{errors.password}</HelperText>
          {/if}
        {/snippet}
      </Textfield>
    </div>
  </div>

  <div class="actions">
    <Button variant="raised" color="secondary" type="submit" disabled={pending}>
      <Label>Register</Label>
    </Button>
    <span>Already have an account?</span>
    <button class="link" type="button" onclick={() => (page = 'login')}>
      login
    </button>
  </div>
</form>
