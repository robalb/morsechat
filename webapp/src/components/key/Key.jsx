import * as React from "react";
import styles from "./key.module.css";

import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import { useDispatch, useSelector } from "react-redux";
import { keyDown, keyUp, resetMessage } from "../../redux/chatSlice";
import { useSound } from "../../hooks/UseSound";
import { getInstance } from "../../socket/global.js";
import { normalizeKey } from "../../utils/keybinds.mjs";
import { createIambicKeyer } from "../../utils/iambicKeyer.mjs";

function getTimes(wpm) {
	if (wpm < 1) wpm = 1;
	if (wpm > 200) wpm = 200;
	const dotTime = Math.ceil(1200 / wpm);
	return {
		dot: dotTime,
		dash: dotTime * 3,
		elementGap: dotTime,
	};
}

function isEditableTarget(target) {
	if (!target || typeof target.tagName !== "string") return false;
	const tag = target.tagName.toLowerCase();
	if (tag === "input" || tag === "textarea" || tag === "select") return true;
	return Boolean(target.isContentEditable);
}

function KeyInternal() {
	const dispatch = useDispatch();

	const settings = useSelector((state) => state.user.settings);
	const keyMode = settings.key_mode;
	const keyFrequency = settings.key_frequency;
	const wpm = settings.wpm;
	const keyVolume = settings.volume_key;
	const leftIsDot = settings.left_is_dot;

	// Keep the latest settings available to timers and the window listeners
	// without re-registering them on every render.
	const settingsRef = React.useRef(settings);
	settingsRef.current = settings;

	const [on, off] = useSound(keyFrequency, keyVolume);
	const soundRef = React.useRef({ on, off });
	soundRef.current = { on, off };

	const dashReleaseTimer = React.useRef(null);

	function down() {
		soundRef.current.on();
		dispatch(keyDown());
		// Safety net: never leave the tone on if a keyup event is lost.
		clearTimeout(dashReleaseTimer.current);
		dashReleaseTimer.current = setTimeout(() => up(), 1500);
	}

	function up() {
		soundRef.current.off();
		dispatch(keyUp());
		clearTimeout(dashReleaseTimer.current);
		dashReleaseTimer.current = null;
	}

	// The keyer callbacks are routed through a ref so the state machine keeps
	// working across renders and always uses the latest sound/dispatch handlers.
	const callbacksRef = React.useRef(null);
	const keyerRef = React.useRef(null);
	callbacksRef.current = { onDown: down, onUp: up };
	if (keyerRef.current === null) {
		keyerRef.current = createIambicKeyer({
			getTimes: () => getTimes(settingsRef.current.wpm),
			onDown: () => callbacksRef.current.onDown(),
			onUp: () => callbacksRef.current.onUp(),
		});
	}

	function keyHandler({ key, event, repeat }) {
		const current = settingsRef.current;
		const keybinds = current.keybinds || {};
		const pressed = normalizeKey(key);

		const cancelKey = normalizeKey(keybinds.cancel_message);
		if (event === "down" && !repeat && cancelKey && pressed === cancelKey) {
			dispatch(resetMessage());
			if (getInstance()) getInstance().sendTyping(false);
			return true;
		}

		if (current.key_mode === "straight") {
			const straight = normalizeKey(keybinds.straight);
			const left = normalizeKey(keybinds.yambic_left);
			const right = normalizeKey(keybinds.yambic_right);
			if (
				pressed === " " ||
				(straight && pressed === straight) ||
				(left && pressed === left) ||
				(right && pressed === right)
			) {
				if (event === "up") up();
				else down();
				return true;
			}
		} else if (current.key_mode === "yambic") {
			const left = normalizeKey(keybinds.yambic_left);
			const right = normalizeKey(keybinds.yambic_right);
			const isLeftDot = Boolean(current.left_is_dot);
			if (left && pressed === left) {
				if (event === "up") keyerRef.current.paddleUp(isLeftDot);
				else keyerRef.current.paddleDown(isLeftDot);
				return true;
			}
			if (right && pressed === right) {
				if (event === "up") keyerRef.current.paddleUp(!isLeftDot);
				else keyerRef.current.paddleDown(!isLeftDot);
				return true;
			}
		}
		return false;
	}

	// The window listeners are registered once. handlerRef always points at the
	// handler from the latest render, so it sees current settings and keybinds.
	const handlerRef = React.useRef(null);
	handlerRef.current = keyHandler;

	React.useEffect(() => {
		function downHandler(e) {
			// anti-ch3at measure
			if (!e.isTrusted) return;
			// Don't transmit while typing in a form field.
			if (isEditableTarget(e.target)) return;
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			if (handlerRef.current({ key: e.key, event: "down", repeat: e.repeat }))
				e.preventDefault();
		}
		function upHandler(e) {
			// anti-ch3at measure
			if (!e.isTrusted) return;
			// Keyup is always processed so a key held while focus moves cannot
			// leave a tone or paddle stuck.
			if (handlerRef.current({ key: e.key, event: "up", repeat: e.repeat }))
				e.preventDefault();
		}
		window.addEventListener("keydown", downHandler);
		window.addEventListener("keyup", upHandler);
		return () => {
			window.removeEventListener("keydown", downHandler);
			window.removeEventListener("keyup", upHandler);
		};
	}, []);

	// Stop the keyer when leaving iambic mode or unmounting.
	const previousKeyMode = React.useRef(keyMode);
	React.useEffect(() => {
		const previous = previousKeyMode.current;
		previousKeyMode.current = keyMode;
		if (previous !== keyMode) keyerRef.current.stop();
	}, [keyMode]);

	React.useEffect(() => {
		return function cleanup() {
			clearTimeout(dashReleaseTimer.current);
			keyerRef.current.stop();
		};
	}, []);

	function mouseDown(e, isLeft) {
		e.stopPropagation();
		e.preventDefault();
		// anti-ch3at measure
		if (!e.isTrusted) return;
		if (keyMode === "straight") {
			down();
		} else if (keyMode === "yambic") {
			keyerRef.current.paddleDown(isLeft == leftIsDot);
		}
	}

	function mouseUp(e, isLeft) {
		e.stopPropagation();
		e.preventDefault();
		// anti-ch3at measure
		if (!e.isTrusted) return;
		if (keyMode === "straight") {
			up();
		} else if (keyMode === "yambic") {
			keyerRef.current.paddleUp(isLeft == leftIsDot);
		}
	}

	const leftButtonText = keyMode === "yambic" ? "dot" : "key";
	const rightButtonText = "dash";

	return (
		<>
			<button
				className={styles.key_bt}
				onTouchStart={(e) => mouseDown(e, true)}
				onTouchEnd={(e) => mouseUp(e, true)}
				onMouseDown={(e) => mouseDown(e, true)}
				onMouseUp={(e) => mouseUp(e, true)}
				onContextMenu={(e) => e.preventDefault()}
			>
				{leftButtonText}
			</button>

			{keyMode === "yambic" && (
				<button
					className={styles.key_bt}
					onTouchStart={(e) => mouseDown(e, false)}
					onTouchEnd={(e) => mouseUp(e, false)}
					onMouseDown={(e) => mouseDown(e, false)}
					onMouseUp={(e) => mouseUp(e, false)}
					onContextMenu={(e) => e.preventDefault()}
				>
					{rightButtonText}
				</button>
			)}
		</>
	);
}

export function Key({ className = "", leftButton, sheetBtHandler }) {
	if (leftButton === undefined) {
		//this is an invisible left button; it's purpose is to take the space
		//in the flex layout when there are no real defined left buttons
		leftButton = (
			<IconButton
				className={styles.settings_invisible}
				aria-label="disabled button"
			>
				<SettingsIcon />
			</IconButton>
		);
	}

	return (
		<div className={`${styles.key} ${className}`}>
			{leftButton}

			<KeyInternal />

			<IconButton aria-label="morse table" onClick={sheetBtHandler}>
				<LibraryBooksIcon />
			</IconButton>
		</div>
	);
}
