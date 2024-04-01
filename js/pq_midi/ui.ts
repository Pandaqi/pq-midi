import Config from "./config";
import Player from "./player";

interface UIParams
{
    node?: HTMLElement,
    text?: string,
    title?: string,
    value?: any,
    callback?: Function,
    min?: number,
    max?: number,
    suffix?: string
    type?: string,
    fakeEvent?: boolean
}

export default class UI
{
    player: Player;
    node: HTMLDivElement;
    playButton: HTMLButtonElement;
    clearButton: HTMLButtonElement;
    resetButton: HTMLButtonElement;
    feedbackLabel: HTMLDivElement;
    
    constructor(player:Player, config:Config)
    {
        this.player = player;
        this.createHTML(config);
    }

    createHTML(config:Config)
    {
        const cont = document.createElement("div");
        this.player.getContainer().appendChild(cont);
        cont.classList.add("midi-player-metadata");
        this.node = cont;

        const buttons = document.createElement("div");
        buttons.classList.add("midi-ui-buttons");
        cont.appendChild(buttons);

        // Play/Stop button
        const btn = document.createElement("button");
        buttons.appendChild(btn);
        btn.innerHTML = "Play/Stop";
        btn.title = "Plays and stops the audio";
        btn.classList.add("midi-button-play");
        this.playButton = btn;

        // Clear whole canvas button
        const clearBtn = document.createElement("button");
        buttons.appendChild(clearBtn);
        clearBtn.innerHTML = "Clear";
        clearBtn.title = "Removes the entire melody";
        clearBtn.addEventListener("click", (ev) => { this.player.clear(); })
        this.clearButton = clearBtn;

        // Reset to original melody
        const resetBtn = document.createElement("button");
        buttons.appendChild(resetBtn);
        resetBtn.innerHTML = "Reset";
        resetBtn.title = "Resets to the original melody";
        resetBtn.addEventListener("click", (ev) => { this.player.tracks.reset(); })
        this.resetButton = resetBtn;

        // On/Off toggles for helpful tools
        let params : UIParams = {
            node: buttons,
            text: "Loop?",
            title: "If enabled, loops the audio: when done, it immediately plays again from the start.",
            value: config.shouldLoop(),
            callback: (isOn) => { config.setLoop(isOn); }
        }
        this.createToggleButton(params);

        params.text = "Snap?";
        params.value = config.shouldSnap();
        params.title = "If enabled, you can only move/add/resize notes perfectly in line with the time grid.";
        params.callback = (isOn) => { config.setSnap(isOn); }
        this.createToggleButton(params);

        params.text = "Metronome?";
        params.value = config.useMetronome();
        params.title = "If enabled, a metronome clicks to help you with the beat";
        params.callback = (isOn) => { config.setMetronome(isOn); }
        this.createToggleButton(params);

        // Metadata (Grid Resolution + Measures + Tempo + Time Signature)
        const metadata = document.createElement("div");
        metadata.classList.add("midi-ui-inputs");
        cont.appendChild(metadata);

        params = {
            node: metadata,
            text: "#Snap Lines",
            title: "Sets how fine the grid is (both visually and when snapping notes)",
            min: config.GRID_RESOLUTION_BOUNDS.min,
            max: config.GRID_RESOLUTION_BOUNDS.max,
            value: config.getGridResolution(),
            callback: (val) => {
                this.player.visualizer.setGridResolution(val);
            }
        }
        this.addInputLabel(params);
        
        const numMeasures = this.player.tracks.getNumMeasures();
        params = {
            node: metadata,
            text: "#Measures",
            title: "Sets the duration of the melody",
            min: config.MEASURE_BOUNDS.min,
            max: config.MEASURE_BOUNDS.max,
            value: numMeasures,
            callback: (val) => {
                this.player.tracks.setDurationFromMeasures(val);
            }
        }
        this.addInputLabel(params);

        params = {
            node: metadata,
            text: "Tempo",
            suffix: "BPM",
            title: "Sets the speed at which the melody is played",
            min: config.BPM_BOUNDS.min,
            max: config.BPM_BOUNDS.max,
            value: config.getTempoBPM(),
            callback: (val) => { 
                const changeFactor = config.setTempoBPM(val); 
                this.player.tracks.stretchTempoByFactor(changeFactor);
            }
        }
        this.addInputLabel(params);

        params = {
            node: metadata,
            text: "Time",
            suffix: "",
            type: "text",
            title: "Sets the time signature (without changing anything else)",
            value: config.getTimeSignature(),
            callback: (val) => { 
                const change = config.setTimeSignature(val);
                this.player.tracks.changeTimeSignature(change);
            }
        }
        this.addInputLabel(params);

        params = {
            node: metadata,
            text: "Layer",
            suffix: "",
            title: "Selects the layer in which new notes are added. (Go higher to add more layers.)",
            value: this.player.tracks.count(),
            min: config.NUM_TRACKS_BOUNDS.min,
            max: config.NUM_TRACKS_BOUNDS.max,
            fakeEvent: true,
            callback: (val, elem) => { 
                const layerIndex = val - 1;
                const valid = this.player.tracks.setEditableLayer(layerIndex);
                if(!valid) { return; }
                const col = this.player.visualConfig.getTrackColor(layerIndex, 0, this.player.tracks.count());
                elem.style.backgroundColor = col;
            }
        }
        this.addInputLabel(params);

        // feedback
        const fb = document.createElement("div");
        cont.appendChild(fb);
        fb.classList.add("midi-parse-feedback");
        this.feedbackLabel = fb;
    }

