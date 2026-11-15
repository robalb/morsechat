<script lang="ts">
  import CircularProgress from '@smui/circular-progress';
  import DataTable, { Body, Cell, Head, Row } from '@smui/data-table';
  import Tab, { Label } from '@smui/tab';
  import TabBar from '@smui/tab-bar';
  import Textfield from '@smui/textfield';

  import { moderationList } from '$lib/api/client';
  import type { ModerationListResponse } from '$lib/api/types';

  import BanButton from './BanButton.svelte';
  import ManualBanForm from './ManualBanForm.svelte';
  import TableCellCopy from './TableCellCopy.svelte';

  /** milliseconds the search box must stay quiet before the list is refetched */
  const SEARCH_DEBOUNCE = 1000;

  /**
   * Where a device id is cut short, the rest going to its tooltip. Wide enough
   * for the two forms the backend issues: a 36 character uuid, and a local id
   * (`L-<ip>-<httpfinger>`), which is 48 at a loopback address and longer at a
   * routable one. The trailing hashes are what tells two devices behind one
   * address apart, so a cut that loses them loses the identifying half.
   */
  const DEVICE_CHARS = 48;

  const TABS = [
    'Moderation Logs',
    'Banned users',
    'Reports',
    'Manual operations',
  ] as const;

  const EMPTY: ModerationListResponse = {
    users: [],
    anon_users: [],
    ban_actions: [],
    report_actions: [],
  };

  let activeTab = $state<(typeof TABS)[number]>(TABS[0]);
  let searchTerm = $state('');
  let debouncedTerm = $state('');
  let status = $state<'loading' | 'done' | 'error'>('loading');
  let data = $state<ModerationListResponse>(EMPTY);

  $effect(() => {
    const term = searchTerm;
    const timer = setTimeout(() => (debouncedTerm = term), SEARCH_DEBOUNCE);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const query = debouncedTerm === '' ? '%' : debouncedTerm;
    const controller = new AbortController();
    let cancelled = false;
    status = 'loading';
    moderationList(query, controller.signal).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        data = res.data;
        status = 'done';
      } else {
        status = 'error';
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  });

  let resultCount = $derived(
    data.users.length +
      data.anon_users.length +
      data.ban_actions.length +
      data.report_actions.length,
  );

  /** @param seconds - unix seconds, as the moderation records carry them */
  function formatDate(seconds: number): string {
    const date = new Date(seconds * 1000);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (now.toDateString() === date.toDateString())
      return `today, ${date.toLocaleTimeString()}`;
    if (yesterday.toDateString() === date.toDateString())
      return `yesterday, ${date.toLocaleTimeString()}`;
    return date.toLocaleString();
  }
</script>

