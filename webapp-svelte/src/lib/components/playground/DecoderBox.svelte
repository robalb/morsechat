<script lang="ts">
  /**
   * One algorithm's reading of the message being keyed.
   *
   * It is the chat's <Preview /> with the two things that belong to sending
   * turned off — there is no countdown here and nothing to cancel — and the
   * algorithm's name above it. Reusing the real preview rather than drawing a
   * box is deliberate: what is being judged is how a decoder looks to someone
   * keying into the actual chat, and a mockup with different type and different
   * wrapping would not answer that.
   */
  import Preview from '$lib/components/preview/Preview.svelte';
  import type { Slot } from '$lib/playground/engine.svelte';

  let { slot }: { slot: Slot } = $props();
</script>

<div class="decoder">
  <div class="head">
    <span class="name">{slot.name}</span>
    <span class="description">{slot.description}</span>
  </div>
  <Preview class="box" source={slot} showProgress={false} showClear={false} />
</div>

<style>
  .decoder {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .name {
    font-size: 0.9rem;
    font-weight: 500;
  }
  .description {
    font-size: 0.75rem;
    opacity: 0.55;
  }
  /* the class lands on <Preview />, which is a child component, so a scoped
   * rule cannot reach it */
  .decoder :global(.box) {
    border-radius: 3px;
    box-shadow: var(--shadow-1);
    /* two lines of message, so that a box does not change height under the
     * ones below it every time a word wraps */
    min-height: 3.2rem;
    display: flex;
    align-items: center;
    padding: 0.4rem 0;
  }
  .decoder :global(.box .text) {
    margin-right: 1rem;
  }
</style>
