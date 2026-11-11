import * as React from "react";
import ctx from "../utils/soundCtx";

export function useSound(note = 880, volume = 100) {
	//setting the gain to zero crashes everything, this is a workaround
	const baseVolume = 0.0000001;
	if (volume < 0) volume = 0;
	if (volume > 100) volume = 100;
	volume = (volume + baseVolume) / 100;

	let [g, setG] = React.useState(null);
	const [o, setO] = React.useState(null); // store oscillator
	let [isOn, setIsOn] = React.useState(false);
	// Refs keep the on/off callbacks correct even when they are called from an
	// effect cleanup that was registered before the oscillator was created.
	const gainRef = React.useRef(null);
	const oscillatorRef = React.useRef(null);

	//update the volume in real time
	React.useEffect(() => {
		if (isOn && g) g.gain.setValueAtTime(volume, ctx.currentTime);
	}, [volume, g, isOn]);

	// update frequency in real time
	React.useEffect(() => {
		if (isOn && o) {
			o.frequency.setValueAtTime(note, ctx.currentTime);
		}
	}, [note, o, isOn]);

	//initialize the audio context - in chrome this will throw a warning
	//because user action is required but it still works
	React.useEffect(() => {
		//https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
		let oscillator = ctx.createOscillator();
		oscillator.frequency.value = note;
		oscillator.type = "triangle";
		let gain = ctx.createGain();
		oscillator.connect(gain);
		gain.connect(ctx.destination);
		oscillatorRef.current = oscillator;
		gainRef.current = gain;
		setO(oscillator);
		setG(gain);

		gain.gain.setValueAtTime(baseVolume, ctx.currentTime);
		oscillator.start();

		return () => {
			// React 18 StrictMode mounts, cleans up, and mounts again. The
			// cleanup can run before the state updates above are committed, so
			// only touch nodes that actually exist.
			if (oscillatorRef.current) {
				oscillatorRef.current.disconnect();
				oscillatorRef.current = null;
			}
			if (gainRef.current) {
				gainRef.current.disconnect();
				gainRef.current = null;
			}
		};
	}, []);

	return [
		function on() {
			const gain = gainRef.current;
			if (!gain) return;
			if (ctx.state != "running") {
				ctx.resume();
			}
			setIsOn(true);
			gain.gain.setValueAtTime(volume, ctx.currentTime);
		},
		function off() {
			const gain = gainRef.current;
			if (!gain) return;
			if (ctx.state == "running") {
				setIsOn(false);
				gain.gain.setValueAtTime(baseVolume, ctx.currentTime);
			}
		},
	];
}
