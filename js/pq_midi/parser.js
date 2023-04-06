import Note from "./note"

// (MIDI) Parser => given a string from the Markdown, turn it into tracks, pitches, duration, etc.
export default class Parser {
    constructor(midiData, config)
    {
        this.tracksParsed = [];
        this.duration = 0;
        this.feedback = [];

        this.parse(midiData, config);
    }

    parse(midiData, config)
    {
        this.tracksParsed = [];

        // removes all sorts of stupid whitespace that might enter the string
        midiData = midiData.replace((/  |\r\n|\n|\r/gm),"");

        const secondsPerBeat = config.getSecondsPerBeat();
        const tracks = midiData.split(":");

        for(const [id, track] of Object.entries(tracks))
        {
            const invalidTrack = (track.length <= 0);
            if(invalidTrack) { continue; }

            let runningTime = 0;
            let trackParsed = [];

            const notes = track.split(" ");
            const invalidNotes = (notes.length <= 0);
            if(invalidNotes) { continue; }

            let prevPitch = null;
            let prevTime = null;
            let prevVolume = null;
            for(const note of notes)
            {
                const invalidNote = (note.length <= 0 || !note.includes("/"));
                if(invalidNote) { continue; }

                const isMeasure = note == "|";
                if(!config.isMeasureCorrect(isMeasure, runningTime)) 
                { 
                    this.addFeedback("Error! Invalid measure. Track " + id + "; Time " + runningTime); 
                } 
                
                if(isMeasure) { continue; }

                const noteParts = note.split("/");

                const pitch = noteParts[0];
                const time = noteParts[1];
                const pitchConverted = config.convertPitchInput(pitch, prevPitch);
                const timeConverted = config.convertTimeInput(time, prevTime);

                prevPitch = pitchConverted;
                prevTime = timeConverted; 

                const noteObj = new Note(pitchConverted, runningTime, timeConverted);

                const customVolume = (noteParts.length > 2);
                if(customVolume) { 
                    const volume = noteParts[2].length <=0 ? prevVolume : parseInt(noteParts[2]);
                    noteObj.setVolume(volume); 
                }

                prevVolume = noteObj.volumeEnd;
            
                const isContinuedNote = (pitch == "");
                if(isContinuedNote) { trackParsed[trackParsed.length-1].addTime(timeConverted); } 
                if(!isContinuedNote) { trackParsed.push(noteObj); }

                runningTime += timeConverted;
            }

            this.tracksParsed.push(trackParsed);
        }

        if(config.useMetronome())
        {
            this.addMetronomeTrack(config);
        }

        if(!config.areTracksAligned(this.tracksParsed))
        {
            this.addFeedback("Error! Tracks have different lengths.");
        }
    }

    addMetronomeTrack(config)
    {
        let track = [];
        let duration = this.getDuration();
        let secondsPerBeat = config.getSecondsPerBeat();

        let baseVolume = config.metronomeVolume;

        let time = 0;
        while((time+secondsPerBeat-0.01) < duration)
        {
            const newMeasure = config.isStartOfMeasure(time);
            const volume = newMeasure ? baseVolume : 0.38*baseVolume;
            const pitch = "M";
            const note = new Note(pitch, time, secondsPerBeat);
            note.setVolume(volume);
            note.setVisual(false);
            track.push(note);
            time += secondsPerBeat;
        }

        this.tracksParsed.push(track);
    }

    addFeedback(txt)
    {
        this.feedback.push(txt);
    }

    getNotes()
    {
        return this.tracksParsed;
    }

    getUniquePitches()
    {
        let pitches = new Set();
        for(const track of this.tracksParsed)
        {
            for(const note of track)
            {
                if(!note.useAudio) { continue; }
                pitches.add(note.pitch);
            }
        }
        return Array.from(pitches);
    }

    getPitches(margin = 0, config)
    {
        let lowestPitch = Infinity;
        let highestPitch = -1;

        for(const track of this.tracksParsed)
        {
            for(const note of track)
            {
                let idx = config.getNoteIndex(note.pitch);
                if(idx == -1) { continue; }
                if(idx < lowestPitch) { lowestPitch = idx; }
                if(idx > highestPitch) { highestPitch = idx; }
            }
        }

        lowestPitch = config.clampNote(lowestPitch - margin);
        highestPitch = config.clampNote(highestPitch + margin + 1);

        return config.getAllNotes().slice(lowestPitch, highestPitch);
    }

    getDuration()
    {
        if(this.duration > 0) { return this.duration; }

        let longest = 0;
        for(const track of this.tracksParsed)
        {
            let dur = track[track.length - 1].timeEnd;
            if(dur <= longest) { continue; }
            longest = dur;
        }

        this.duration = longest;
        return this.duration;
    }
}