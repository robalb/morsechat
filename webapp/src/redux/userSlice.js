import {
	createSlice,
	createAsyncThunk,
	createSelector,
} from "@reduxjs/toolkit";

import { getFreqencyFromCallsign } from "../utils/ReceiverSound.js";

import createDebouncedAsyncThunk from "../utils/createDebouncedAsyncThunk";
import { defaultKeybinds, mergeKeybinds } from "../utils/keybinds.mjs";
import { wpmToMorseTimes } from "../utils/morse.mjs";

export { wpmToMorseTimes };

import { apiCall, payloadCreatorCreator } from "./apiSlice";

import { fetchAllData } from "./apiSlice";

export const loginUser = createAsyncThunk(
	"/login",
	payloadCreatorCreator("login"),
);

export const registerUser = createAsyncThunk(
	"/register",
	payloadCreatorCreator("register"),
);

export const logoutUser = createAsyncThunk(
	"/logout",
	payloadCreatorCreator("logout"),
);

/**
 * thunk updateSettings
 * dispatch this to update the settings
 * it will immediately update the settings locally (into the store)
 * and after a debounce time will update the settings remotely (api call)
 */
export const updateSettings = createAsyncThunk(
	"user/updateSettings",
	async (data, { getState, dispatch, rejectWithValue, signal }) => {
		dispatch(userSlice.actions.updateSettingsLocal(data));
		const logged = getState().user.authenticated;
		if (logged === true) return await dispatch(updateSettingsRemote()).unwrap();
	},
);

/**
 * this thunk is used internally by updateSettings
 * see updateSettings for more info
 */
const updateSettingsRemote = createDebouncedAsyncThunk(
	"user/updateSettingsRemote",
	async (_, { getState, dispatch, rejectWithValue, signal }) => {
		return await dispatch(
			apiCall({
				endpoint: "update_settings",
				data: getState().user.settings,
			}),
		);
	},
	1000 * 4, //4 seconds debounce
);

//default app settings
const initialSettings = {
	wpm: 12, //5-50
	key_frequency: 440,
	volume_receiver: 50, //0-100
	volume_key: 50, //0-100
	dialect: "international",
	key_mode: "straight", //straight - yambic
	show_readable: true,
	left_is_dot: true,
	submit_delay: 12, //5-50
	keybinds: {
		...defaultKeybinds,
	},
};

/**
 * Merge settings returned by the backend with the app defaults. In particular
 * this fills in keybindings for accounts that saved their settings before the
 * keybinding feature existed.
 */
function normalizeSettings(settings) {
	if (!settings || typeof settings !== "object") {
		return {
			...initialSettings,
			keybinds: { ...defaultKeybinds },
		};
	}
	return {
		...initialSettings,
		...settings,
		keybinds: mergeKeybinds(settings.keybinds),
	};
}

const initialState = {
	authenticated: null,
	isadmin: false,
	ismoderator: false,
	callsign: null,
	country: null,
	//can remain empty after api initialization
	settings: normalizeSettings(null),
	id: null,
	username: null,
};

const userSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		/**
		 * this action is used interally by updateSettings
		 * see updateSettings for more info
		 */
		updateSettingsLocal(state, action) {
			const next = {
				...state.settings,
				...action.payload,
			};
			if (action.payload.keybinds) {
				next.keybinds = {
					...state.settings.keybinds,
					...action.payload.keybinds,
				};
			}
			state.settings = next;
		},
	},
	extraReducers(builder) {
		//initial page load
		builder.addCase(fetchAllData.fulfilled, (state, action) => {
			let apidata = action.payload;
			state.authenticated = !apidata.is_anonymous;
			state.callsign = apidata.callsign;
			state.country = apidata.country;
			state.isadmin = apidata.is_admin;
			state.ismoderator = apidata.is_moderator;
			state.username = apidata.username;
			state.settings = normalizeSettings(apidata.settings);
			// assign pseudorandom frequency if not set in the settings
			if (!apidata.settings || apidata.settings.key_frequency === 0) {
				state.settings.key_frequency = getFreqencyFromCallsign(state.callsign);
			}
		});
		//user logged in
		builder.addCase(loginUser.fulfilled, (state, action) => {
			let apidata = action.payload;
			state.authenticated = !apidata.is_anonymous;
			state.callsign = apidata.callsign;
			state.country = apidata.country;
			state.isadmin = apidata.is_admin;
			state.ismoderator = apidata.is_moderator;
			state.username = apidata.username;
			state.settings = normalizeSettings(apidata.settings);
			// assign pseudorandom frequency if not set in the settings
			if (!apidata.settings || apidata.settings.key_frequency === 0) {
				state.settings.key_frequency = getFreqencyFromCallsign(state.callsign);
			}
		});
		//user registered
		builder.addCase(registerUser.fulfilled, (state, action) => {
			let apidata = action.payload;
			state.authenticated = !apidata.is_anonymous;
			state.callsign = apidata.callsign;
			state.country = apidata.country;
			state.isadmin = apidata.is_admin;
			state.ismoderator = apidata.is_moderator;
			state.username = apidata.username;
		});
		//user logout
		builder.addCase(logoutUser.fulfilled, (state, action) => {
			let apidata = action.payload;
			state.authenticated = !apidata.is_anonymous;
			state.callsign = apidata.callsign;
			state.country = apidata.country;
			state.isadmin = apidata.is_admin;
			state.ismoderator = apidata.is_moderator;
			state.username = apidata.username;
			// Do not leak the previous account's preferences into the anonymous
			// session: the backend does not return settings on logout.
			state.settings = normalizeSettings(null);
			state.id = null;
		});
		//..
		//logout
		//..
		//optimistic settings update
		//..
	},
});

export const selectMorseTimes = createSelector(
	(state) => state.user.settings.wpm,
	wpmToMorseTimes,
);

export default userSlice.reducer;
