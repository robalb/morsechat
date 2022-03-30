import * as React from "react";
import {MainIndexForm} from "./mainIndexForm";
import LoginForm from "./loginForm";
import RegisterForm from "./registerForm";
import VerificationForm from "./verificationForm";
import MainDataLoading from "./mainDataLoading";
import Dialog from "@mui/material/Dialog";

import styles from './auth.module.css';

import { useSelector } from 'react-redux'

//TODO: use these constants
export const MENU = "menu"
export const LOGIN = "login"
export const REGISTER = "register"
export const VERIFY = "verify"

/**
 *
 * @param {*} authState - an array returned from React.useState, containing a string state.
 *                        the string value defines the page that will be displayed in the component
 *                        An empty string will close the Dialog.
 *                        An invalid string will close the Dialog and log an error
 * @param {boolean} fullScreen - when true, the dialog will be full screen
 */
export function Auth({authState, fullScreen = false}) {

    let loading = useSelector(state => state.api.loading)

    let [page, _setPage] = authState
    let open = page.length > 0

    let pages = {
        "menu": MainIndexForm,
        "login": LoginForm,
        "register": RegisterForm,
        "verify": VerificationForm
    }

    function closeAuth(event) {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        _setPage("")
    }

    let mainContent = ""
    if (open) {
        if (!pages.hasOwnProperty(page)) {
            console.error("invalid page provided")
        } else {
            let CurrentPage = pages[page]
            mainContent = loading ?
                <MainDataLoading /> :
                <CurrentPage setPage={_setPage}/>;
        }
    }

    return (
        <Dialog
            PaperProps={{
              elevation: 1
            }}
            fullScreen={fullScreen}
            open={open}
            onClose={closeAuth}
        >
            <div className={styles.auth}>
                {mainContent}
            </div>
        </Dialog>
    )
}
