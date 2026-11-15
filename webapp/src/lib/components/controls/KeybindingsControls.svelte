<script lang="ts">
  import type { Keybinds } from '$lib/api/types';
  import { user } from '$lib/state/session.svelte';

  import './controls.css';
  import './keybindings.css';
  import KeybindingsDialog from './KeybindingsDialog.svelte';
  import type { Binding } from './keybindings';

  let { class: className = '' }: { class?: string } = $props();

  /** The rows, in the order they are shown: what each action is called here,
   * and the settings field it is stored in. The two paddles are named after the
   * hand rather than after dot and dash — which of the two a paddle sends is
   * the `iambic paddle order` setting, not this. */
  const ACTIONS: { action: string; field: keyof Keybinds }[] = [
    { action: 'straight key', field: 'straight' },
    { action: 'left paddle', field: 'yambic_left' },
    { action: 'right paddle', field: 'yambic_right' },
    { action: 'transmit', field: 'transmit' },
    { action: 'cancel message', field: 'cancel_message' },
  ];

  /** The bindings as the table draws them, read straight off the settings: this
   * panel is a view of `user.settings.keybinds` and saving writes back into it,
   * which is all the wiring the keyer needs — it reads the same object on every
   * key press (lib/morse/keybinds.ts). */
  let bindings = $derived(
    ACTIONS.map(({ action, field }) => ({ action, field, keys: user.settings.keybinds[field] })),
  );

  type Row = (typeof bindings)[number];

  let editingField = $state<keyof Keybinds | null>(null);
  let dialogOpen = $state(false);

  /** what the popup is editing, tracked by field so that it follows the
   * settings rather than a copy of the row made when it opened */
  let editing = $derived<Binding | null>(
    bindings.find((b) => b.field === editingField) ?? null,
  );

  /** The keys the other actions hold. A key drives one action or the other, so
   * the popup has to keep these out of its picker as well as the ones the
   * binding being edited already has. */
  let takenElsewhere = $derived(
    bindings.filter((b) => b.field !== editingField).flatMap((b) => b.keys),
  );

  function edit(binding: Row) {
    editingField = binding.field;
    dialogOpen = true;
  }

  function save(keys: string[]) {
    if (editingField) {
      user.settings.keybinds[editingField] = keys;
    }
  }
</script>

<div class="controls keybindings {className}">
  <h2>Keybindings</h2>
  <div class="keybindings-table">
    {#each bindings as binding (binding.field)}
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

<KeybindingsDialog
  bind:open={dialogOpen}
  binding={editing}
  taken={takenElsewhere}
  onsave={save}
/>
