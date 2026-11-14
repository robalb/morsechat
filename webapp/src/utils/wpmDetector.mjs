/**
 * Automatic Morse speed detection for live keying.
 *
 * Morse timing is proportional to the length of one dot (the "unit"):
 *
 *   dot                 1 unit
 *   dash                3 units
 *   intra-character gap 1 unit
 *   inter-character gap 3 units
 *   word gap            7 units
 *
 * and, using the PARIS standard, `wpm = 1200 / unit_ms`.
 *
 * The live message buffer is an array of alternating tone/silence durations in
 * milliseconds, starting with a tone.
 *
 * `detectWpm` estimates one speed for the whole buffer. `analyzeLocalWpm`
 * estimates a separate unit for every element using a small window centred on
 * that element. The local estimate is what makes it possible to decode a
 * message whose speed changes while it is being keyed (for example starting
 * slowly and then accelerating).
 *
 * Equal durations are genuinely ambiguous (for example three 100 ms segments
 * can be a dot and two intra-character gaps, or a dash and two letter gaps).
 * In that case the configured WPM (and, for local analysis, the previous
 * element's estimate) acts only as a tie-breaker, so the live preview does not
 * jump between interpretations while the user is keying.
 */

const TONE_RATIOS = [1, 3];
const GAP_RATIOS = [1, 3, 7];

const DEFAULT_MIN_WPM = 5;
const DEFAULT_MAX_WPM = 50;
const DEFAULT_MIN_SAMPLES = 3;
const DEFAULT_MAX_RELATIVE_ERROR = 0.35;

// Local analysis uses a sliding window measured in samples (tones and gaps),
// not milliseconds, so it behaves the same at any speed. The window is centred
// on the element being decoded and decays older samples so a change of speed is
// picked up within a few elements.
const DEFAULT_LOCAL_WINDOW = 9;
const DEFAULT_LOCAL_DECAY = 0.8;

// Relative errors are capped so one long pause (for example a thinking pause
// that is longer than a word gap) cannot dominate the estimate.
const MAX_SCORED_ERROR = 0.5;
const OUTLIER_THRESHOLD = 0.35;
const OUTLIER_PENALTY = 0.25;

// Only used to make the fallback tie-breaker deterministic.
const FALLBACK_PENALTY = 1e-6;
const EPSILON = 1e-9;

/**
 * Estimate one keying speed from a live Morse timing buffer.
 *
 * @param {number[]} buffer alternating tone/silence durations in milliseconds
 * @param {object} [options]
 * @param {number} [options.fallbackWpm=12] configured speed, used to break ties
 * @param {number} [options.minWpm=5] lowest accepted speed
 * @param {number} [options.maxWpm=50] highest accepted speed
 * @param {number} [options.minSamples=3] minimum valid durations required
 * @param {number} [options.maxRelativeError=0.35] fit error above which no estimate is returned
 * @returns {{wpm: number, unit: number, confidence: number, samples: number, rms: number}|null}
 */
export function detectWpm(buffer, options = {}) {
	const { minSamples = DEFAULT_MIN_SAMPLES } = options;
	if (!Array.isArray(buffer)) return null;

	const samples = buildSamples(buffer);
	if (samples.length < minSamples) return null;

	return detectSamples(samples, options);
}

/**
 * Analyse a buffer element by element, returning a local unit for every index.
 * This is the function used by the live preview and by message playback, so a
 * message may change speed while it is being sent.
 *
 * The returned `units` array always has the same length as the input buffer.
 * Entries before the first reliable detection use the configured fallback.
 *
 * @param {number[]} buffer alternating tone/silence durations in milliseconds
 * @param {object} [options]
 * @param {number} [options.fallbackWpm=12] configured speed, used as the initial estimate and to break ties
 * @param {number} [options.minWpm=5] lowest accepted speed
 * @param {number} [options.maxWpm=50] highest accepted speed
 * @param {number} [options.minSamples=3] minimum valid durations required for a local estimate
 * @param {number} [options.maxRelativeError=0.35] fit error above which an element gets no local estimate
 * @param {number} [options.window=9] number of samples in the local window
 * @param {number} [options.decay=0.8] weight multiplier per sample of distance from the centre
 * @returns {{
 *   detections: Array<{wpm: number, unit: number, confidence: number, samples: number, rms: number}|null>,
 *   units: number[],
 *   minWpm: number,
 *   maxWpm: number,
 *   currentWpm: number,
 * }}
 */
