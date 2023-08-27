// Config => holds general data about the audio (calculated once, passed around as needed)
export default class Config {
    constructor(params = {})
    {
        this.pitchInput = "absolute";
        this.timeInput = "absolute";
        this.tempoBPM = 120;
        this.timeSignature = "4/4";
        this.strict = false;
        this.transpose = 0;
        this.metronome = false;
        this.metronomeVolume = 85;
        this.loop = false;
        this.snapToGrid = true;
        this.gridResolution = 1;

        this.MEASURE_BOUNDS = { min: 1, max: 6 };
        this.BPM_BOUNDS = { min: 10, max: 300 };
        this.MIN_PITCH_SPREAD = 5;
        this.GRID_RESOLUTION_BOUNDS = { min: 1, max: 8 };
        this.AUDIO_BOUNDS = { min: "C2", max: "C6" };
        this.NUM_TRACKS_BOUNDS = { min: 1, max: 8 };

        for (var key in params) {
            if(!params[key]) { continue; }
            this[key] = params[key];
        }

        this.generateNotes();
        this.generateNotesWithAvailableAudio();
    }

    // Generate list of all notes (I'm lazy)
    // (display and audio uses a subsection of it)
    generateNotes()
    {
        const pitches = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const octaves = [1,2,3,4,5,6];
        this.allNotes = [];

        for(let j = 0; j < octaves.length; j++)
        {
            for(let i = 0; i < pitches.length; i++)
            {
                this.allNotes.push(pitches[i] + octaves[j].toString());        
            }
        }
    }

    generateNotesWithAvailableAudio()
    {
        const lowestAudio = this.allNotes.indexOf(this.AUDIO_BOUNDS.min);
        const highestAudio = this.allNotes.indexOf(this.AUDIO_BOUNDS.max);
        this.allNotesAudio = this.allNotes.slice(lowestAudio, highestAudio);
    }

    getAllNotesWithAvailableAudio() { return this.allNotesAudio; }
    getAllNotes() { return this.allNotes; }

    clampPitchToAvailableAudio(pitch)
    {
        if(this.getAllNotesWithAvailableAudio().includes(pitch)) { return pitch; }
        
        const pitchIndex = this.allNotes.indexOf(pitch);
        const lowestAudio = this.allNotes.indexOf(this.AUDIO_BOUNDS.min);
        if(pitchIndex <= lowestAudio) { return this.AUDIO_BOUNDS.min; }
        return this.AUDIO_BOUNDS.max;
    }

    clampNote(noteIndex)
    {
        return Math.max(Math.min(noteIndex, this.allNotes.length - 1), 0);
    }

    getNoteIndex(pitch)
    {
        return this.allNotes.indexOf(pitch);
    }

    convertPitchInput(pitch, prevPitch)
    {
        const idx = this.getNoteIndex(pitch);
        let nonPitch = (idx == -1);
        if(nonPitch) { return pitch };

        let inputType = this.pitchInput;
        if(prevPitch == null && inputType == "relative") { inputType = "absolute"; } // first pitch must be absolute, to set a base level
        if(inputType == "absolute") 
        { 
            let idx = this.clampNote(this.getNoteIndex(pitch) + this.transpose);
            return this.allNotes[idx];
        }
        if(inputType == "relative")
        {
            let idx = this.getNoteIndex(prevPitch);
            let goHigher = pitch[0] == "^";
            let goLower = pitch[0] == "_";
            if(goHigher) { idx += parseInt(pitch.substring(1)); }
            else if(goLower) { idx -= parseInt(pitch.substring(1)); }

            idx = this.clampNote(idx);
            return this.allNotes[idx];
        }
    }

