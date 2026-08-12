/**
 * Port of webapp/src/utils/chatDom.js.
 *
 * The chat log is written into the dom directly rather than rendered from
 * state: a received message is typed out one symbol at a time, at the sender's
 * own speed, and driving that through a reactive list would re-render the
 * whole log on every dot. So the socket owns that node, and these are the two
 * things it does to it.
 *
 * The react version takes a react ref and reaches into `.current`; these take
 * the node, which is what a svelte `bind:this` already gives you.
 */

/** how far from the bottom still counts as "reading the newest messages" */
const SCROLL_MARGIN = 60;

/**
 * Scrolls to the bottom of the log — but only if the user is already there.
 * Someone scrolled up reading older messages is not dragged back down by
 * traffic arriving under them.
 */
export function scrollDown(chat: HTMLElement | null) {
  if (!chat) return;
  const atBottom =
    chat.scrollTop > chat.scrollHeight - chat.clientHeight - SCROLL_MARGIN;
  if (atBottom) {
    chat.scrollTop = chat.scrollHeight;
  }
}

/**
 * Writes a status line into the log: connected to a channel, broadcast
 * failed, and so on.
 *
 * A bare `<p>` with no `data-signature`, which is what separates it from a
 * message — the stylesheet gives it no callsign column, and the click handler
 * of <Chat> does not offer to report it.
 */
export function systemMessage(chat: HTMLElement | null, msg: string) {
  if (!chat) return;
  const message = document.createElement('p');
  message.innerText = msg;
  chat.insertAdjacentElement('beforeend', message);
  scrollDown(chat);
}
