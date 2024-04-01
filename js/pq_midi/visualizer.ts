import Config from "./config";
import Player from "./player";
import Point from "./point"
import TimelineData from "./timelineData"
import { Track } from "./tracks";
import VisualConfig from "./visualConfig";

interface PitchGridParams
{
    pitches?: string[],
    barHeight?: number,
    barWidth?: number
}

interface TimeGridParams
{
    duration?: number,
    barHeight?: number,
    subdivisions?: number,
    snapResolution?: number,
    pixelsPerSecond?: number,
    numMeasures?: number,
    secondsPerMeasure?: number,
    pixelsPerMeasure?: number
}

export default class Visualizer 
{
    player: Player;
    config: Config;
    visualConfig: VisualConfig;
    pitchGrid: PitchGridParams;
    timeGrid: TimeGridParams;
    canvasBaseResolution: { width: number; height: number; };
    canvas: HTMLCanvasElement;

    constructor(player:Player, config:Config, visualConfig:VisualConfig)
    {
        this.player = player;
        this.player.getContainer().addEventListener("refresh", (ev) => { this.refresh(); });

        this.config = config;
        this.visualConfig = visualConfig;
        this.pitchGrid = {};
        this.timeGrid = {};
        this.canvasBaseResolution = { width: 1920, height: 1080 };

        this.createCanvas();
        this.refresh();
    }

    createCanvas()
    {
        const canv = document.createElement("canvas");
        canv.width = this.canvasBaseResolution.width;
        canv.height = this.canvasBaseResolution.height;
        canv.classList.add("midi-canvas");
        canv.style.width = "100%";

        this.canvas = canv;
        this.player.getContainer().appendChild(canv);
    }

    setupGrid()
    {
        const pitchMargin = this.visualConfig.pitch.emptyPitchesAround;
        const pitches = this.player.tracks.getPitches(pitchMargin, this.config).reverse();

        const numPitches = pitches.length;
        const maxPitches = this.config.getAllNotes().length;
        let desiredBarHeight = 60 - 25 * (numPitches/maxPitches);
        desiredBarHeight *= this.visualConfig.pitch.verticalScale;

        this.canvas.height = desiredBarHeight * numPitches;

        this.pitchGrid = {
            pitches: pitches,
            barHeight: this.canvas.height / pitches.length,
            barWidth: this.canvas.width
        }

        const duration = this.player.tracks.getDuration();
        const secondsPerMeasure = this.config.getSecondsPerMeasure();

        this.timeGrid = {
            duration: duration,
            barHeight: this.canvas.height,
            subdivisions: this.config.getBeatsPerMeasure(),
            snapResolution: this.config.getGridResolution(),
            pixelsPerSecond: (this.pitchGrid.barWidth / duration),
            numMeasures: (duration / secondsPerMeasure),
            secondsPerMeasure: secondsPerMeasure,
        }

        this.timeGrid.pixelsPerMeasure = (this.pitchGrid.barWidth / this.timeGrid.numMeasures);
    }

    refresh(refreshGrid = true)
    {
        if(refreshGrid) { this.setupGrid(); }

        this.clearCanvas();
        this.drawPitchGrid();
        this.drawTimeGrid();
        this.drawTracks();
        this.drawTimeCursor();
    }

    setGridResolution(val:number)
    {
        this.config.setGridResolution(val);
        this.player.requestRefresh();
    }

    getCanvasResolution()
    {
        return { width: this.canvas.width, height: this.canvas.height };
    }

    convertPixelsToSeconds(pixels:number)
    {
        return pixels / this.timeGrid.pixelsPerSecond;
    }

    getTimelineDataFromCanvasPos(canvasPos:Point)
    {
        const pitchIndex = Math.floor(canvasPos.y / this.pitchGrid.barHeight);
        let pitch = this.pitchGrid.pitches[pitchIndex];
        pitch = this.config.clampPitchToAvailableAudio(pitch);
        const time = (canvasPos.x / this.pitchGrid.barWidth) * this.timeGrid.duration;
        return new TimelineData(time, pitch);
    }

    getPosFromEvent(ev)
    {
        const p = new Point();
        const offset = this.canvas.getBoundingClientRect();
        p.move(new Point({ x: -offset.left, y: -offset.top }));

        if(ev.type == 'touchstart' || ev.type == 'touchmove' || ev.type == 'touchend' || ev.type == 'touchcancel')
        {
            var evt = (typeof ev.originalEvent === 'undefined') ? ev : ev.originalEvent;
            var touch = evt.touches[0] || evt.changedTouches[0];
            p.move(new Point({ x: touch.clientX, y: touch.clientY }));
        } else if (ev.type == 'mousedown' || ev.type == 'mouseup' || ev.type == 'mousemove' || ev.type == 'mouseover'|| ev.type == 'mouseout' || ev.type == 'mouseenter' || ev.type=='mouseleave' || ev.type=='auxclick' || ev.type=='contextmenu' ) {
            p.move(new Point({ x: ev.clientX, y: ev.clientY }));
        } 
        
        const finalPos = this.convertRealPosToCanvasPos(p);
        return finalPos;
    }

