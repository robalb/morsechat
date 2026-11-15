<script lang="ts">
  import { tick, untrack } from 'svelte';

  import Dialog, { Actions, Content, Title } from '@smui/dialog';
  import Button, { Label } from '@smui/button';
  import IconButton from '@smui/icon-button';

  import '../dialog/dialog.css';
  import './keybindings.css';
  import { portal } from '$lib/utils/portal';
  import { keyOptions, type Binding } from './keybindings';

  let {
    open = $bindable(false),
    binding = null,
    taken = [],
    onsave,
  }: {
    open?: boolean;
    binding?: Binding | null;
    /** keys bound to the other actions, which this one cannot take */
    taken?: string[];
    onsave?: (keys: string[]) => void;
  } = $props();

  /** Mounted while it is on screen and shown a tick later, as User.svelte is —
   * the reasons are spelled out there. */
  let mounted = $state(false);
  let shown = $state(false);
  $effect(() => {
    if (open) {
      mounted = true;
      tick().then(() => {
        if (open) {
          shown = true;
        }
      });
    } else {
      shown = false;
    }
  });

  function onClosed() {
    open = false;
    mounted = false;
  }

  /** The keys being edited, and the ones the popup was opened on. Both are
   * copies: nothing reaches the panel until `save changes`. */
  let draft = $state<string[]>([]);
  let original = $state<string[]>([]);

  $effect(() => {
    // reset whenever the popup opens on a binding; the keys themselves are read
    // untracked, so saving — which writes them through the panel — does not
    // reset the draft under the closing dialog.
    if (open && binding) {
      untrack(() => {
        draft = [...binding!.keys];
        original = [...binding!.keys];
        pickerOpen = false;
      });
    }
  });

  let dirty = $derived(
    draft.length !== original.length ||
      draft.some((key, i) => key !== original[i]),
  );
  /** A binding with no keys at all cannot be saved: the action would have no
   * way to be triggered. Undo — or the close button — is the way out of that
   * state. */
  let canSave = $derived(dirty && draft.length > 0);

  /** the whole keyboard, with the keys of this binding and of the others marked
   * as taken; the picker greys those out rather than dropping them, so the
   * layout of the keys does not shift as they are added and removed */
  let options = $derived(keyOptions([...draft, ...taken]));
  let canAdd = $derived(options.some((o) => !o.taken));

  function remove(key: string) {
    draft = draft.filter((k) => k !== key);
  }

  function add(letter: string) {
    draft = [...draft, letter];
    closePicker();
  }

  function save() {
    onsave?.([...draft]);
    open = false;
  }

  /** The letter picker: a panel in the place of the add button rather than an
   * mdc menu, which would want an anchor of its own inside a dialog that is
   * already a focus trap. It closes on a pick or on escape — there is nothing
   * else in the card it can be in the way of. */
  let pickerOpen = $state(false);
  let picker: HTMLDivElement | null = $state(null);
  let addBt: HTMLButtonElement | null = $state(null);

  /** The button hands its place — and its focus — to the letters. Without this
   * the keyboard would be left on an element that no longer exists, which is
   * the one thing a disclosure that replaces its own trigger has to take care
   * of. The scroll comes with it: the panel opens at the bottom of a list that
   * may already be scrolled past the end of the card. */
  $effect(() => {
    if (!picker) return;
    picker.scrollIntoView({ block: 'nearest' });
    picker.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  });

  /** and takes it back when they close */
  function closePicker() {
    pickerOpen = false;
    tick().then(() => addBt?.focus());
  }

  /** Escape, taken on the window in the capture phase and kept from going any
   * further. mdc listens for it on the *document*, one listener per dialog, so
   * the un-intercepted key closes this popup and the settings dialog under it
   * in the same breath — and while the picker is open it should close neither.
   * Stopping it here, before either listener runs, leaves escape doing one
   * thing at a time. */
  function onWindowKeydown(event: KeyboardEvent) {
    if (!mounted || event.key !== 'Escape') return;
    event.stopPropagation();
    if (pickerOpen) {
      closePicker();
    } else {
      open = false;
    }
  }
</script>

<svelte:window onkeydowncapture={onWindowKeydown} />

