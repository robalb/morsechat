<script lang="ts">
  import Paper from '@smui/paper';
  import Textfield from '@smui/textfield';

  import BanButton from './BanButton.svelte';

  let username = $state('');
  let deviceId = $state('');

  let empty = $derived(!(username.trim() || deviceId.trim()));
</script>

<Paper variant="unelevated" class="manual-ban">
  <h2>Manual ban</h2>
  <div class="row">
    <Textfield bind:value={username} label="Username" variant="outlined" />
    <Textfield bind:value={deviceId} label="Device ID" variant="outlined" />
    <BanButton
      variant="raised"
      class="button-error"
      disabled={empty}
      {username}
      session={deviceId}
    >
      Ban
    </BanButton>
    <BanButton variant="raised" disabled={empty} {username} session={deviceId} revert>
      Revert ban
    </BanButton>
  </div>
</Paper>

<style>
  :global(.smui-paper.manual-ban) {
    max-width: 900px;
    padding: 24px;
    background-color: transparent;
  }
  h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
    font-weight: 500;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }
  .row :global(.mdc-text-field) {
    flex: 1 1 200px;
  }
  .row :global(.mdc-button) {
    flex-shrink: 0;
  }
</style>
