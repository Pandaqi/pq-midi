const AudioLoader = class 
{
    ctx: AudioContext;
    audioBuffer: Record<string,AudioBuffer>; 
    gainNodes: GainNode[];

    constructor()
    {
        this.ctx = null;
        this.audioBuffer = {};
        this.gainNodes = [];
        this.setupContext();
    }

    getFilePath()
    {
        let basePath = "/tutorials/midi/audio";

        // @ts-ignore
        let useCustomPath = (PQ_MIDI.config && PQ_MIDI.config.audio && PQ_MIDI.config.audio.path)
        if(!useCustomPath) { return basePath; }
        
        // @ts-ignore
        basePath = PQ_MIDI.config.audio.path;
        if(basePath.charAt(basePath.length-1) == "/") { basePath.slice(0, -1); }
        return basePath;
    }

    setupContext()
    {
        // @ts-ignore
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // To ensure audio suspends when you switch away
        // (and it matches the requestAnimatioFrame that does the same)
        document.addEventListener("visibilitychange", (ev) => {
            if (document.visibilityState === "visible") {
                this.ctx.resume();
            } else {
                this.ctx.suspend();
            }
        });
    }

    getContext()
    {
        return this.ctx;
    }

    getAudioForPitch(pitch:string)
    {
        return this.audioBuffer[pitch];
    }

    hasResource(pitch:string)
    {
        return (pitch in this.audioBuffer);
    }

    checkAndLoadResources(pitches:string[])
    {
        let promises = [];
        for(const pitch of pitches)
        {
            if(this.hasResource(pitch)) { continue; }
            promises.push(this.loadResource(pitch));
        }

        // @ANNOYING
        // if we start playing IMMEDIATELY after loading, it might skip the first note on some systems
        // add a slight delay to make sure it works
        const mustLoadSomething = promises.length > 0;
        if(mustLoadSomething)
        {
            const delayDurationMs = 50;
            const delayPromise = new Promise(resolve => { setTimeout(() => { resolve('resolved'); }, delayDurationMs); });
            promises.push(delayPromise);
        }

        return Promise.all(promises);
    }

    loadResource(pitch:string)
    {
        const urlPitch = pitch.replace("#", "p");
        const file = this.getFilePath()  + "/" + urlPitch + ".ogg";

        const xhr = new XMLHttpRequest();
        xhr.open('GET', file, true);
        xhr.responseType = 'arraybuffer';

        const that = this;
        return new Promise((resolve, reject) => {
            xhr.onload = function()
            {
                const notFound = this.response.byteLength <= 24;
                if(notFound) { return; }
    
                that.getContext().decodeAudioData(
                    this.response, 
                    (b) => { that.audioBuffer[pitch] = b; resolve(true); }, 
                    (e) => { console.warn(e); reject(false); }
                );
            }
            xhr.onerror = () => { reject(false); };   
            xhr.send(); 
        });
    }

    getGainNodeWithCreate(id:number) : GainNode
    {
        if(id < 0) { console.error("Can't play sound at track ", id); return; }
        if(id < this.gainNodes.length) { return this.gainNodes[id]; }

        while(this.gainNodes.length <= id)
        {
            const gainNode = this.ctx.createGain();
            gainNode.connect(this.ctx.destination);
            this.gainNodes.push(gainNode);
        }

        return this.gainNodes[id];
    }

    playSound(id:number, note) : AudioBufferSourceNode
    {
        if (this.ctx.state === "suspended") { this.ctx.resume(); }

        const gainNode = this.getGainNodeWithCreate(id);
        var source = this.ctx.createBufferSource();
        source.buffer = this.getAudioForPitch(note.pitch);

        source.connect(gainNode);
        source.start();

        const curTime = this.ctx.currentTime;
        const stopTime = curTime + note.duration;
        source.stop(stopTime);

        const startVolume = note.convertVolumeToGain(note.volumeStart);
        const endVolume = note.convertVolumeToGain(note.volumeEnd);

        // to prevent clicks and pops
        gainNode.gain.exponentialRampToValueAtTime(startVolume, curTime + 0.03);
        gainNode.gain.setValueAtTime(endVolume, stopTime - 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

        return source;
    }
}

const a = new AudioLoader();
export default a;