    convertRealPosToCanvasPos(realPos:Point)
    {
        const displaySize = this.canvas.getBoundingClientRect();
        const underlyingSize = this.getCanvasResolution();

        const scaleVector = new Point().setXY(
            underlyingSize.width / displaySize.width,
            underlyingSize.height / displaySize.height
        );

        return realPos.clone().scale(scaleVector);
    }

    convertCanvasPosToRealPos(canvasPos:Point)
    {
        const displaySize = this.canvas.getBoundingClientRect();
        const underlyingSize = this.getCanvasResolution();

        const scaleVector = new Point().setXY(
            displaySize.width / underlyingSize.width,
            displaySize.height / underlyingSize.height
        );

        return canvasPos.clone().scale(scaleVector);
    }

    getCanvas() { return this.canvas; }
    clearCanvas()
    {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawTimeCursor()
    {
        const ctx = this.canvas.getContext('2d');
        let curTime = this.player.time;

        let cursorWidth = this.visualConfig.time.cursorWidth;
        ctx.fillStyle = this.visualConfig.time.cursorColor;
        ctx.fillRect(curTime * this.timeGrid.pixelsPerSecond, 0, cursorWidth, this.canvas.height);
    }

    drawPitchGrid()
    {
        const ctx = this.canvas.getContext('2d');
        
        let barHeight = this.pitchGrid.barHeight;
        let barWidth = this.pitchGrid.barWidth;
        let textMargin = this.visualConfig.pitch.textMargin;
        let fontSize = this.visualConfig.font.size;

        const allPitches : Record<number, string> = this.pitchGrid.pitches;

        for(const [index, pitch] of Object.entries(allPitches))
        {
            const i = parseInt(index);
            ctx.fillStyle = (i % 2 == 0) ? this.visualConfig.pitch.barLight : this.visualConfig.pitch.barDark;
            ctx.fillRect(0, i*barHeight, barWidth, barHeight);

            ctx.font = fontSize + "px " + this.visualConfig.font.family;
            ctx.fillStyle = (i % 2 == 0) ? this.visualConfig.font.light : this.visualConfig.font.dark;
            ctx.fillText(pitch, textMargin, i*barHeight + fontSize + 0.5*(barHeight - fontSize));
        }
    }

    drawTimeGrid()
    {
        const ctx = this.canvas.getContext('2d');
        ctx.font = this.visualConfig.font.size + "px " + this.visualConfig.font.family;
        ctx.fillStyle = this.visualConfig.font.light; // time stamps always on top row = light

        const textMarginX = this.visualConfig.time.textMargin;
        const textMarginY = this.visualConfig.font.size;

        const subdiv = this.timeGrid.subdivisions * this.timeGrid.snapResolution;

        for(let i = 0; i < this.timeGrid.numMeasures; i++)
        {
            for(let j = 0; j < subdiv; j++)
            {
                let fraction = (j / subdiv);
                let x = (i + fraction)*this.timeGrid.pixelsPerMeasure;
                
                let width = this.visualConfig.time.lineWidth;
                if(j != 0) { width *= 0.33; }
                
                ctx.fillRect(x, 0, width, this.timeGrid.barHeight);

                if(j == 0 && i != 0)
                {
                    let curTime = this.timeGrid.secondsPerMeasure * i;
                    curTime = Math.round(curTime*10)/10;
                    ctx.fillText(curTime + "s", x + textMarginX, 0 + textMarginY);
                }
                
            }
        }
    }

    drawTracks()
    {
        const curTracks = this.player.tracks.read();
        for(const [id, track] of Object.entries(curTracks))
        {
            this.drawTrack(parseInt(id), track);
        }
    }

    drawTrack(id:number, track:Track)
    {
        let ctx = this.canvas.getContext('2d');

        const barHeight = this.pitchGrid.barHeight;
        const pixelsPerSecond = this.timeGrid.pixelsPerSecond;
        let curTime = this.player.time;
        if(curTime <= 0.001) { curTime = -1; }

        const numTracks = this.player.tracks.count();
        const interactor = this.player.interactor;
        
        for(const note of track)
        {
            if(!note.useVisual) { continue; }

            ctx.fillStyle = this.visualConfig.getTrackColor(id, 0, numTracks);
            ctx.shadowBlur = this.visualConfig.pitch.shadowSize;
            ctx.shadowColor = this.visualConfig.pitch.shadowColor;

            const noteBeingPlayed = (note.timeStart <= curTime && note.timeEnd >= curTime);
            const noteBeingEdited = interactor && interactor.isNoteSelected(note);

            let noteIsActive = (noteBeingPlayed || noteBeingEdited);
            if(noteIsActive) { 
                ctx.fillStyle = this.visualConfig.getTrackColor(id, 30, numTracks);
                ctx.shadowColor = "black";
            }

            const idx = this.pitchGrid.pitches.indexOf(note.pitch);
            const barWidth = note.duration * pixelsPerSecond;
            const noteStart = note.timeStart * pixelsPerSecond;
            const y = idx*barHeight;
            ctx.fillRect(noteStart, y, barWidth, barHeight);

            ctx.lineWidth = 4;
            ctx.strokeStyle = this.visualConfig.getTrackColor(id, -30, numTracks);
            ctx.strokeRect(noteStart, y, barWidth, barHeight);
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
    }
}
