import AudioBuffer from "./audioBuffer"
import Config from "./config"
import VisualConfig from "./visualConfig"
import Visualizer from "./visualizer"
import Parser from "./parser"
import Interactor from "./interactor"
import Tracks, { NoteData } from "./tracks"
import UI from "./ui"
import Note from "./note"

// (MIDI) Player => play/stop/progress
export default class Player 
{
    id: number
    node: HTMLElement
    enabled: boolean
    playing: boolean
    audio: AudioBufferSourceNode[]
    time: number
    prevTime: number
    lastContextTime: number
    config: Config
    parser: Parser
    tracks: Tracks
    visualConfig: VisualConfig
    visualizer: Visualizer
    interactor: Interactor
    ui: UI

    constructor(id:number, node:HTMLElement) 
    {
        this.id = id;
        this.node = node;
        
        this.enabled = true;
        this.playing = false;
        this.audio = [];
        this.time = 0;
        this.prevTime = 0;
        this.lastContextTime = 0;

        // @ts-ignore
        if(!PQ_MIDI.config) { PQ_MIDI.config = {} }
        // @ts-ignore
        if(!PQ_MIDI.config.audio) { PQ_MIDI.config.audio = {}; }

        const dataNode = this.node.getElementsByClassName("midi-data")[0] as HTMLElement;
        const midiData = dataNode.innerHTML.trim();
        const params = {
            pitchInput: dataNode.dataset.pitchinput,
            timeInput: dataNode.dataset.timeinput,
            tempoBPM: parseInt(dataNode.dataset.tempo), 
            timeSignature: dataNode.dataset.time, 
            strict: dataNode.dataset.strict,
            transpose: parseInt(dataNode.dataset.transpose),
            metronome: dataNode.dataset.metronome,
            // @ts-ignore
            metronomeVolume: PQ_MIDI.config.audio.metronomeVolume || 66
        }
                
        this.config = new Config(params);
        this.parser = new Parser(midiData, this.config);
        this.tracks = new Tracks(this, this.config);
        this.tracks.readFromParser(this.parser);

        // @ts-ignore
        this.visualConfig = new VisualConfig(PQ_MIDI.customConfig || {});
        this.visualizer = new Visualizer(this, this.config, this.visualConfig);
        this.interactor = new Interactor(this.tracks, this.visualizer);

        this.ui = new UI(this, this.config);
        this.ui.setFeedback(this.parser.getFeedback());
        this.ui.setPlayButtonCallback(this.toggle.bind(this));
    }

    getContainer() { return this.node; }

    async toggle()
    {
        if(!this.enabled) { return; }

        this.enabled = false;
        this.ui.setFeedback("Downloading audio ...");

        await AudioBuffer.checkAndLoadResources(this.tracks.getUniquePitches());
        
        this.ui.setFeedback(this.parser.getFeedback());
        this.enabled = true;
        
        if(this.playing) { return this.stop(); }
        return this.play();
    }

    play()
    {
        this.playing = true;
        this.audio = [];

        this.tracks.resetStateForAllNotes();

        this.prevTime = this.time;
        this.lastContextTime = this.getCurContextTime();
        this.clickMetronome();
        this.onUpdate();

        window.requestAnimationFrame(this.progress.bind(this));
    }

    getCurContextTime()
    {
        return AudioBuffer.getContext().currentTime;
    }

    async progress()
    {
        if(!this.playing) { return; }

        const curTime = this.getCurContextTime();
        const timeElapsed = curTime - this.lastContextTime;
        this.lastContextTime = curTime;
        
        this.prevTime = this.time;
        this.time += timeElapsed;

        const finished = (this.time >= this.tracks.getDuration());
        if(finished) { this.stop(true); return; }

        this.onUpdate();

        await AudioBuffer.checkAndLoadResources(this.tracks.getUniquePitches());
        window.requestAnimationFrame(this.progress.bind(this));
    }

    stop(reachedEnd = false)
    {
        this.playing = false;
        this.time = 0;

        for(const audio of this.audio)
        {
            audio.stop();
        }

        this.audio = [];
        this.requestRefresh();

        if(reachedEnd && this.config.shouldLoop()) { this.play(); }
    }

    onUpdate()
    {
        this.requestRefresh();

        const notesData : NoteData[] = this.tracks.getNotesThatStartPlaying(this.time);
        for(const noteData of notesData)
        {
            const note = noteData.note;
            this.playSound(noteData.id, note);
            note.setPlaying(true);
        }

        const subDivisions = this.config.getGridSubdivisions();
        const closestSubdivision = Math.round(this.time / subDivisions) * subDivisions;
        const clickMetronome = (this.prevTime < closestSubdivision && this.time >= closestSubdivision);
        if(clickMetronome) { this.clickMetronome(); }
    }
    
    playSound(id:number, note:Note)
    {
        if(!note.useAudio) { return; }
        const source = AudioBuffer.playSound(id, note);        
        this.audio.push(source);
    }

    // @TODO: move this to Tracks or some more appropriate location?
    clickMetronome()
    {
        if(!this.config.useMetronome()) { return; }

        const subDivisions = this.config.getGridSubdivisions();
        const timeSnapped = Math.round(this.time / subDivisions) * subDivisions;

        let baseVolume = this.config.metronomeVolume;
        const newMeasure = this.config.isStartOfMeasure(timeSnapped);
        const volume = newMeasure ? baseVolume : 0.5*baseVolume;
        const noteLength = 0.1;

        const note = new Note("M", timeSnapped, noteLength);
        note.setVolume(volume);
        note.setVisual(false);
        this.playSound(this.tracks.getMetronomeChannel(), note);
    }

    clear()
    {
        this.tracks.clear();
    }

    requestRefresh()
    {
        const ev = new CustomEvent("refresh");
        this.node.dispatchEvent(ev);
    }
};