export function analyzeLocalWpm(buffer, options = {}) {
	const {
		fallbackWpm = 12,
		minWpm = DEFAULT_MIN_WPM,
		maxWpm = DEFAULT_MAX_WPM,
		minSamples = DEFAULT_MIN_SAMPLES,
		maxRelativeError = DEFAULT_MAX_RELATIVE_ERROR,
		window = DEFAULT_LOCAL_WINDOW,
		decay = DEFAULT_LOCAL_DECAY,
	} = options;

	const fallback = clampWpm(fallbackWpm, minWpm, maxWpm);

	if (!Array.isArray(buffer)) {
		return {
			detections: [],
			units: [],
			minWpm: fallback,
			maxWpm: fallback,
			currentWpm: fallback,
		};
	}

	// Only valid durations take part in the fit. Keeping their original indices
	// preserves the tone/silence parity used by the Morse ratios.
	const validIndices = [];
	for (let index = 0; index < buffer.length; index++) {
		const duration = buffer[index];
		if (Number.isFinite(duration) && duration > 0) validIndices.push(index);
	}

	const detections = new Array(buffer.length).fill(null);
	let previousWpm = fallback;

	for (let position = 0; position < validIndices.length; position++) {
		const half = Math.floor(window / 2);
		let start = Math.max(0, position - half);
		const end = Math.min(validIndices.length, start + window);
		start = Math.max(0, end - window);

		const samples = [];
		for (let offset = start; offset < end; offset++) {
			const index = validIndices[offset];
			samples.push({
				duration: buffer[index],
				ratios: index % 2 === 0 ? TONE_RATIOS : GAP_RATIOS,
				weight: Math.pow(decay, Math.abs(offset - position)),
			});
		}
		if (samples.length < minSamples) continue;

		const detection = detectSamples(samples, {
			fallbackWpm: previousWpm,
			minWpm,
			maxWpm,
			minSamples,
			maxRelativeError,
		});
		if (detection) {
			detections[validIndices[position]] = detection;
			previousWpm = detection.wpm;
		}
	}

	// Fill every index with the nearest known unit so callers can decode the
	// buffer without handling nulls themselves.
	const fallbackUnit = 1200 / fallback;
	const units = new Array(buffer.length);
	let lastUnit = fallbackUnit;
	for (let index = 0; index < buffer.length; index++) {
		const detection = detections[index];
		if (detection) lastUnit = detection.unit;
		units[index] = lastUnit;
	}

	let minDetected = null;
	let maxDetected = null;
	let currentWpm = fallback;
	for (const detection of detections) {
		if (!detection) continue;
		if (minDetected === null || detection.wpm < minDetected) {
			minDetected = detection.wpm;
		}
		if (maxDetected === null || detection.wpm > maxDetected) {
			maxDetected = detection.wpm;
		}
		currentWpm = detection.wpm;
	}

	return {
		detections,
		units,
		minWpm: minDetected ?? fallback,
		maxWpm: maxDetected ?? fallback,
		currentWpm,
	};
}

/**
 * Convenience wrapper for UI code: return the detected WPM, or the configured
 * fallback when there is not enough reliable timing data yet.
 */
export function resolveWpm(buffer, fallbackWpm = 12, options = {}) {
	const result = detectWpm(buffer, { ...options, fallbackWpm });
	if (result) return result.wpm;
	return clampWpm(
		fallbackWpm,
		options.minWpm ?? DEFAULT_MIN_WPM,
		options.maxWpm ?? DEFAULT_MAX_WPM,
	);
}

