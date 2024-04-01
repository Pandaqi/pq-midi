import Config from "./config";
import Note from "./note";
import { Track } from "./tracks";

// (MIDI) Parser => given a string from the Markdown, turn it into tracks, pitches, duration, etc.
export default class Parser 
{
    tracksParsed: Track[];
    duration: number;
    feedback: string[];

    constructor(midiData:string, config:Config)
    {
        this.tracksParsed = [];
        this.duration = 0;
        this.feedback = [];
        this.parse(midiData, config);
    }

    parse(midiData:string, config:Config)
    {
        this.tracksParsed = [];

        // removes all sorts of stupid whitespace that might enter the string
        midiData = midiData.replace((/  |\r\n|\n|\r/gm),"");

        const tracks = midiData.split(":");

        for(const [id, track] of Object.entries(tracks))
        {
            const invalidTrack = (track.length <= 0);
            if(invalidTrack) { continue; }

            let runningTime = 0;
            let trackParsed : Track = [];

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

        if(!config.areTracksAligned(this.tracksParsed))
        {
            this.addFeedback("Error! Tracks have different lengths.");
        }

        this.duration = this.getDuration();
    }

    getFeedback() { return this.feedback; }
    addFeedback(txt:string)
    {
        this.feedback.push(txt);
    }

    getNotesCopy() 
    {
        const tracksCopy = [];
        for(const track of this.tracksParsed)
        {
            const trackCopy = [];
            for(const note of track)
            {
                trackCopy.push(note.clone());
            }
            tracksCopy.push(trackCopy);
        }
        return tracksCopy;
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