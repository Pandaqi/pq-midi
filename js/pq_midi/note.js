export default class Note {
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

        this.playing = false;

        if(this.shouldBeSilent()) { this.useAudio = false; }
        if(this.shouldBeInvisible()) { this.useVisual = false; }
    }

    // @TODO: terrible clone function, must be a far better way
    clone()
    {
        const n = new Note(this.pitch, this.timeStart, this.duration);
        n.useAudio = this.useAudio;
        n.useVisual = this.useVisual;
        n.volumeStart = this.volumeStart;
        n.volumeEnd = this.volumeEnd;
        return n;
    }

    setPlaying(val) { this.playing = val; }
    isPlaying() { return this.playing; }

    isEmpty() { return Math.abs(this.getDuration()) <= 0.03; }
    isReversed() { return this.timeEnd < (this.timeStart-0.03); }
    putStartEndInCorrectOrder()
    {
        if(!this.isReversed()) { return; }
        const tempEnd = this.timeStart;
        this.timeStart = this.timeEnd; 
        this.timeEnd = tempEnd;
        this.recalculateDuration();
    }

    getDuration() { return this.duration; }
    recalculateDuration() { this.duration = (this.timeEnd - this.timeStart); }
    stretchDuration(factor)
    {
        this.timeStart *= factor;
        this.timeEnd *= factor;
        this.recalculateDuration();
    }

    setPitch(p) { this.pitch = p; }
    getPitch() { return this.pitch; }

    getTimeStart() { return this.timeStart; }
    setTimeStart(t, keepDuration = true) { 
        this.timeStart = t;
        if(keepDuration) { this.timeEnd = this.timeStart + this.duration; }
        else { this.recalculateDuration(); }
    }

    getTimeEnd() { return this.timeEnd; }
    setTimeEnd(t, keepDuration = true) { 
        this.timeEnd = t;
        if(keepDuration) { this.timeStart = this.timeEnd - this.duration; }
        else { this.recalculateDuration(); }
    }

    containsTime(time) { return this.timeStart <= time && time <= this.timeEnd; }

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
