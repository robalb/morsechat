<script lang="ts">
  /**
   * Port of webapp/src/components/online/Online.jsx.
   *
   * The sound toggle writes straight into the member list, which is the whole
   * of what the react `setAllowSound` reducer did. It is a local decision —
   * the server is never told who we are not listening to.
   */
  import { untrack } from 'svelte';

  import IconButton from '@smui/icon-button';

  import User from '../user/User.svelte';
  import { chat } from '$lib/state/chat.svelte';
  import type { OnlineUser } from '$lib/state/types';

  let { class: className = '' }: { class?: string } = $props();

  /**
   * The status pill replays its resize animation whenever the connection
   * changes, by alternating between two identical keyframes. Toggling a class
   * is the only way to restart a css animation, hence the pair.
   */
  /** the user whose card is open, and the card's own open state */
  let dialogOpen = $state(false);
  let selectedUser = $state<OnlineUser | null>(null);

  function openDialog(userObj: OnlineUser) {
    selectedUser = userObj;
    dialogOpen = true;
  }

  let animationClass = $state(true);
  let firstRender = true;
  $effect(() => {
    // read it so the effect re-runs when the connection flips
    chat.connected;
    if (firstRender) {
      firstRender = false;
    } else {
      // untracked: the flip reads the value it writes, and a dependency on it
      // would have this effect re-trigger itself forever
      animationClass = !untrack(() => animationClass);
    }
  });
</script>

<div class="online_container {className}">
  <div class="statusContainer">
    <p
      class="status"
      class:a_1={animationClass}
      class:a_2={!animationClass}
      class:ws_online={chat.connected}
    >
      {chat.connectionStatus}
    </p>
  </div>
  <hr />
  <h2>online users</h2>
  <div class="online">
    {#each Object.entries(chat.onlineUsers) as [id, userObj] (id)}
      <div>
        <div class="left">
          <button onclick={() => openDialog(userObj)}>
            <p>{userObj.callsign}{id === chat.myID ? ' (you)' : ''}</p>
          </button>
          {#if userObj.typing}
            <div class="typing">
              <div></div>
              <div></div>
            </div>
          {/if}
        </div>
        <IconButton
          class="material-icons"
          aria-label="{userObj.allowSound
            ? 'disable'
            : 'enable'} sound for user {userObj.callsign}"
          onclick={() => (userObj.allowSound = !userObj.allowSound)}
        >
          {userObj.allowSound ? 'volume_up' : 'volume_off'}
        </IconButton>
      </div>
    {/each}
  </div>
  <User bind:open={dialogOpen} user={selectedUser} />
</div>

<style>
  .online_container {
    padding: 0 0.2rem 0 1rem;
    overflow: hidden;
  }

  .statusContainer {
    height: 4rem;
    display: flex;
    align-items: center;
  }
  .online_container hr {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 2px solid rgba(0, 0, 0, 0.5);
    margin-right: 2rem;
    margin-top: 0;
    margin-bottom: 1rem;
  }
  .online_container h2 {
    margin-top: 0;
  }

  .online {
    overflow-y: auto;
    max-height: calc(100% - 4rem - 5rem);
    padding-bottom: 1rem;
  }

  .online > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 2rem;
  }
  .online .left {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .online .left button {
    all: unset;
    cursor: pointer;
  }
  .online .left button:hover {
    text-decoration: underline;
  }
  .online .left button:focus-visible p {
    outline: 1px solid white;
  }

  .online .typing {
    margin-left: 1rem;
  }

  .online .typing div {
    width: 13px;
    height: 13px;
    background-color: var(--gray-95);
    display: inline-block;
    animation: sk-bouncedelay 1.2s infinite ease-in-out both;
  }

  .online .typing div:first-child {
    animation-delay: -0.2s;
  }

  @keyframes sk-bouncedelay {
    0%,
    80%,
    100% {
      transform: scale(0);
    }
    40% {
      transform: scale(0.4);
    }
  }

  .status {
    display: inline;
    color: black;
    padding: 2px 5px 2px 5px;
    border-radius: 5px;
    background: #ff9966; /* fallback for old browsers */
    background: var(--orange-gradient);
  }
  .status.ws_online {
    background: #0cebeb;
    background: var(--blue-gradient);
  }
  .status.a_1 {
    animation: resize 1s;
  }
  .status.a_2 {
    animation: resize2 1s;
  }
  @keyframes resize {
    0% {
      padding: 2px 5px 2px 5px;
    }
    20% {
      padding: 2px 15px 2px 15px;
    }
    100% {
      padding: 2px 5px 2px 5px;
    }
  }
  @keyframes resize2 {
    0% {
      padding: 2px 5px 2px 5px;
    }
    20% {
      padding: 2px 15px 2px 15px;
    }
    100% {
      padding: 2px 5px 2px 5px;
    }
  }
</style>
