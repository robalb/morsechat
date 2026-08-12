<script lang="ts">
  /**
   * Port of webapp/src/components/header/Header.jsx.
   *
   * The moderation dialog and the account menu actions are state and api work,
   * left for a later step. What is here is the bar itself: left slot, channel
   * select, right slot.
   */
  import Button, { Label, Icon } from '@smui/button';
  import Menu from '@smui/menu';
  import List, { Item, Separator, Text } from '@smui/list';
  import Select, { Option } from '@smui/select';
  import type { Snippet } from 'svelte';

  import User from '../user/User.svelte';
  import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';
  import { chat } from '$lib/state/placeholder.svelte';
  import { api, logout, user } from '$lib/state/session.svelte';
  import type { AuthPage, OnlineUser } from '$lib/state/types';

  let {
    leftContent,
    authPage = $bindable(''),
  }: { leftContent?: Snippet; authPage?: AuthPage } = $props();

  let accountMenu = $state<Menu>();

  /** the logged in user's own profile card, opened from the account menu */
  let profileOpen = $state(false);

  /** The card is written against an entry of the online list, which is the
   * only place it was ever opened from. The logged in user is not necessarily
   * in that list — a moderator watching another channel is not — so the two
   * fields it reads are filled from the user state instead. */
  /**
   * Logging out replaces the session with an anonymous one, which the server
   * hands back with a fresh callsign — so there is nothing to reload, and no
   * page to navigate to, as the react version's menu item had none either.
   */
  async function handleLogout() {
    const res = await logout();
    if (!res.ok) {
      enqueueSnackbar(`logout failed. ${res.error} ${res.details ?? ''}`, {
        variant: 'error',
        preventDuplicate: true,
      });
    }
  }

  let self = $derived<OnlineUser>({
    is_anonymous: false,
    typing: false,
    allowSound: true,
    username: user.username ?? '',
    callsign: user.callsign ?? '',
  });
</script>

<header>
  <div>
    {#if leftContent}{@render leftContent()}{/if}
  </div>

  <!-- outlined, like MUI's <Select /> default; SMUI's is the standard variant,
       which drew a bare underline instead of the box. -->
  <!-- menu$fixed: SMUI keeps the menu inside the select, and the select is
       inside a header that is `overflow: hidden` — that is, a scroll container.
       Opening the menu moves focus to an item 400px down, and the browser
       scrolls the header to reveal it, carrying every other element out of
       sight. A fixed surface is neither clipped by the header nor part of what
       it can scroll. MUI has no such problem: it portals its menu to <body>. -->
  <Select
    id="channel-select-header"
    class="channel-select"
    variant="outlined"
    menu$fixed
    menu$class="channel-menu"
    bind:value={chat.channel}
    noLabel
  >
    {#each chat.channels as { ch, name } (ch)}
      <Option value={ch}>{name}</Option>
    {/each}
  </Select>

  <div>
    {#if api.loading}
      <!-- the react version renders a MUI Skeleton here; a plain box with the
           same footprint keeps the layout diff clean -->
      <div class="skeleton" aria-hidden="true"></div>
    {:else if user.authenticated}
      {#if user.isadmin || user.ismoderator}
        <Button>
          <Icon class="material-icons">shield</Icon>
          <Label>Moderation</Label>
        </Button>
      {/if}

      <!-- The react version opens a menu here, whose first item is "View
           Profile". The profile card is new and is the whole point of the
           button, so the button opens it directly and the menu keeps what the
           card cannot do — logging out. -->
      <Button
        onclick={() => (profileOpen = true)}
        aria-haspopup="dialog"
      >
        <Icon class="material-icons">account_circle</Icon>
        <Label>{user.username}</Label>
      </Button>
      <Button
        onclick={() => accountMenu?.setOpen(true)}
        aria-label="account menu"
        aria-haspopup="true"
        aria-controls="account-menu"
      >
        <Icon class="material-icons">expand_more</Icon>
      </Button>
      <Menu bind:this={accountMenu} id="account-menu">
        <List>
          <Item onclick={() => (profileOpen = true)}>
            <Icon class="material-icons">account_circle</Icon>
            <Text>View Profile</Text>
          </Item>
          <Separator />
          <Item onclick={handleLogout}>
            <Icon class="material-icons">logout</Icon>
            <Text>Logout</Text>
          </Item>
        </List>
      </Menu>
      <User bind:open={profileOpen} user={self} />
    {:else}
      <Button class="button-small" onclick={() => (authPage = 'login')}>
        <Label>Login</Label>
      </Button>
      <Button
        variant="outlined"
        class="button-small"
        onclick={() => (authPage = 'register')}
      >
        <Label>Register</Label>
      </Button>
    {/if}
  </div>
</header>

<style>
  header {
    background-color: var(--gray-60);
    height: var(--header-height);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.8em;
    overflow: hidden;
  }
  /* align-items is not in the react css: there both slots hold buttons of the
   * same height, so stretch and centre look identical. SMUI's icon button is
   * 48px and its text button 36px, and side by side the shorter one rides up to
   * the top of the row. */
  header > div {
    display: flex;
    align-items: center;
    /* a definite height, so a slot child asking for height: 100% — the online
       users button does — resolves against the header rather than its siblings */
    height: 100%;
  }
  /* mdc pins a select to 200px; MUI's sizes to its value, which is what keeps
     the channel name next to its arrow instead of a gap away from it. */
  :global(.mdc-select.channel-select),
  :global(.mdc-select.channel-select .mdc-select__anchor) {
    width: auto;
    /* auto width plus a flex parent means the channel name is the first thing
       squeezed out when the bar gets crowded — a moderator on a phone loses it
       entirely. min-content keeps the value and its arrow intact. */
    min-width: min-content;
    flex-shrink: 0;
  }
  :global(.mdc-select.channel-select) {
    --mdc-outlined-select-outline-color: rgba(255, 255, 255, 0.23);
  }
  :global(.mdc-select.channel-select .mdc-select__selected-text) {
    color: var(--gray-105);
  }
  /* SMUI hardcodes fullWidth on a select's menu, which is `width: 100%`. Once
     the surface is fixed that resolves against the viewport, not the select,
     so the menu came out 1468px wide. Shrink it to its items, as MUI's is. */
  :global(.mdc-menu-surface.channel-menu) {
    width: auto;
  }
  .skeleton {
    width: 110px;
    height: 20px;
    background-color: #424242;
    border-radius: 4px;
  }
</style>