{#if mounted}
  <!-- portaled to <body>: this popup is opened from inside the settings
       dialog, which is a stacking context of its own. See lib/utils/portal.ts -->
  <Dialog
    bind:open={shown}
    use={[portal]}
    onSMUIDialogClosed={onClosed}
    class="mui-dialog keybindings-dialog"
    aria-labelledby="keybindings-title"
  >
    <Title id="keybindings-title">
      <IconButton
        class="material-icons"
        aria-label="close"
        onclick={() => (open = false)}>close</IconButton
      > Edit keybindings
    </Title>
    <Content>
      <p class="binding-name">{binding?.action ?? ''}</p>
      <div class="keybindings-table">
        {#each draft as key (key)}
          <div class="binding-row">
            <kbd>{key}</kbd>
            <IconButton
              class="material-icons"
              aria-label="remove the {key} key"
              onclick={() => remove(key)}>close</IconButton
            >
          </div>
        {/each}
        {#if draft.length === 0}
          <!-- the empty table would otherwise be a single rule above the add
               button, with nothing to say why saving is refused -->
          <div class="binding-row empty">no keys bound</div>
        {/if}
        <!-- The add button and the letters take the same place, one at a time:
             the button is the summary of a disclosure and the grid is its
             details. The button is not a row of the table — it closes the list
             rather than continuing it — so it draws no rule of its own. -->
        {#if pickerOpen}
          <!-- The panel opens *into* the table rather than over it: the dialog
               content is a scroll container, so an absolutely positioned menu
               hanging off the last row is clipped by it. -->
          <div
            class="picker"
            role="listbox"
            aria-label="available keys"
            bind:this={picker}
          >
            {#each options as { key, taken: isTaken } (key)}
              <button
                role="option"
                class:wide={key === 'space'}
                aria-selected="false"
                aria-label={isTaken ? `${key}, already in use` : key}
                aria-disabled={isTaken}
                disabled={isTaken}
                title={isTaken ? 'already in use' : undefined}
                onclick={() => add(key)}
              >
                <kbd>{key}</kbd>
              </button>
            {/each}
          </div>
        {:else}
          <div class="add-row">
            <button
              class="add-bt"
              bind:this={addBt}
              aria-haspopup="listbox"
              disabled={!canAdd}
              onclick={() => (pickerOpen = true)}
            >
              <span class="material-icons" aria-hidden="true">add</span>
              add new shortcut
            </button>
          </div>
        {/if}
      </div>
    </Content>
    <Actions>
      <Button action={null} variant="raised" disabled={!canSave} onclick={save}>
        <Label>Save changes</Label>
      </Button>
    </Actions>
  </Dialog>
{/if}

<style>
  /* The name of the binding under the title. */
  .binding-name {
    margin: 0.5rem 0 0 0;
    font-size: 1rem;
    font-weight: 500;
  }

  /* The table is the panel's (keybindings.css); what differs here is that a row
   * holds one key and a button to drop it, so the caps sit on the left. */
  :global(.keybindings-dialog .keybindings-table) {
    min-width: 15rem;
  }
  /* mdc's icon button is a 48px box, which would set the row height; the delete
   * button is the same 40px MUI's is in the ported popups. */
  :global(.keybindings-dialog .keybindings-table .mdc-icon-button) {
    width: 40px;
    height: 40px;
    padding: 8px;
    border-radius: 50%;
    color: #fafafa;
    font-size: 20px;
    --mdc-icon-size: 20px;
  }

  .empty {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.875rem;
  }

  /* The add row. It is not a .binding-row: it closes the table rather than
   * continuing it, so it carries the row's height and centring but none of its
   * rules — a line under the last thing in the card made it look like an entry
   * with its key missing. */
  .add-row {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.25rem;
  }
  .add-bt {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 0.6rem;
    border: 0;
    border-radius: 4px;
    background: none;
    color: var(--gray-105, #fff);
    font-family: 'Roboto', 'Arial', sans-serif;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .add-bt:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
  .add-bt:disabled {
    color: rgba(255, 255, 255, 0.3);
    cursor: default;
  }
  .add-bt .material-icons {
    font-size: 18px;
  }

  /* The picker. Drawn on a surface a shade lighter than the dialog's, so it
   * still reads as a menu, and it scrolls once the letters run past its own
   * height. */
  .picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2rem, 1fr));
    gap: 0.25rem;
    max-height: 9rem;
    overflow-y: auto;
    margin: 0.5rem 0 0 0;
    padding: 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
  }
  .picker button {
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
  /* space is the one key here whose name does not fit a cell of the grid, so it
   * takes two — enough for the word, and it stays in line with the letters. */
  .picker button.wide {
    grid-column: span 2;
  }
  .picker button.wide kbd {
    display: block;
    /* the word fills its two cells almost exactly; the tracking the other caps
     * carry is what would tip it over the edge in a fallback font */
    letter-spacing: normal;
  }
  .picker button:hover:not(:disabled) kbd,
  .picker button:focus-visible kbd {
    background: rgba(255, 255, 255, 0.2);
  }
  /* a key that is already bound, here or to another action. It keeps its place
   * in the grid, dimmed — the cap's own colours are what fade, so it still
   * reads as a key rather than as a hole in the keyboard. */
  .picker button:disabled {
    cursor: default;
  }
  .picker button:disabled kbd {
    border-color: rgba(255, 255, 255, 0.12);
    background: none;
    color: rgba(255, 255, 255, 0.3);
  }
</style>