<div class="moderation">
  <div class="search">
    <Textfield bind:value={searchTerm} label="Search..." variant="outlined" />
    <div class="status">
      {#if status === 'loading'}
        <CircularProgress style="height: 30px; width: 30px;" indeterminate />
      {:else if status === 'error'}
        <p>Loading error</p>
      {:else}
        <p>{resultCount} results</p>
      {/if}
    </div>
  </div>

  <TabBar tabs={TABS} bind:active={activeTab}>
    {#snippet tab(tab)}
      <Tab {tab} minWidth><Label>{tab}</Label></Tab>
    {/snippet}
  </TabBar>

  {#if activeTab === 'Moderation Logs'}
    <DataTable table$aria-label="Moderation logs">
      <Head>
        <Row>
          <Cell>Date &amp; Time</Cell>
          <Cell>Info</Cell>
          <Cell>Action</Cell>
          <Cell>User</Cell>
          <Cell>Device</Cell>
        </Row>
      </Head>
      <Body>
        {#each data.ban_actions as action (action.id)}
          <Row>
            <Cell>{formatDate(action.event_timestamp)}</Cell>
            <Cell>
              Moderator @{action.moderator_username}{action.moderator_notes
                ? `: ${action.moderator_notes}`
                : ''}
            </Cell>
            <Cell>{action.is_ban_revert ? 'ban REVERT' : 'BAN'}</Cell>
            <TableCellCopy
              text={action.baduser_id === 0 ? '--' : action.baduser_username}
            />
            <TableCellCopy text={action.baduser_session} />
          </Row>
        {/each}
      </Body>
    </DataTable>
  {:else if activeTab === 'Banned users'}
    <DataTable table$aria-label="Banned users">
      <Head>
        <Row>
          <Cell>Callsign</Cell>
          <Cell>Country</Cell>
          <Cell>Verified</Cell>
          <Cell>Username</Cell>
          <Cell>Device</Cell>
          <Cell>Actions</Cell>
        </Row>
      </Head>
      <Body>
        {#each data.users as bannedUser (bannedUser.id)}
          <Row>
            <Cell>{bannedUser.callsign}</Cell>
            <Cell>{bannedUser.country ?? '-'}</Cell>
            <Cell>{bannedUser.is_verified ? 'YES' : 'no'}</Cell>
            <TableCellCopy text={bannedUser.username} />
            <Cell>-</Cell>
            <Cell>
              <BanButton
                variant="outlined"
                class="button-small"
                username={bannedUser.username}
                revert
              >
                Revert ban
              </BanButton>
            </Cell>
          </Row>
        {/each}
        {#each data.anon_users as anon (anon.id)}
          <Row>
            <Cell>-</Cell>
            <Cell>-</Cell>
            <Cell>-</Cell>
            <Cell>-</Cell>
            <TableCellCopy text={anon.last_session} />
            <Cell>
              <BanButton
                variant="outlined"
                class="button-small"
                session={anon.last_session}
                revert
              >
                Revert ban
              </BanButton>
            </Cell>
          </Row>
        {/each}
      </Body>
    </DataTable>
  {:else if activeTab === 'Reports'}
    <DataTable table$aria-label="Reports">
      <Head>
        <Row>
          <Cell>Bad Message</Cell>
          <Cell>Bad User</Cell>
          <Cell>Bad Device</Cell>
          <Cell>Sent at</Cell>
          <Cell>Actions</Cell>
          <Cell>Reporter</Cell>
          <Cell>Reporter Device</Cell>
          <Cell>Reported at</Cell>
          <Cell>Actions</Cell>
        </Row>
      </Head>
      <Body>
        {#each data.report_actions as report (report.id)}
          <Row>
            <TableCellCopy text={report.badmessage_transcript} maxLength={30} />
            <TableCellCopy
              text={report.baduser_id === 0 ? '--' : report.baduser_username}
            />
            <TableCellCopy text={report.baduser_session} maxLength={DEVICE_CHARS} />
            <Cell>{formatDate(report.badmessage_timestamp)}</Cell>
            <Cell>
              <BanButton
                variant="outlined"
                class="button-small"
                username={report.baduser_username}
                session={report.baduser_session}
              >
                Ban
              </BanButton>
            </Cell>
            <TableCellCopy
              text={report.reporter_user_id === 0
                ? '--'
                : report.reporter_username}
            />
            <TableCellCopy text={report.reporter_session} maxLength={DEVICE_CHARS} />
            <Cell>{formatDate(report.event_timestamp)}</Cell>
            <Cell>
              <BanButton
                variant="outlined"
                class="button-small"
                username={report.reporter_username}
                session={report.reporter_session}
              >
                Ban reporter
              </BanButton>
            </Cell>
          </Row>
        {/each}
      </Body>
    </DataTable>
  {:else}
    <ManualBanForm />
  {/if}
</div>

<style>
  .moderation {
    padding: 16px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 3rem;
    margin-bottom: 1rem;
  }
  .search :global(.mdc-text-field) {
    width: 300px;
  }
  .search p {
    margin: 0;
  }

  .moderation :global(.mdc-data-table) {
    margin-top: 1rem;
    width: 100%;
  }
  .moderation :global(.mdc-data-table__row) {
    height: 33px;
  }
  .moderation :global(.mdc-data-table__header-row) {
    height: 37px;
  }
  .moderation :global(.mdc-data-table__cell),
  .moderation :global(.mdc-data-table__header-cell) {
    padding: 0 8px;
    font-size: 0.8125rem;
    white-space: nowrap;
  }
  .moderation :global(.mdc-data-table__cell .mdc-button) {
    vertical-align: middle;
  }
  .moderation :global(.mdc-data-table__cell .mdc-button.button-small) {
    padding: 1px 8px;
    font-size: 0.75rem;
  }

  /* mdc paints the tab ripple on plain :focus, so the tab last clicked keeps a
   * grey box; MUI rings on :focus-visible only */
  .moderation :global(.mdc-tab:not(:focus-visible) .mdc-tab__ripple::before) {
    opacity: 0;
  }

  /* mdc's colour prop covers primary and secondary only, so the error palette
   * is spelled out, as dialog.css does for the popups */
  .moderation :global(.mdc-button--raised.button-error) {
    background-color: var(--mdc-theme-error, #f44336);
    color: #fff;
  }
  .moderation :global(.mdc-button--raised.button-error:disabled) {
    background-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.3);
  }
</style>
