/**
 * Move an element to the end of <body>, and take it away again when the
 * component that declared it is destroyed.
 *
 * MUI renders every <Dialog> through a <Portal>, so a react popup is a child of
 * <body> no matter which component opened it. SMUI has no such thing: the
 * dialog stays where it is written, and the app layout then applies to it.
 * `main .grid-side` and `main .grid-chat` are both `z-index: 2`, which makes
 * each grid area a stacking context — so a dialog declared inside the online
 * list is painted *under* the chat beside it, however high its own z-index is,
 * and comes out as a sliver in the gap between the two columns.
 *
 * Dialogs that AppLayout mounts itself (settings, auth) sit outside the grid
 * already and do not need this. The ones a grid component owns do.
 */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}
