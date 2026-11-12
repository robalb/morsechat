import {Grid, Typography} from "@mui/material";
import * as React from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
export const MainIndexForm = ({setPage}) => {
    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h5" color="primary">
                        Morsechat
                    </Typography>
                    <p>
                    This is an online morse code chat.<br />
                    Join to practice and communicate in real time with hundreds of
                    users from all over the world without having to buy a radio
                    </p>
                    <p>
Press space or the key at the bottom of the page to transmit a dot, hold it to transmit a dash
                    </p>
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
                        Join anonymously
                    </Button>
                </Grid>
            </Grid>
        </>
    )
}
