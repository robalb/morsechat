import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  /**
   * vitePreprocess hands `lang="ts"` blocks to esbuild, which strips the types
   * and emits js. There is no typescript compiler in this project on purpose:
   * types are documentation and editor support, never a build step.
   *
   * The consequence is the usual esbuild one: no `enum`, no `namespace`, no
   * parameter properties, and every type-only import must be written as
   * `import type { Foo } from './foo'`.
   */
  preprocess: vitePreprocess(),
};
