import ctx from "./soundCtx";

/**
 * calculates a note frequency based on the userId
 *
 * - The goal is to assign by default a specific
 *   frequency to every user, so that users will
 *   be recognizable by frequency.
 *
 * @returns {integer} - a note frequency
 */
export function getFreqencyFromCallsign(callsign) {
	//C minor pentathonic scale
	const poolAm = [
		220, // A3
		261,
		329,
		392,
		440,
	];
	//c major pentathonic scale
	const poolAM = [
		261, // C4
		293,
		329,
		392,
		440,
	];
	//select the penthatonic scale
	const poolBase = poolAM;
	//generate the pool of available frequencies
	const pool = [
		...poolBase, //octave 4
		...poolBase.map((f) => f * 2), //octave 5
		...poolBase.slice(0, 2).map((f) => f * 4), //octave 6
	];
	// let i = Math.floor(Math.random() * pool.length)
	function hashCode(s) {
		return s.split("").reduce((a, b) => {
			a = (a << 5) - a + b.charCodeAt(0);
			return a & a;
		}, 0);
	}
	const i = Math.abs(hashCode(callsign) % pool.length);
	return pool[i];
}

/**
 * Manages the receiver sound for a specific userId
 *
 * depends on the global audio context: it should exist as variable named ctx
 */
export default class ReceiverSound {
	/**
	 * The default behaviour for the sound volume of messages from
	 * disconnected user
	 */
	playSoundForDisconnectedUsers = false;

	/**
	 *
	 * @param {String} uid       - the user id of the message we are reproducing
	 * @param {*} volumeRef      - a React.useRef() pointing to the settings.volume_receiver useSelector value
	 *                             This class is expected to be used from within callbacks,
	 *                             where a simple reference to useSelector would remain outdated
	 * @param {*} onlineUsersRef - a React.useRef() pointing to the chat.onlineUsers useSelector value
	 *                             This class is expected to be used from within callbacks,
	 *                             where a simple reference to useSelector would remain outdated
	 */
	constructor(uid, volumeRef, onlineUsersRef, frequency) {
		this.uid = uid;
		this.volumeRef = volumeRef;
		this.onlineUsersRef = onlineUsersRef;
		this.baseVolume = 0.0000001;
		this.lastKnownPermision = this.playSoundForDisconnectedUsers;
		this.frequency = frequency;
		if (this.frequency === 0) {
			this.frequency = 400;
		}
		let o = ctx.createOscillator();
		o.frequency.value = this.frequency;
		o.type = "triangle";
		let g = ctx.createGain();
		o.connect(g);
		g.connect(ctx.destination);
		g.gain.setValueAtTime(this.baseVolume, ctx.currentTime);
		o.start();
		this.g = g;
	}

	/**
	 * Start the sound
	 */
	on() {
		//if sound is disabled for this specific user or message
		if (!this.#getSoundPermissions()) return;
		let volume = this.volumeRef.current;
		if (volume < 0) volume = 0;
		if (volume > 100) volume = 100;
		const highVolume = (volume + this.baseVolume) / 100;
		this.g.gain.setValueAtTime(highVolume, ctx.currentTime);
	}

	/**
	 * Stops the sound
	 */
	off() {
		this.g.gain.setValueAtTime(this.baseVolume, ctx.currentTime);
	}

	/**
	 * disconnect this specific sound instance from the audiocontext,
	 * allowing garbage collection
	 * @todo - test
	 */
	disconnect() {
		this.g.disconnect();
	}

	#getSoundPermissions() {
		let online = this.onlineUsersRef.current;
		//if the user is disconnected we cannot access its allowSound property,
		//so we use the last known permission, or the default value
		if (!online.hasOwnProperty(this.uid)) return this.lastKnownPermision;
		//access user allowSound
		let permission = online[this.uid].allowSound;
		this.lastKnownPermision = permission;
		return permission;
	}
}
