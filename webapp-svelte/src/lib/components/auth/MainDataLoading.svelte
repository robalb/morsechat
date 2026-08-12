<script lang="ts">
  /**
   * Port of webapp/src/components/auth/mainDataLoading.jsx.
   *
   * What the auth dialog shows in place of a form while sess_init is in
   * flight, and what it shows instead when that call failed: the error code,
   * its details, and a button to try again. Retrying is the only way out of a
   * failed session — every other call needs the cookie that one sets.
   */
  import Button, { Label } from '@smui/button';

  import { api, retrySession } from '$lib/state/session.svelte';

  let pending = $state(false);

  async function reload() {
    if (pending) return;
    pending = true;
    await retrySession();
    pending = false;
  }
</script>

<div class="loading">
  {#if api.error}
    <h6 class="error-title">Loading error</h6>
    <p>Error code: {api.error}</p>
    {#if api.errorDetails}
      <p class="details">{api.errorDetails}</p>
    {/if}
    <Button variant="outlined" onclick={reload} disabled={pending}>
      <Label>retry</Label>
    </Button>
  {:else}
    <p>Loading account data</p>
    <!-- MUI's <LinearProgress color="secondary" />: an indeterminate bar -->
    <div class="bar" role="progressbar" aria-label="loading account data"></div>
  {/if}
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--gray-105, #fff);
  }

  /* MUI Typography variant="h6" color="error" */
  .error-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.6;
    color: #f44336;
  }

  /* MUI Typography variant="body2" */
  .loading p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.43;
    letter-spacing: 0.01071em;
  }
  .details {
    overflow-wrap: anywhere;
  }

  .bar {
    position: relative;
    height: 4px;
    overflow: hidden;
    border-radius: 2px;
    background-color: rgba(255, 255, 255, 0.24);
  }
  .bar::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    background-color: var(--mdc-theme-secondary, #20e3b2);
    animation: indeterminate 1.5s infinite linear;
  }
  @keyframes indeterminate {
    from {
      left: -40%;
    }
    to {
      left: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar::after {
      animation: none;
      left: 0;
      width: 100%;
    }
  }

  /* the retry button, which the react version renders color="error" */
  .loading :global(.mdc-button) {
    align-self: flex-start;
    color: #f44336;
    --mdc-outlined-button-outline-color: rgba(244, 67, 54, 0.5);
  }
</style>
