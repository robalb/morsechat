import * as React from "react";
import ctx from '../utils/soundCtx'

export function useSound(note = 880, volume = 100) {
    //setting the gain to zero crashes everything, this is a workaround
    const baseVolume = 0.0000001
    if (volume < 0) volume = 0
    if (volume > 100) volume = 100
    volume = (volume + baseVolume) / 100

    let [g, setG] = React.useState(null)
    let [isOn, setIsOn] = React.useState(false)

    //update the volume in real time if it changes while the sound is playing
    React.useEffect(() => {
        if (isOn)
            g.gain.setValueAtTime(volume, ctx.currentTime)
    }, [volume])

    //initialize the audio context - in chrome this will throw a warning
    //because user action is required but it still works
    React.useEffect(() => {
        console.log("AUDIO NODE CREATED")
        //https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
        let o = ctx.createOscillator()
        o.frequency.value = note
        o.type = "triangle"
        let g = ctx.createGain()
        o.connect(g)
        g.connect(ctx.destination)
        setG(g)
        g.gain.setValueAtTime(baseVolume, ctx.currentTime)
        o.start()
        return () => {
            console.log("CLOSING AUDIO OSCILLATOR")
            g.disconnect()
        }
    }, [])
    

    return [
        function on() {
            if (ctx.state != "running") {
                console.log("resuming global audiocontext from useSound hook")
                ctx.resume()
            }
            setIsOn(true)
            g.gain.setValueAtTime(
                volume, ctx.currentTime
            )
        },
        function off() {
            if (ctx.state == "running") {
                setIsOn(false)
                g.gain.setValueAtTime(
                    baseVolume, ctx.currentTime
                )
            }
        }
    ]
}