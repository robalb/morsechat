import * as React from "react";

export function useSound(note = 880, volume = 100) {
    //setting the gain to zero crashes everything, this is a workaround
    const baseVolume = 0.0000001
    if (volume < 0) volume = 0
    if (volume > 100) volume = 100
    volume = (volume + baseVolume) / 100

    let [ctx, setCtx] = React.useState(null)
    let [o, setO] = React.useState(null)
    let [g, setG] = React.useState(null)

    let [isOn, setIsOn] = React.useState(false)
    let [initialized, setInitialized] = React.useState(false)

    //update the volume in real time if it changes while the sound is playing
    React.useEffect(() => {
        if (isOn) {
            console.log("UPDATING REALTIME KEY VOLUME")
            g.gain.setValueAtTime(
                volume, ctx.currentTime
            )
        }
    }, [volume])

    //initialize the audio context - in chrome this will throw a warning
    //because apparently an user action is required but it still works
    React.useEffect(() => {
        console.log("AUDIO NODE CREATED")
        //https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
        let context = new AudioContext()
        context.suspend()
        let o = context.createOscillator()
        o.frequency.value = note
        o.type = "triangle"
        let g = context.createGain()
        o.connect(g)
        g.connect(context.destination)
        setCtx(context)
        setO(o)
        setG(g)
        console.log(context)

        return () => {
            console.log("CLOSING AUDIO CTX")
            ctx.close()
        }
    }, [])

    return [
        function on() {
            if (!initialized) {
                ctx.resume()
                o.start()
                setInitialized(true)
            }
            if (g) {
                setIsOn(true)
                g.gain.setValueAtTime(
                    volume, ctx.currentTime
                )
            }
        },
        function off() {
            if (initialized && g) {
                setIsOn(false)
                g.gain.setValueAtTime(
                    baseVolume, ctx.currentTime
                )
            }
        }
    ]
}