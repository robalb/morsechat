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

  import { api, chat, user } from '$lib/state/placeholder.svelte';
  import type { AuthPage } from '$lib/state/types';

  let {
    leftContent,
    authPage = $bindable(''),
  }: { leftContent?: Snippet; authPage?: AuthPage } = $props();

  let accountMenu = $state<Menu>();
</script>

<header>
  <div>
    {#if leftContent}{@render leftContent()}{/if}
  </div>

  <Select
    id="channel-select-header"
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

      <Button
        onclick={() => accountMenu?.setOpen(true)}
        aria-haspopup="true"
        aria-controls="account-menu"
      >
        <Icon class="material-icons">account_circle</Icon>
        <Label>{user.username}</Label>
      </Button>
      <Menu bind:this={accountMenu} id="account-menu">
        <List>
          <Item>
            <Icon class="material-icons">account_circle</Icon>
            <Text>View Profile</Text>
          </Item>
          <Separator />
          <Item>
            <Icon class="material-icons">logout</Icon>
            <Text>Logout</Text>
          </Item>
        </List>
      </Menu>
    {:else}
      <Button onclick={() => (authPage = 'login')}>
        <Label>Login</Label>
      </Button>
      <Button variant="outlined" onclick={() => (authPage = 'register')}>
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
  header > div {
    display: flex;
  }
  .skeleton {
    width: 110px;
    height: 20px;
    background-color: #424242;
    border-radius: 4px;
  }
</style>
