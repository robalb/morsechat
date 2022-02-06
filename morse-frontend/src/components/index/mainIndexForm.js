import {FormControl, Grid, InputLabel, MenuItem, Select, Typography} from "@mui/material";
import * as React from "react";
import CurrentUserChip from "../currentUserChip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";

export const MainIndexForm = ({state, reload, setPage, post}) => {
    //semplify data extraction from the state object
    let logged = state.sessionData.authenticated
    //generate rooms list, and handle room state
    let rooms = []
    for (let i = 0; i < state.appData.rooms.chat; i++)
        rooms.push("chat" + i)
    for (let i = 0; i < state.appData.rooms.radio; i++)
        rooms.push("radio" + i)
    let roomsProps = rooms.map(r =>
        <MenuItem value={r} key={r}>{r}</MenuItem>
    )
    let [room, setRoom] = React.useState(rooms[0])
    let roomUrl = "/rooms/chat/" + room

    //activate the join button when the nopopup request complete (TODO: remove
    //completely this request, and set the flag serverside, or do it silently without disabling
    //the button)
    React.useEffect(() => {
        async function setNoPopup() {
            let res = await post("no_popup", {})
        }

        if (state.sessionData.show_popup) {
            setNoPopup()
        }
    }, [])

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h5" color="primary">
                        Account
                    </Typography>
                </Grid>
                <Grid item xs={12}>

                    <CurrentUserChip
                        logged={logged}
                        username={logged && state.userData.username}
                        callSign={state.userData.callsign}
                    />
                    {!logged && (
                        <Stack direction="row" sx={{padding: "10px"}} alignItems="center" spacing={1}>
                            <Button variant="outlined" size="small" onClick={e => setPage("login")}>Login</Button>
                            <Button size="small" onClick={e => setPage("register")}>Register</Button>
                        </Stack>
                    )}

                </Grid>
                <Grid item xs={12}>
                    <Divider/>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h5" color="primary">
                        channel
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="demo-simple-select-label">Select channel</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={room}
                            label="Select channel"
                            onChange={e => setRoom(e.target.value)}
                        >
                            {roomsProps}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Button size="medium" href={roomUrl} color="secondary" variant="contained">
                        Join
                    </Button>
                </Grid>
            </Grid>
        </>
    )
}