//part of the layout
//TODO: enhance with content from graphQL (md file for ex.)
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import {Link, Typography} from "@mui/material";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import InboxIcon from "@mui/icons-material/Inbox";
import ListItemText from "@mui/material/ListItemText";
import * as React from "react";

export const Sidebar = () => (
    <Card elevation={12} sx={{minWidth: 275}}>
        <CardContent>
            <Typography variant="h5">
                Community
            </Typography>
            <Typography variant="body2">
                Join the discord community to get the latest updates on the project and
                participate on its development.
            </Typography>
            <Typography variant="body2">
                This project is open source. View its full source on github
            </Typography>

            <List>
                <ListItem dense={true} disablePadding>
                    <ListItemButton>
                        <ListItemIcon>
                            <InboxIcon/>
                        </ListItemIcon>
                        <ListItemText primary="discord server"/>
                    </ListItemButton>
                </ListItem>
                <ListItem dense={true} disablePadding>
                    <ListItemButton>
                        <ListItemIcon>
                            <InboxIcon/>
                        </ListItemIcon>
                        <ListItemText primary="github"/>
                    </ListItemButton>
                </ListItem>
                <ListItem dense={true} disablePadding>
                    <ListItemButton>
                        <ListItemIcon>
                            <InboxIcon/>
                        </ListItemIcon>
                        <ListItemText primary="halb.it"/>
                    </ListItemButton>
                </ListItem>
                <ListItem dense={true} disablePadding>
                    <ListItemButton>
                        <ListItemIcon>
                            <InboxIcon/>
                        </ListItemIcon>
                        <ListItemText primary="twitter"/>
                    </ListItemButton>
                </ListItem>
            </List>
            <Typography variant="h5">
                Report an issue
            </Typography>
            <Typography variant="body2">
                Bug reports are always welcome! you can
                <Link href="#" color="primary" variant="inherit" underline="always"> Open an issue </Link>
                on github or write in the 'bugs' section on the
                <Link href="#" color="primary" variant="inherit" underline="always"> Discord server </Link>
            </Typography>
            <Typography variant="h5">
                What's new
            </Typography>
            <Typography variant="h6" color="text.secondary">
                v 0.1
            </Typography>
            <Typography variant="body2">
                [md parse failed]
            </Typography>
        </CardContent>
    </Card>
)