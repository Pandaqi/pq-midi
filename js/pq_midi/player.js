import AudioBuffer from "./audioBuffer"
import Config from "./config"
import VisualConfig from "./visualConfig"
import Visualizer from "./visualizer"
import Parser from "./parser"

// (MIDI) Player => play/stop/progress
export default class Player {
    constructor(id, data, canvas, metadata) {
        this.id = id;
        this.metadata = metadata;
        this.btn = metadata.getElementsByClassName("midi-button-play")[0];
        
        this.enabled = true;
        this.playing = false;
        this.audio = [];
        this.gain = [];
        this.time = 0;

        if(!PQ_MIDI.config) { PQ_MIDI.config = {} }
        if(!PQ_MIDI.config.audio) { PQ_MIDI.config.audio = {}; }

        let midiData = data.innerHTML.trim();
        let params = {
            pitchInput: data.dataset.pitchinput,
            timeInput: data.dataset.timeinput,
            tempoBPM: parseInt(data.dataset.tempo), 
            timeSignature: data.dataset.time, 
            strict: data.dataset.strict,
            transpose: parseInt(data.dataset.transpose),
            metronome: data.dataset.metronome,
            metronomeVolume: PQ_MIDI.config.audio.metronomeVolume || 66
        }
        
        let config = new Config(params);
        metadata.getElementsByClassName("midi-tempo-label")[0].innerHTML = config.getPrettyTempoBPM();
        
        this.parser = new Parser(midiData, config);
        this.tracks = this.parser.getNotes();
        this.duration = this.parser.getDuration();

        const numTracks = this.tracks.length;
        this.gain = AudioBuffer.createGainNodes(numTracks);

        const visualConfig = new VisualConfig(PQ_MIDI.customConfig || {}, numTracks);
        this.visualizer = new Visualizer(canvas, this.parser, config, visualConfig);

        this.btn.addEventListener("click", this.toggle.bind(this));

        this.feedbackLabel = metadata.getElementsByClassName("midi-parse-feedback")[0];
        this.feedbackLabel.innerHTML = this.parser.feedback;
    }

    async toggle()
    {
        if(!this.enabled) { return; }

        this.enabled = false;
        this.feedbackLabel.innerHTML = "Downloading audio ...";
        await AudioBuffer.checkAndLoadResources(this.parser.getUniquePitches());
        this.feedbackLabel.innerHTML = this.parser.feedback;
        this.enabled = true;
        if(this.playing) { this.stop(); }
        else { this.play(); }
    }

    cloneTracks()
    {
        const originalTracks = this.parser.getNotes();
        
        this.tracks = [];
        for(let i = 0; i < originalTracks.length; i++)
        {
            this.tracks.push(originalTracks[i].slice());
        }
    }

    play()
    {
        this.playing = true;
        this.audio = [];

        this.cloneTracks();

        this.onUpdate();
        window.requestAnimationFrame(this.progress.bind(this));
    }

    progress()
    {
        if(!this.playing) { return; }
        
        this.time += (1.0/60.0);

        const finished = (this.time >= this.duration);
        if(finished) { this.stop(); return; }

        this.onUpdate();
        window.requestAnimationFrame(this.progress.bind(this));
    }

    stop()
    {
        this.playing = false;
        this.time = 0;

        for(const audio of this.audio)
        {
            audio.stop();
        }
        this.audio = [];

        this.visualizer.refresh(this.parser, null);
    }

    onUpdate()
    {
        this.visualizer.refresh(this.parser, this);

        for(const [id, track] of Object.entries(this.tracks))
        {
            if(track.length <= 0) { continue; }

            const nextNote = track[0];
            if(nextNote.timeStart > this.time) { continue; }

            this.playSound(id, nextNote);
            track.shift();
        }
    }
    
    playSound(id, note)
    {
        if(!note.useAudio) { return; }
        const source = AudioBuffer.playSound(id, note, this.gain[id]);        
        this.audio.push(source);
    }
};