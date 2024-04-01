import Config from "./config";
import Note from "./note"
import Parser from "./parser";
import Player from "./player";
import TimelineData from "./timelineData";

type Track = Note[];
interface NoteData
{
    id?: number
    note?: Note
}

export { Tracks, Track, NoteData }
export default class Tracks
{
    player: Player;
    config: Config;
    editableLayer: number;
    lastParser: Parser;
    tracks: Track[];
    duration: number;

    constructor(player:Player, config:Config) 
    {
        this.player = player;
        this.config = config;
        this.editableLayer = 0;
    }

    readFromParser(parser:Parser)
    {
        this.lastParser = parser;
        this.tracks = parser.getNotesCopy();
        this.duration = parser.getDuration();
    }

    read() { return this.tracks; }
    readNotes() { return this.tracks.flat(); }
    count() { return this.tracks.length; }
    getMetronomeChannel() { return this.count(); }
    isEmpty() { return this.count() <= 0 || this.readNotes().length <= 0; }

    reset()
    {
        this.readFromParser(this.lastParser);
        this.player.requestRefresh();
    }

    getNumMeasures()
    {
        return Math.ceil(this.getDuration() / this.config.getSecondsPerMeasure());
    }

    getDuration() { return this.duration; }
    stretchDuration(factor:number) { this.setDuration(this.duration * factor); }
    setDuration(d:number) { this.duration = d; this.onChange(); }
    setDurationFromMeasures(numMeasures)
    {
        const bounds = this.config.MEASURE_BOUNDS;
        numMeasures = Math.max(Math.min(numMeasures, bounds.max), bounds.min);
        this.setDuration(numMeasures * this.config.getSecondsPerMeasure());
    }

    getUniquePitches() : string[]
    {
        let pitches : Set<string> = new Set();
        for(const track of this.tracks)
        {
            for(const note of track)
            {
                if(!note.useAudio) { continue; }
                pitches.add(note.pitch);
            }
        }
        pitches.add("M");
        return Array.from(pitches);
    }

    getPitches(margin = 0, config:Config)
    {
        const allNotes = config.getAllNotes();
        const minSpread = this.config.MIN_PITCH_SPREAD;

        let lowestPitch = Infinity;
        let highestPitch = -1;

        for(const track of this.tracks)
        {
            for(const note of track)
            {
                let idx = config.getNoteIndex(note.pitch);
                if(idx == -1) { continue; }
                if(idx < lowestPitch) { lowestPitch = idx; }
                if(idx > highestPitch) { highestPitch = idx; }
            }
        }

        let halfNote = Math.floor(0.5 * allNotes.length);
        const tooFewPitches = Math.abs(highestPitch - lowestPitch) < minSpread;
        if((lowestPitch != Infinity && highestPitch >= 0) && tooFewPitches)
        {
            halfNote = Math.floor((lowestPitch + highestPitch)*0.5);
        }

        if(this.isEmpty() || tooFewPitches)
        {
            lowestPitch = halfNote - Math.floor(0.5 * minSpread);
            highestPitch = halfNote + Math.ceil(0.5 * minSpread);
        }

        lowestPitch = config.clampNote(lowestPitch - margin);
        highestPitch = config.clampNote(highestPitch + margin + 1);

        return allNotes.slice(lowestPitch, highestPitch);
    }

    
    noteMatchesTimelineData(note:Note, data:TimelineData)
    {
        if(note.getPitch() != data.getPitch()) { return false; }
        if(!note.containsTime(data.getTime())) { return false; }
        return true;
    }

    findNoteAtTimelineData(data:TimelineData)
    {
        for(const track of this.tracks)
        {
            for(const note of track)
            {
                if(!this.noteMatchesTimelineData(note, data)) { continue; }
                return note;
            }
        }
        return null;
    }

    moveNoteTo(note:Note, timelineData:TimelineData, side:string)
    {
        note.setPitch(timelineData.getPitch());

        let offset = timelineData.getTimeOffset();
        let timeRaw = timelineData.getTime() + offset;
        if(side == "end") { timeRaw -= offset; }

        const timeSnapped = this.snapToTimeGrid(timeRaw);

        if(side == "both") { note.setTimeStart(timeSnapped, true); }
        else if(side == "start") { note.setTimeStart(timeSnapped, false); }
        else if(side == "end") { note.setTimeEnd(timeSnapped, false); }

        this.onChange();
    }

    snapToTimeGrid(time:number)
    {
        if(!this.config.shouldSnap()) { return time; }
        const subdiv = this.config.getSecondsPerBeat() / this.config.getGridResolution();
        return Math.round(time / subdiv) * subdiv;
    }

    addNote(note:Note)
    {
        this.tracks[this.editableLayer].push(note);
        this.onChange();
    }

    removeNote(targetNode:Note)
    {
        if(!targetNode) { return; }
        for(const track of this.tracks)
        {
            const index = track.indexOf(targetNode);
            if(index == -1) { continue; }
            track.splice(index, 1);
            break;
        }
        this.onChange();
    }

    clear()
    {
        this.tracks = [];
        this.onChange();
    }

    onChange()
    {
        this.player.requestRefresh();
    }

    setEditableLayer(layerNum:number)
    {
        // the -1 is needed because arrays start at index 0; 
        // while the bounds are for "num layers" which starts at 1
        const bounds = this.config.NUM_TRACKS_BOUNDS;
        const layerNumClamped = Math.max(Math.min(layerNum, bounds.max - 1), bounds.min - 1); 
        if(layerNumClamped != layerNum) { return false; }
        
        while(this.count() <= layerNum)
        {
            this.addTrack();
        }

        this.editableLayer = layerNum;
        return true;
    }

    addTrack() 
    { 
        this.tracks.push([]); 
        this.onChange();
    }

    removeTrack(idx:number) 
    { 
        idx = idx ?? (this.count() - 1);
        this.tracks.splice(idx, 1);
        this.onChange();
    }

    sortTrack(track:Track)
    {
        track.sort((a,b) => {
            return a.timeStart - b.timeStart;
        })
    }

    stretchTempoByFactor(factor:number)
    {
        const notes = this.readNotes();
        for(const note of notes)
        {
            note.stretchDuration(factor);
        }
        this.stretchDuration(factor);
        this.onChange();
    }

    // @TODO: right now, changeData is just null and we don't do any modification on time signature change
    changeTimeSignature(changeData)
    {
        this.setDurationFromMeasures(this.getNumMeasures());
        this.onChange();
    }

    resetStateForAllNotes()
    {
        const notes = this.readNotes();
        for(const note of notes)
        {
            note.setPlaying(false);
        }

        // @TODO: not truly necessary anymore, but can't hurt
        for(const track of this.tracks)
        {
            this.sortTrack(track);
        }
    }

    getNotesThatStartPlaying(time:number) : NoteData[]
    {
        const list : NoteData[] = [];
        for(const [id,track] of Object.entries(this.tracks))
        {
            for(const note of track)
            {
                if(note.isPlaying()) { continue; }
                if(note.getTimeStart() > time) { continue; }
                if(note.getTimeEnd() < time) { continue; }

                const noteData : NoteData = {
                    id: parseInt(id),
                    note: note
                };
                list.push(noteData);
            }
        }
        return list;
    }

}