<script lang="ts">
  /**
   * Port of the KeybindingsControls export of
   * webapp/src/components/controls/controls.jsx.
   *
   * The react panel is three bare <p>s — "straight key SPACE, C" — with the key
   * names sitting in the sentence. Here the same three bindings are a table:
   * one row per action, the action on the left, its keys on the right as <kbd>
   * caps, which is the shape a shortcut list is usually read in.
   */
  import './controls.css';

  let { class: className = '' }: { class?: string } = $props();

  const bindings: { action: string; keys: string[] }[] = [
    { action: 'straight key', keys: ['space', 'c'] },
    { action: 'left paddle', keys: ['z'] },
    { action: 'right paddle', keys: ['x'] },
    { action: 'transmit', keys: ['w'] },
    { action: 'cancel message', keys: ['p'] },
  ];
</script>

<div class="controls keybindings {className}">
  <h2>Keybindings</h2>
  <!-- a <dl>, not a <table>: these are term/description pairs, and a screen
       reader reads them as such without needing a header row that the layout
       does not draw. -->
  <dl class="bindings">
    {#each bindings as { action, keys } (action)}
      <div class="binding">
        <dt>{action}</dt>
        <dd>
          {#each keys as key (key)}
            <kbd>{key}</kbd>
          {/each}
        </dd>
      </div>
    {/each}
  </dl>
</div>

<style>
  .bindings {
    margin: 0.6rem 0 0 0;
  }

  /* One row per binding, ruled off from the next. The rule is the same
   * hairline the dialog draws under its title, so the table reads as part of
   * the same card. */
  .binding {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 2.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  .binding:first-child {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }

  .binding dt {
    /* the <p>s this replaces carry the panel's text colour and nothing else */
    margin: 0;
  }
  .binding dd {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  /* The keycap. A light grey hairline all round with a thicker bottom edge, so
   * the box reads as a key seen slightly from above — the usual shortcut
   * indicator. The bottom border is part of the box, so the cap is padded one
   * pixel less at the bottom to keep the glyph centred. */
  kbd {
    display: inline-block;
    min-width: 1.1em;
    padding: 2px 6px 1px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-bottom-width: 3px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--gray-105, #fff);
    font-family: 'Roboto', 'Arial', sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.05em;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
  }
</style>