    convertTimeInput(time, prevTime)
    {
        let inputType = this.timeInput;
        if(prevTime == null && inputType == "relative") { inputType = "absolute"; }

        if(inputType == "absolute") 
        {
            if(time.length <= 0) { time = "1"; } 
            return parseInt(time) * this.getSecondsPerBeat(); 
        }
        if(inputType == "relative")
        {
            if(time.length <= 0) { time = "^0"; }

            let prevBeats = parseFloat(prevTime) / this.getSecondsPerBeat();
            let goHigher = time[0] == "^";
            let goLower = time[0] == "_";
            if(goHigher) { time = prevBeats + parseInt(time.substring(1)); }
            if(goLower) { time = prevBeats - parseInt(time.substring(1)); }

            time = Math.min(Math.max(parseInt(time), 1), 32);
            return time * this.getSecondsPerBeat();
        }
        if(inputType == "traditional")
        {
            if(time.length <= 0) { time = "4"; }

            let fullNote = this.getSecondsPerFullNote();
            let timeNumber = parseInt(time.replace(".", ""));
            let baseTime = (1.0 / timeNumber);
            if(time.charAt(time.length - 1) == ".")
            {
                baseTime += (1.0 / (timeNumber*2));
            }

            return baseTime * fullNote;
        }
    }

    isValidTimeSignature(val)
    {
        const split = val.split("/");
        if(split.length != 2) { return false; }

        const beatsPerMeasure = parseInt(split[0]);
        if(isNaN(beatsPerMeasure)) { return false; }

        const beatType = parseInt(split[1]);
        if(isNaN(beatType)) { return false; }

        return true;
    }

    getTimeSignature() { return this.timeSignature; }
    setTimeSignature(val)
    {
        if(!this.isValidTimeSignature(val)) { return null; }
        const changeData = null;
        this.timeSignature = val;
        return changeData;
    }
    
    getPrettyTempoBPM()
    {
        let tempo = this.tempoBPM;
        while(tempo > 200) { tempo /= 2.0; }
        while(tempo < 40) { tempo *= 2.0; }
        return Math.round(tempo);
    }

    getTempoBPM() { return this.tempoBPM; }
    setTempoBPM(val)
    {
        if(isNaN(val)) { return; }
        const valClamped = Math.max(Math.min(val, this.BPM_BOUNDS.max), this.BPM_BOUNDS.min);
        const changeFactor = (this.tempoBPM / valClamped);
        this.tempoBPM = valClamped;
        return changeFactor;
    }

    getGridSubdivisions()
    {
        return this.getSecondsPerBeat() * this.getGridResolution(); 
    }
    
    getSecondsPerBeat()
    {
        return 60.0 / this.tempoBPM;
    }

    getSecondsPerFullNote()
    {
        return this.getSecondsPerBeat() * this.getBeatType();
    }

    getSecondsPerMeasure()
    {
        return this.getSecondsPerBeat() * this.getBeatsPerMeasure();
    }

    // @IMPROV: split once on creation and save that in variables?
    getBeatsPerMeasure()
    {
        return parseInt(this.timeSignature.split("/")[0]);
    }

    getBeatType()
    {
        return parseInt(this.timeSignature.split("/")[1]);
    }

    isStartOfMeasure(time)
    {
        const fullNoteFactor = time / this.getSecondsPerMeasure();
        const isMultiple = Math.abs(Math.round(fullNoteFactor) - fullNoteFactor) <= 0.075;
        return isMultiple;
    }

    isMeasureCorrect(isMeasure = false, time)
    {
        if(!isMeasure) { return true; }
        if(!this.strict) { return true; }
        return this.isStartOfMeasure(time);
    }

    areTracksAligned(tracks)
    {
        if(!this.strict) { return true; }

        let lastLength = -1;
        for(const track of tracks)
        {
            const myLength = track[track.length - 1].timeEnd;
            if(lastLength > 0 && Math.abs(myLength - lastLength) > 0.05) { return false; }
            lastLength = myLength
        }
        return true;
    }

    shouldLoop() { return this.loop; }
    setLoop(l)
    {
        this.loop = l;
    }

    shouldSnap() { return this.snapToGrid; }
    setSnap(s)
    {
        this.snapToGrid = s;
    }

    useMetronome() { return this.metronome; }
    setMetronome(m)
    {
        this.metronome = m;
    }

    getGridResolution() { return this.gridResolution; }
    setGridResolution(val) 
    { 
        const bounds = this.GRID_RESOLUTION_BOUNDS;
        this.gridResolution = Math.min(Math.max(val, bounds.min), bounds.max);
    }
}
