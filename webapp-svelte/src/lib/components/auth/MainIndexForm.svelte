<script lang="ts">
  /**
   * Port of webapp/src/components/auth/mainIndexForm.jsx.
   *
   * The react version fires a `no_popup` api call on mount so the dialog does
   * not come back on the next visit. That call belongs to the state migration.
   *
   * MUI's Grid/Stack have no SMUI counterpart, so the spacing they produced is
   * expressed as flow layout here.
   */
  import Button, { Label } from '@smui/button';

  import type { AuthPage } from '$lib/state/types';

  let { page = $bindable('') }: { page?: AuthPage } = $props();
</script>

<div class="grid">
  <div>
    <h5 class="title">Morsechat</h5>
    <p>
      This is an online morse code chat.<br />
      Join to practice and communicate in real time with hundreds of users from all
      over the world without having to buy a radio
    </p>
    <p>
      Press space or the key at the bottom of the page to transmit a dot, hold it
      to transmit a dash
    </p>
  </div>

  <div class="stack">
    <Button variant="outlined" onclick={() => (page = 'register')}>
      <Label>Register</Label>
    </Button>
    <Button onclick={() => (page = 'login')}>
      <Label>Login</Label>
    </Button>
  </div>

  <hr />

  <div>
    <Button variant="raised" onclick={() => (page = '')}>
      <Label>Join anonimously</Label>
    </Button>
  </div>
</div>

<style>
  .grid {
    display: flex;
    flex-direction: column;
    gap: 24px; /* MUI Grid spacing={3} */
  }
  .title {
    /* MUI Typography variant="h5" color="primary" */
    font-size: 1.5rem;
    font-weight: 400;
    line-height: 1.334;
    margin: 0;
    color: var(--mdc-theme-primary, #fafafa);
  }
  .stack {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 10px;
  }
  hr {
    width: 100%;
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    margin: 0;
  }
</style>