function buildSamples(buffer) {
	const samples = [];
	for (let index = 0; index < buffer.length; index++) {
		const duration = buffer[index];
		if (!Number.isFinite(duration) || duration <= 0) continue;
		samples.push({
			duration,
			// The buffer always starts with a tone, so even indexes are tones
			// and odd indexes are silences, even if an invalid value is skipped.
			ratios: index % 2 === 0 ? TONE_RATIOS : GAP_RATIOS,
		});
	}
	return samples;
}

/**
 * Shared scoring core. Each sample carries the ratios it is allowed to have, so
 * the same code works for a whole buffer and for a local window.
 */
function detectSamples(samples, options = {}) {
	const {
		fallbackWpm = 12,
		minWpm = DEFAULT_MIN_WPM,
		maxWpm = DEFAULT_MAX_WPM,
		minSamples = DEFAULT_MIN_SAMPLES,
		maxRelativeError = DEFAULT_MAX_RELATIVE_ERROR,
	} = options;

	if (samples.length < minSamples) return null;

	const fallback = clampWpm(fallbackWpm, minWpm, maxWpm);
	const fallbackUnit = 1200 / fallback;
	const minUnit = 1200 / maxWpm;
	const maxUnit = 1200 / minWpm;

	// Candidate units are all observed durations divided by every ratio that
	// duration is allowed to have. The correct unit is always among them.
	const candidates = new Map();
	for (const sample of samples) {
		for (const ratio of sample.ratios) {
			const unit = sample.duration / ratio;
			if (unit < minUnit * 0.9 || unit > maxUnit * 1.1) continue;
			// Deduplicate near-identical candidates to keep scoring cheap.
			const key = Math.round(unit * 1000) / 1000;
			candidates.set(key, unit);
		}
	}
	if (candidates.size === 0) return null;

	let best = null;
	const scoredCandidates = [];

	for (const unit of candidates.values()) {
		let sumSquares = 0;
		let outliers = 0;
		let weightSum = 0;

		for (const sample of samples) {
			const weight = sample.weight ?? 1;
			let relativeError = Infinity;
			for (const ratio of sample.ratios) {
				const expected = ratio * unit;
				const error = Math.abs(sample.duration - expected) / expected;
				if (error < relativeError) relativeError = error;
			}

			if (relativeError > OUTLIER_THRESHOLD) outliers += weight;
			const scored = Math.min(relativeError, MAX_SCORED_ERROR);
			sumSquares += scored * scored * weight;
			weightSum += weight;
		}

		const rms = Math.sqrt(sumSquares / weightSum);
		const score =
			rms +
			(outliers / weightSum) * OUTLIER_PENALTY +
			FALLBACK_PENALTY * Math.abs(Math.log(unit / fallbackUnit));

		const candidate = { unit, score, rms };
		scoredCandidates.push(candidate);
		if (!best || score < best.score - EPSILON) {
			best = candidate;
		}
	}

	if (!best || best.rms > maxRelativeError) return null;

	const bestWpm = clampWpm(1200 / best.unit, minWpm, maxWpm);
	// Only a candidate that produces a different integer WPM is a genuine
	// alternative interpretation. Near-identical units caused by timing jitter
	// must not make a clean detection look ambiguous.
	let secondBestScore = Infinity;
	for (const candidate of scoredCandidates) {
		if (clampWpm(1200 / candidate.unit, minWpm, maxWpm) === bestWpm) continue;
		if (candidate.score < secondBestScore) secondBestScore = candidate.score;
	}

	const fitConfidence = Math.max(0, 1 - best.rms / maxRelativeError);
	const ambiguity = Number.isFinite(secondBestScore)
		? Math.max(0, 1 - Math.max(0, secondBestScore - best.score) / 0.1)
		: 0;
	const confidence = clamp01(fitConfidence * (1 - ambiguity * 0.5));

	return {
		wpm: bestWpm,
		unit: best.unit,
		confidence,
		samples: samples.length,
		rms: best.rms,
	};
}

function clamp01(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

function clampWpm(wpm, minWpm, maxWpm) {
	if (!Number.isFinite(wpm)) return minWpm;
	return Math.min(maxWpm, Math.max(minWpm, Math.round(wpm)));
}