    setFeedback(text:string|string[])
    {
        if(Array.isArray(text)) { text = text.join(" | "); }
        this.feedbackLabel.innerHTML = text;
    }

    addInputLabel(params:UIParams)
    {
        const parent = params.node ?? this.node;
        const cont = document.createElement("div");
        cont.classList.add("midi-input-with-label");
        parent.appendChild(cont);

        const title = params.title ?? "";
        cont.title = title;

        let span = document.createElement("span");
        cont.appendChild(span);
        span.innerHTML = params.text ?? "--";
        
        let inp = document.createElement("input");
        cont.appendChild(inp);

        inp.type = params.type ?? "number";
        inp.min = (params.min ?? 0).toString();
        inp.max = (params.max ?? 100).toString();
        
        const avgVal = (parseFloat(inp.min) + parseFloat(inp.max))*0.5;
        inp.value = params.value ?? avgVal;

        if(params.suffix)
        {
            const spanSuffix = document.createElement("span");
            cont.appendChild(spanSuffix);
            spanSuffix.innerHTML = params.suffix;
        }

        const defaultCallback = (val) => {};
        const callback = params.callback ?? defaultCallback;

        inp.addEventListener("input", (ev) => {
            const val = inp.type == "number" ? parseFloat(inp.value) : inp.value;
            callback(val, inp);
        });

        if(params.fakeEvent) { this.fakeChangeInput(inp); }
    }

    setPlayButtonCallback(cb)
    {
        this.playButton.addEventListener("click", cb);
    }

    fakeChangeInput(inp:HTMLElement)
    {
        const fakeEvent = new Event("input");
        inp.dispatchEvent(fakeEvent);
    }

    fakeToggleButton(btn:HTMLButtonElement)
    {
        const fakeEvent = new Event("click");
        btn.dispatchEvent(fakeEvent);
    }

    createToggleButton(params:UIParams)
    {
        const btn = document.createElement("button");
        btn.innerHTML = params.text ?? "ON/OFF";

        const parent = params.node ?? this.node;
        parent.appendChild(btn);

        const title = params.title ?? "";
        btn.title = title;

        const defaultCallback = (isOn) => {};
        const callback = params.callback ?? defaultCallback;

        btn.addEventListener("click", (ev) => {
            if(btn.dataset.toggled) {
                btn.dataset.toggled = "";
            } else {
                btn.dataset.toggled = "toggled";
            }

            const isOn = btn.dataset.toggled == "toggled";
            callback(isOn);
        });

        const defaultValue = params.value ?? false;
        this.fakeToggleButton(btn);
        if(!defaultValue) { this.fakeToggleButton(btn); }
    }

}