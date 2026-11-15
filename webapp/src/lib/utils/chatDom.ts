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
