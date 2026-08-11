<script lang="ts">
  /**
   * The register page of the auth dialog.
   *
   * Layout port of webapp/src/components/auth/registerForm.jsx. As in
   * LoginForm, submitting runs the client side validation and stops — the
   * registerUser() call and the hop to the verify page land with the state
   * migration.
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

  import type { AuthPage } from '$lib/state/types';
  import { countryCodes } from '$lib/utils/countryCodes';
  import { user } from '$lib/state/placeholder.svelte';

  import './auth.css';

  let { page = $bindable('') }: { page?: AuthPage } = $props();

  let username = $state('');
  let password = $state('');

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

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!validate() || !callsignValid) return;
    // TODO: dispatch the register call with { username, password, callsign },
    // then `page = 'verify'` on success.
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

  <div class="callsign-preview">{preview}</div>

  <!-- The three inputs sit flush against each other, as the react modules do:
       they read as one value being assembled. -->
  <div class="callsign">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="callsign-country-slot"
      onpointerdown={() => (optionsMounted = true)}
      onfocusin={() => (optionsMounted = true)}
    >
      <Select bind:value={country} variant="outlined" class="callsign-country">
        {#each options as code (code)}
          <Option value={code}>{countryName(code)}</Option>
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
    <Button variant="raised" color="secondary" type="submit">
      <Label>Register</Label>
    </Button>
    <span>Already have an account?</span>
    <button class="link" type="button" onclick={() => (page = 'login')}>
      login
    </button>
  </div>
</form>
