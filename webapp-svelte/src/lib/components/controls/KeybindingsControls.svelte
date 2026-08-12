<script lang="ts">
  /**
   * Port of the KeybindingsControls export of
   * webapp/src/components/controls/controls.jsx.
   *
   * The react panel is three bare <p>s — "straight key SPACE, C" — with the key
   * names sitting in the sentence. Here the same bindings are a table: one row
   * per action, the action on the left, its keys on the right as <kbd> caps,
   * which is the shape a shortcut list is usually read in. Each row is a button
   * that opens <KeybindingsDialog />, where the keys of that one action can be
   * added and removed.
   */
  import './controls.css';
  import './keybindings.css';
  import KeybindingsDialog from './KeybindingsDialog.svelte';
  import type { Binding } from './keybindings';

  let { class: className = '' }: { class?: string } = $props();

  /** Placeholder state, as everywhere else in this port: the real bindings come
   * from the settings slice with the state migration. Saving the popup writes
   * here, so the panel behind it updates. */
  let bindings = $state<Binding[]>([
    { action: 'straight key', keys: ['space', 'c'] },
    { action: 'left paddle', keys: ['z'] },
    { action: 'right paddle', keys: ['x'] },
    { action: 'transmit', keys: ['w'] },
    { action: 'cancel message', keys: ['p'] },
  ]);

  let editing = $state<Binding | null>(null);
  let dialogOpen = $state(false);

  function edit(binding: Binding) {
    editing = binding;
    dialogOpen = true;
  }

  function save(keys: string[]) {
    if (editing) {
      editing.keys = keys;
    }
  }
</script>

<div class="controls keybindings {className}">
  <h2>Keybindings</h2>
  <div class="keybindings-table">
    {#each bindings as binding (binding.action)}
      <button
        class="binding-row"
        aria-label="edit the keybindings of {binding.action}"
        onclick={() => edit(binding)}
      >
        <span>{binding.action}</span>
        <span class="binding-keys">
          {#each binding.keys as key (key)}
            <kbd>{key}</kbd>
          {/each}
        </span>
      </button>
    {/each}
  </div>
</div>

<KeybindingsDialog bind:open={dialogOpen} binding={editing} onsave={save} />
