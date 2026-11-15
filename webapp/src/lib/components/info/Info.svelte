<script lang="ts">
  import discordUrl from '$assets/icons/discord.svg';
  import githubUrl from '$assets/icons/github.svg';

  let { class: className = '' }: { class?: string } = $props();
</script>

<div class="info {className}">
  <h3>Morsechat</h3>
  <p>This is an online morsecode chat</p>
  <p>
    Press the spacebar or the key below to transmit a dot, hold it to transmit a
    dash
  </p>
  <p>
    Join the discord community for help, or to participate on the development.
  </p>
  <a href="https://discord.gg/JPzfzNJG6e" title="discord">
    <img src={discordUrl} alt="discord" />
  </a><br />
  <a href="https://github.com/robalb/morsechat" title="github">
    <img src={githubUrl} alt="github" />
  </a>
</div>

<style>
  .info {
    padding-left: 1.5em;
    -webkit-font-smoothing: antialiased;
  }
  .info :global(h1) {
    font-size: 2.5em;
    margin: 15px 0;
    display: inline;
    background-color: var(--blue);
    background-image: var(--blue-gradient);
    background-size: 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .info p,
  .info h3 {
    margin: 7px 0;
  }
  .info a {
    margin-top: 1em;
    display: inline-block;
  }
</style>
