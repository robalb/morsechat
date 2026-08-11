<script lang="ts">
  /** Port of the KeybindingsControls export of webapp/src/components/controls/controls.jsx */
  import './controls.css';

  let { class: className = '' }: { class?: string } = $props();
</script>

<div class="controls keybindings {className}">
  <h2>Keybindings</h2>
  <p>straight key SPACE, C</p>
  <p>left paddle Z</p>
  <p>right paddle X</p>
</div>
