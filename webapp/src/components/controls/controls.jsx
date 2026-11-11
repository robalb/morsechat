import Select from "@mui/material/Select";
import * as React from "react";
import Slider from "@mui/material/Slider";
import MenuItem from "@mui/material/MenuItem";
import { useSelector, useDispatch } from "react-redux";
import { updateSettings } from "../../redux/userSlice";
import { selectChannelMorseOnly } from "../../redux/chatSlice";
import styles from "./controls.module.css";
import { useSnackbar } from "notistack";

import { useStateDep } from "../../hooks/useStateDep";
import { Alert, Button, Switch } from "@mui/material";
import {
	defaultKeybinds,
	isBindableKey,
	keyLabel,
	keybindLabels,
	normalizeKey,
} from "../../utils/keybinds.mjs";

import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import { dialects } from "../../utils/dialects";
/**
 * TODO: rename this file and its parent folder into controls
 */

/**
 * this complicated contraption is here to prevent a rerender of every slider
 * every time there is a settings change.
 * Additionally, for optimal performance onChangeCommitted must be passed through useCallback
 */
const MemoSlider = React.memo(function CustomSlider({
	value,
	onChangeCommitted,
	...props
}) {
	let [val, setVal] = useStateDep(value);
	return (
		<Slider
			value={val}
			onChange={(e) => {
				setVal(e.target.value);
			}}
			onChangeCommitted={onChangeCommitted}
			{...props}
		/>
	);
});

const MemoSwitch = React.memo(Switch);

export function SideControls({ className = "", settingsButton = "" }) {
	const { enqueueSnackbar } = useSnackbar();
	const dispatch = useDispatch();
	let settings = useSelector((state) => state.user.settings);
	let morseOnly = useSelector(selectChannelMorseOnly);

	function update(data) {
		dispatch(updateSettings(data))
			.unwrap()
			// .then(e => {
			//     if (e.type == "api/call/rejected")
			//         enqueueSnackbar("your settings could not be saved " + e.payload.error, { variant: "error", preventDuplicate: true })
			// })
			.catch((e) => {});
	}

	return (
		<div className={`${styles.controls} ${className}`}>
			<h2>Controls</h2>
			<p>wpm</p>
			<MemoSlider
				size="small"
				value={settings.wpm}
				aria-label="Default"
				valueLabelDisplay="auto"
				min={5}
				max={50}
				onChangeCommitted={React.useCallback((e, v) => update({ wpm: v }), [])}
			/>

			<p>receiver volume</p>
			<MemoSlider
				size="small"
				value={settings.volume_receiver}
				aria-label="Default"
				valueLabelDisplay="auto"
				onChangeCommitted={React.useCallback(
					(e, v) => update({ volume_receiver: v }),
					[],
				)}
			/>

			<p>key volume</p>
			<MemoSlider
				size="small"
				value={settings.volume_key}
				aria-label="Default"
				valueLabelDisplay="auto"
				onChangeCommitted={React.useCallback(
					(e, v) => update({ volume_key: v }),
					[],
				)}
			/>

			<div>
				<p>
					show letters
					{morseOnly && (
						<span className={styles.forcedOff}> (always off in this channel)</span>
					)}
				</p>
				<MemoSwitch
					checked={!morseOnly && settings.show_readable}
					disabled={morseOnly}
					color="secondary"
					onChange={React.useCallback(
						(e) => update({ show_readable: e.target.checked }),
						[],
					)}
				/>
			</div>

			{settingsButton}
		</div>
	);
}

export function AdvancedControls({ className = "" }) {
	const dispatch = useDispatch();
	let settings = useSelector((state) => state.user.settings);
	function update(data) {
		dispatch(updateSettings(data));
	}
	return (
		<div className={`${styles.controls} ${className}`}>
			<h2>Advanced settings</h2>
			<p>submit delay</p>
			<MemoSlider
				size="small"
				value={settings.submit_delay}
				aria-label="Default"
				valueLabelDisplay="auto"
				min={5}
				max={50}
				onChangeCommitted={React.useCallback(
					(e, v) => update({ submit_delay: v }),
					[],
				)}
			/>
			<p>key frequency</p>
			<MemoSlider
				size="small"
				value={settings.key_frequency}
				aria-label="Default"
				valueLabelDisplay="auto"
				min={200}
				max={1000}
				onChangeCommitted={React.useCallback(
					(e, v) => update({ key_frequency: v }),
					[],
				)}
			/>
			<p>key mode</p>
			<RadioGroup
				row
				aria-labelledby="demo-controlled-radio-buttons-group"
				name="controlled-radio-buttons-group"
				value={settings.key_mode}
				onChange={(e) => update({ key_mode: e.target.value })}
			>
				<FormControlLabel
					value="straight"
					control={<Radio />}
					label="straight"
				/>
				<FormControlLabel value="yambic" control={<Radio />} label="iambic A" />
			</RadioGroup>
			<p style={{ marginTop: "1rem" }}>iambic paddle order</p>
			<div>
				<p>left is dit</p>
				<MemoSwitch
					checked={!settings.left_is_dot}
					color="primary"
					onChange={React.useCallback(
						(e) => update({ left_is_dot: !e.target.checked }),
						[],
					)}
				/>
				<p>right is dit</p>
			</div>
		</div>
	);
}

