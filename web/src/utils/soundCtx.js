

/**
 * The audiocontext used globally by the app
 */
let ctx = new AudioContext()

window.addEventListener('keydown', resumeCtx, {
    once: true,
    passive: true
} )

window.addEventListener('touchstart', resumeCtx, {
    once: true,
    passive: true
} )

window.addEventListener('mousedown', resumeCtx, {
    once: true,
    passive: true
} )

function resumeCtx(){
    // check if context is in suspended state (autoplay policy)
    if (ctx.state === 'suspended') {
        console.log("global audiocontext resumed")
        ctx.resume();
    }
}

export default ctx