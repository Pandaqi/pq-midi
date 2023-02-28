if(!window.PQ_MIDI) { window.PQ_MIDI = {}; }

PQ_MIDI.Note = class {
    constructor(pitch, timeStart, duration)
    {
        this.pitch = pitch;
        this.duration = duration;
        this.timeStart = timeStart;
        this.timeEnd = timeStart + duration;
        this.useAudio = true;
        this.useVisual = true;
        this.maxVolume = 100.0;
        this.volumeStart = this.maxVolume;
        this.volumeEnd = this.maxVolume;

        if(this.shouldBeSilent()) { this.useAudio = false; }
        if(this.shouldBeInvisible()) { this.useVisual = false; }
    }

    setVisual(val)
    {
        this.useVisual = val;
    }

    setAudio(val)
    {
        this.useAudio = val;
    }

    addTime(time)
    {
        this.timeEnd += time;
        this.duration += time;
    }

    setVolume(vol)
    {
        vol = Math.max(Math.min(parseFloat(vol), this.maxVolume), 0.0);
        this.volumeStart = vol;
        this.volumeEnd = vol;
    }

    convertVolumeToGain(vol)
    {
        return vol / this.maxVolume;
    }

    shouldBeInvisible()
    {
        return this.pitch == "R";
    }

    shouldBeSilent()
    {
        return this.pitch == "R";
    }
}