export function KeybindingsControls({ className }) {
	const dispatch = useDispatch();
	const settings = useSelector((state) => state.user.settings);
	const keybinds = settings.keybinds || defaultKeybinds;
	const [capturing, setCapturing] = React.useState(null);
	const [error, setError] = React.useState("");

	function update(data) {
		dispatch(updateSettings(data)).unwrap().catch(() => {});
	}

	// While capturing, listen in the capture phase and stop the event before
	// the Morse key handler on window sees it. Otherwise pressing the new key
	// would also transmit a dot/dash.
	React.useEffect(() => {
		if (!capturing) return;

		function downHandler(e) {
			e.stopPropagation();
			if (typeof e.stopImmediatePropagation === "function")
				e.stopImmediatePropagation();
			if (e.key === "Escape") {
				e.preventDefault();
				setCapturing(null);
				setError("");
				return;
			}
			if (e.repeat) return;
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			const key = normalizeKey(e.key);
			if (key === " ") {
				// Space already has a fixed meaning: it is always a straight key.
				// Binding it to another action would make that guarantee false.
				e.preventDefault();
				setError("Space is reserved for the straight key.");
				return;
			}
			if (!isBindableKey(key)) {
				setError("Use a single printable character.");
				return;
			}
			const conflict = Object.entries(keybinds).find(
				([name, value]) =>
					name !== capturing && normalizeKey(value) === key,
			);
			if (conflict) {
				setError(
					`${keyLabel(key)} is already bound to ${
						keybindLabels[conflict[0]] || conflict[0]
					}.`,
				);
				return;
			}
			e.preventDefault();
			update({ keybinds: { ...keybinds, [capturing]: key } });
			setCapturing(null);
			setError("");
		}

		function upHandler(e) {
			e.stopPropagation();
			if (typeof e.stopImmediatePropagation === "function")
				e.stopImmediatePropagation();
		}

		window.addEventListener("keydown", downHandler, true);
		window.addEventListener("keyup", upHandler, true);
		return () => {
			window.removeEventListener("keydown", downHandler, true);
			window.removeEventListener("keyup", upHandler, true);
		};
	}, [capturing, keybinds]);

	function resetKeybinds() {
		setCapturing(null);
		setError("");
		update({ keybinds: { ...defaultKeybinds } });
	}

	return (
		<div className={`${styles.controls} ${styles.keybindings} ${className}`}>
			<h2>Keybindings</h2>
			<p className={styles.keybindHelp}>
				Click a binding, then press the key you want. Escape cancels.
				Space is always available as a straight key in straight mode.
			</p>
			{error && (
				<Alert severity="error" sx={{ mt: 1, mb: 1 }}>
					{error}
				</Alert>
			)}
			{Object.keys(keybindLabels).map((name) => (
				<div className={styles.keybindRow} key={name}>
					<span>{keybindLabels[name]}</span>
					<Button
						size="small"
						variant={capturing === name ? "contained" : "outlined"}
						onClick={() => {
							setCapturing(name);
							setError("");
						}}
					>
						{capturing === name
							? "Press a key..."
							: keyLabel(keybinds[name])}
					</Button>
				</div>
			))}
			<Button size="small" variant="text" onClick={resetKeybinds}>
				Reset to defaults
			</Button>
		</div>
	);
}

export function DialectControls({ className }) {
	const dispatch = useDispatch();
	let settings = useSelector((state) => state.user.settings);
	function update(data) {
		dispatch(updateSettings(data));
	}
	return (
		<div className={`${styles.controls} ${styles.dialects} ${className}`}>
			<Select
				id="dialect-select"
				value={settings.dialect}
				onChange={(e) =>
					update({
						dialect: e.target.value,
					})
				}
			>
				{Object.keys(dialects).map((name, i) => (
					<MenuItem value={name} key={i} name={dialects[name].name}>
						{dialects[name].name}
					</MenuItem>
				))}
			</Select>
		</div>
	);
}
