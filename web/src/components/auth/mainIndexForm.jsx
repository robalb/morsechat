import {FormControl, Grid, InputLabel, MenuItem, Select, Typography} from "@mui/material";
import * as React from "react";
import CurrentUserChip from "../currentUserChip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import { useDispatch, useSelector} from 'react-redux'
import { apiCall } from "../../redux/apiSlice";

export const MainIndexForm = ({setPage}) => {
    const dispatch = useDispatch()
    const show_popup = useSelector(state => state.user.show_popup)
    //make an api call to disable this popup
    React.useEffect(() => {
        if (show_popup) {
            dispatch(apiCall({
                endpoint: "no_popup"
            }))
        }
    }, [])

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h5" color="primary">
                        You are not logged in!
                    </Typography>

                    <p> Login or register to unlock: </p>
                    <ul>
                        <li>custom callsigns</li>
                        <li>private rooms</li>
                        <li>stats and persisting settings</li>
                        <li>No antispam restrictions</li>
                    </ul>
                </Grid>
                <Grid item xs={12}>
                    <Stack direction="row" sx={{ padding: "10px" }} alignItems="center" spacing={1}>
                        <Button variant="outlined" size="small" onClick={e => setPage("register")}>Register</Button>
                        <Button size="small" onClick={e => setPage("login")}>Login</Button>
                    </Stack>
                </Grid>
                <Grid item xs={12}>
                    <Divider />
                </Grid>
                <Grid item xs={12}>
                    <Button size="medium" variant="contained" onClick={e => setPage("")}>
                        Join anonimously
                    </Button>
                </Grid>
            </Grid>
        </>
    )
}