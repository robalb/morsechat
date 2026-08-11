/** A tiny `--flag value` / `--flag` / positional parser. No dependencies. */
export function parseArgs(argv, { defaults = {}, booleans = [] } = {}) {
	const opts = { ...defaults };
	const positional = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith("--")) {
			positional.push(arg);
			continue;
		}
		const eq = arg.indexOf("=");
		const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
		if (booleans.includes(name)) {
			opts[name] = eq === -1 ? true : argv[i].slice(eq + 1) !== "false";
			continue;
		}
		if (eq !== -1) {
			opts[name] = arg.slice(eq + 1);
		} else {
			opts[name] = argv[++i];
		}
	}

	return { opts, positional };
}
