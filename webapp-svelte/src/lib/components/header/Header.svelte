<script lang="ts">
  /**
   * Port of webapp/src/components/header/Header.jsx.
   *
   * The bar itself: left slot, channel select, right slot.
   */
  import Button, { Label, Icon } from '@smui/button';
  import Menu from '@smui/menu';
  import List, { Item, Separator, Text } from '@smui/list';
  import Select, { Option } from '@smui/select';
  import type { Snippet } from 'svelte';

  import ModerationDialog from '../moderation/ModerationDialog.svelte';
  import User from '../user/User.svelte';
  import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';
  import { chat } from '$lib/state/chat.svelte';
  import { api, logout, user } from '$lib/state/session.svelte';
  import type { AuthPage, OnlineUser } from '$lib/state/types';

  let {
    leftContent,
    authPage = $bindable(''),
  }: { leftContent?: Snippet; authPage?: AuthPage } = $props();

  let accountMenu = $state<Menu>();
  /** open state of that menu, read only to keep aria-expanded honest */
  let accountMenuOpen = $state(false);
  let accountMenuOpenAtPress = false;

  /** the logged in user's own profile card, opened from the account menu */
  let profileOpen = $state(false);

  let moderationOpen = $state(false);

  /**
   * Toggles the account menu, from the button that anchors it.
   *
   * The menu closes itself on any click outside its surface — the button
   * included — before this runs, so the state to toggle is the one as of
   * pointerdown rather than `accountMenuOpen`. A keyboard activation sends no
   * pointerdown, and is what an empty `event.detail` marks.
   */
  function toggleAccountMenu(event: MouseEvent) {
    const wasOpen =
      event.detail === 0 ? accountMenuOpen : accountMenuOpenAtPress;
    accountMenu?.setOpen(!wasOpen);
  }

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
        <Button
          onclick={() => (moderationOpen = true)}
          aria-haspopup="dialog"
        >
          <Icon class="material-icons">shield</Icon>
          <Label>Moderation</Label>
        </Button>
        <ModerationDialog bind:open={moderationOpen} />
      {/if}

      <!-- One button, as in the react header: the account name with a caret,
           opening the menu that holds both of its actions.

           The wrapper is not decoration: @smui/menu-surface anchors itself to
           its parent element, and without one that parent is the whole right
           hand slot of the bar — which is what had the menu opening from the
           edge of the header rather than from under the button.

           fixed: the header is `overflow: hidden`, so an absolutely positioned
           surface inside it is clipped. Same correction as the channel select
           above. -->
      <div class="account">
        <Button
          onpointerdown={() => (accountMenuOpenAtPress = accountMenuOpen)}
          onclick={toggleAccountMenu}
          aria-haspopup="menu"
          aria-controls="account-menu"
          aria-expanded={accountMenuOpen}
        >
          <Icon class="material-icons">account_circle</Icon>
          <Label>{user.username}</Label>
          <Icon class="material-icons trailing">expand_more</Icon>
        </Button>
        <Menu
          bind:this={accountMenu}
          bind:open={accountMenuOpen}
          id="account-menu"
          class="account-menu"
          fixed
          anchorCorner="BOTTOM_LEFT"
        >
          <!-- tabindex: mdc moves focus to the list root when the menu opens,
               and a <ul> takes focus only with one. onSMUIAction: raised by a
               click and by Enter, where onclick is the click alone. -->
          <List tabindex={-1}>
            <Item onSMUIAction={() => (profileOpen = true)}>
              <Icon class="material-icons">account_circle</Icon>
              <Text>View Profile</Text>
            </Item>
            <Separator />
            <Item onSMUIAction={handleLogout}>
              <Icon class="material-icons">logout</Icon>
              <Text>Logout</Text>
            </Item>
          </List>
        </Menu>
      </div>
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
  /* The anchor of the account menu. It has to be a flex box of its own height,
     or the button inside it is measured against the wrapper rather than the
     bar and sits off the vertical centre. */
  .account {
    display: flex;
    align-items: center;
    height: 100%;
  }

  /* mdc's leading icon carries an 8px right margin and no left one, which puts
     the icon hard against the button's edge and the name a gap away from it.
     MUI's <Button startIcon> is the other way round. */
  :global(.account .mdc-button .mdc-button__icon:first-child) {
    margin-right: 8px;
    margin-left: 0;
  }
  /* the caret: smaller than the account icon, and closer to the name than the
     name is to the icon, so the two read as one control rather than three */
  :global(.account .mdc-button .trailing) {
    margin-left: 4px;
    margin-right: -4px;
    font-size: 18px;
  }

  /* mdc gives a menu surface `min-width: 112px`, which on a short username is
     narrower than the button it hangs from — the menu ends up looking detached.
     Its own items are what should size it. */
  :global(.mdc-menu-surface.account-menu) {
    min-width: max-content;
  }
  /* mdc reserves the leading slot of a list item for a .*__graphic, which an
     <Icon> inside an <Item> is not — so the icon and its label ended up flush
     against each other. MUI's <MenuItem> spaces them with a 36px icon column;
     a gap does the same job here without claiming a fixed width. */
  :global(.account-menu .mdc-deprecated-list-item__text),
  :global(.account-menu .mdc-deprecated-list-item) {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  /* a menu row, not a list row: 36px, as MUI's <MenuItem> is above its sm
     breakpoint, instead of mdc's 48px touch target */
  :global(.account-menu .mdc-deprecated-list-item) {
    height: auto;
    padding: 6px 16px;
  }
  :global(.account-menu .mdc-deprecated-list-item .material-icons) {
    font-size: 20px;
  }
  :global(.account-menu .mdc-deprecated-list-divider) {
    margin: 4px 0;
  }

  .skeleton {
    width: 110px;
    height: 20px;
    background-color: #424242;
    border-radius: 4px;
  }
</style>
