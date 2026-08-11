<script lang="ts">
  /**
   * Port of webapp/src/pages/AppLayout.jsx.
   *
   * The structure is deliberately one-to-one with the react version: same
   * elements, same class names, same conditions on the breakpoints. The two
   * pages should be interchangeable under webapp-migration-tools/compare.js.
   *
   * Where the react version passed jsx through props (`leftContent`,
   * `settingsButton`, `leftButton`), this uses snippets, which is the direct
   * svelte equivalent.
   */
  import Button, { Label, Icon } from '@smui/button';
  import Drawer, { Scrim } from '@smui/drawer';
  import IconButton from '@smui/icon-button';

  import Auth from '$lib/components/auth/Auth.svelte';
  import Chat from '$lib/components/chat/Chat.svelte';
  import Header from '$lib/components/header/Header.svelte';
  import Info from '$lib/components/info/Info.svelte';
  import Key from '$lib/components/key/Key.svelte';
  import Online from '$lib/components/online/Online.svelte';
  import Preview from '$lib/components/preview/Preview.svelte';
  import Settings from '$lib/components/settings/Settings.svelte';
  import Sheet from '$lib/components/sheet/Sheet.svelte';
  import SideControls from '$lib/components/controls/SideControls.svelte';
  import { api, chat, user } from '$lib/state/placeholder.svelte';
  import type { AuthPage } from '$lib/state/types';
  import { mediaQuery } from '$lib/utils/mediaQuery.svelte';

  let { chatDomNode = $bindable(null) }: { chatDomNode?: HTMLDivElement | null } =
    $props();

  /**
   * Breakpoints definitions.
   * These same breakpoints are defined in appLayout.css
   */
  const tablet = mediaQuery('(min-width:800px)');
  const desktop = mediaQuery('(min-width:1400px)');

  let sheetOpen = $state(false);
  let sidebarOpen = $state(false);
  let settingsOpen = $state(false);

  // the sheet starts open on desktop. An effect rather than an initialiser,
  // because `desktop` is only known once the media query listener has run
  let sheetInitialised = false;
  $effect(() => {
    if (!sheetInitialised) {
      sheetInitialised = true;
      sheetOpen = desktop.matches;
    }
  });

  function toggleSheet() {
    sheetOpen = !sheetOpen;
  }

  /** auth popup. An empty string keeps the dialog closed. */
  let authPage = $state<AuthPage>('');

  $effect(() => {
    if (!api.loading && !user.authenticated && user.show_popup) {
      authPage = 'menu';
    }
  });

  let onlineCount = $derived(Object.keys(chat.onlineUsers).length);
</script>

<div class="app-container">
  <Auth bind:page={authPage} />
  <Settings bind:open={settingsOpen} mobileView={!tablet.matches} />

  {#if !desktop.matches}
    <Scrim />
    <Drawer variant="modal" bind:open={sidebarOpen}>
      <div class="sidebar-controls">
        <IconButton
          class="material-icons"
          aria-label="close sidebar"
          onclick={() => (sidebarOpen = false)}>close</IconButton
        >
      </div>
      <Info class="sidebar-info" />
    </Drawer>
  {/if}

  {#snippet headerLeft()}
    {#if !desktop.matches}
      <IconButton
        class="material-icons"
        aria-label="Menu"
        onclick={() => (sidebarOpen = true)}>menu</IconButton
      >
    {/if}
    {#if !tablet.matches}
      <Button class="header-bt-left" aria-label="Online users">
        <Icon class="material-icons">people</Icon>
        <Label><output>{onlineCount}</output></Label>
      </Button>
    {/if}
  {/snippet}

  <Header leftContent={headerLeft} bind:authPage />

  <main>
    {#if desktop.matches}
      <Info class="grid-info" />
    {/if}

    {#if tablet.matches}
      <div class="grid-side">
        <Online class="grid-side-online" />
        {#snippet settingsButton()}
          <Button
            variant="outlined"
            class="button-small"
            onclick={() => (settingsOpen = !settingsOpen)}
          >
            <Icon class="material-icons">settings</Icon>
            <Label>Advanced</Label>
          </Button>
        {/snippet}
        <SideControls class="grid-side-sidecontrols" {settingsButton} />
      </div>
    {/if}

    <Preview class="grid-preview" />
    <Chat class="grid-chat" bind:chatDomNode />

    {#snippet keyLeftButton()}
      <IconButton
        class="material-icons"
        aria-label="Settings"
        onclick={() => (settingsOpen = !settingsOpen)}>settings</IconButton
      >
    {/snippet}
    <Key
      class="grid-key"
      leftButton={tablet.matches ? undefined : keyLeftButton}
      sheetBtHandler={toggleSheet}
    />

    {#if sheetOpen}
      <Sheet class="grid-sheet" closeBtHandler={toggleSheet} />
    {/if}
  </main>
</div>
