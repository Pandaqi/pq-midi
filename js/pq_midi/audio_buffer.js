if(!window.PQ_MIDI) { window.PQ_MIDI = {}; }

PQ_MIDI.AudioLoader = class {
    constructor()
    {
        this.ctx = null;
        this.audioBuffer = {};
        this.basePath = "/tutorials/midi/audio";

        let useCustomPath = (PQ_MIDI.config && PQ_MIDI.config.audio)
        if(useCustomPath)
        {
            this.basePath = PQ_MIDI.config.audio.path;
            if(basePath.charAt(path.length-1) == "/") { basePath.slice(0, -1); }
        }
        this.setupContext();
    }

    setupContext()
    {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // To ensure audio suspends when you switch away
        // (and it matches the requestAnimatioFrame that does the same)
        document.addEventListener("visibilitychange", event => {
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

    getAudioForPitch(pitch)
    {
        return this.audioBuffer[pitch];
    }

    hasResource(pitch)
    {
        return (pitch in this.audioBuffer);
    }

    createGainNodes(num)
    {
        const arr = [];
        for(let i = 0; i < num; i++)
        {
            const gainNode = this.ctx.createGain();
            gainNode.connect(this.ctx.destination);
            arr.push(gainNode);
        }
        return arr;
    }

    checkAndLoadResources(pitches)
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
            const delayPromise = new Promise(
                resolve => {
                    setTimeout(() => {
                        resolve('resolved');
                    }, 50);
                }
            );
            promises.push(delayPromise);
        }

        return Promise.all(promises);
    }

    loadResource(pitch)
    {
        const urlPitch = pitch.replace("#", "p");
        const file = this.basePath + "/" + urlPitch + ".ogg";

        const xhr = new XMLHttpRequest();
        xhr.open('GET', file, true);
        xhr.responseType = 'arraybuffer';

        const that = this;
        return new Promise((resolve, reject) => {
            xhr.onload = function()
            {
                let notFound = this.response.byteLength <= 24;
                if(notFound) { return; }
    
                PQ_MIDI.AUDIO_BUFFER.getContext().decodeAudioData(
                    this.response, 
                    function (b) { that.audioBuffer[pitch] = b; resolve(true); }, 
                    function (e) { console.warn(e); reject(false); }
                );
            }
            xhr.onerror = function () { reject(false); };   
            xhr.send(); 
        });
    }

    playSound(id, note, gainNode)
    {
        if (this.ctx.state === "suspended") { this.ctx.resume(); }

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
        if(note.pitch != "M") { gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime); }

        return source;
    }
}

PQ_MIDI.AUDIO_BUFFER = new PQ_MIDI.AudioLoader();
