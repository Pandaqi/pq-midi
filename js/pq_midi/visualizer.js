export default class Visualizer {
    constructor(canvas, parser, config, visualConfig)
    {
        this.canvas = canvas;
        this.visualConfig = visualConfig;
        this.pitchGrid = {};
        this.timeGrid = {};

        this.setupGrid(parser, config);
        this.refresh(parser);
    }

    setupGrid(parser, config)
    {
        const pitchMargin = this.visualConfig.pitch.emptyPitchesAround;
        const pitches = parser.getPitches(pitchMargin, config).reverse();

        const numPitches = pitches.length;
        const maxPitches = config.getAllNotes().length;
        let desiredBarHeight = 60 - 25 * (numPitches/maxPitches);
        desiredBarHeight *= this.visualConfig.pitch.verticalScale;

        this.canvas.height =  desiredBarHeight * numPitches;

        this.pitchGrid = {
            pitches: pitches,
            barHeight: this.canvas.height / pitches.length,
            barWidth: this.canvas.width
        }

        const duration = parser.getDuration();
        const secondsPerMeasure = config.getSecondsPerMeasure();

        this.timeGrid = {
            barHeight: this.canvas.height,
            subdivisions: config.getBeatsPerMeasure(),
            pixelsPerSecond: (this.pitchGrid.barWidth / duration),
            numMeasures: (duration / secondsPerMeasure),
            secondsPerMeasure: secondsPerMeasure,
        }

        this.timeGrid.pixelsPerMeasure = (this.pitchGrid.barWidth / this.timeGrid.numMeasures);
    }

    refresh(parser, player = null)
    {
        this.clearCanvas();
        this.drawPitchGrid(parser);
        this.drawTimeGrid(parser);
        this.drawTracks(parser, player);
        this.drawTimeCursor(player);
    }

    clearCanvas()
    {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawTimeCursor(player = null)
    {
        const ctx = this.canvas.getContext('2d');
        let curTime = player ? player.time : 0;

        let cursorWidth = this.visualConfig.time.cursorWidth;
        ctx.fillStyle = this.visualConfig.time.cursorColor;
        ctx.fillRect(curTime * this.timeGrid.pixelsPerSecond, 0, cursorWidth, this.canvas.height);
    }

    drawPitchGrid(parser)
    {
        const ctx = this.canvas.getContext('2d');
        
        let barHeight = this.pitchGrid.barHeight;
        let barWidth = this.pitchGrid.barWidth;
        let textMargin = this.visualConfig.pitch.textMargin;
        let fontSize = this.visualConfig.font.size;

        for(const [i, pitch] of Object.entries(this.pitchGrid.pitches))
        {
            ctx.fillStyle = (i % 2 == 0) ? this.visualConfig.pitch.barLight : this.visualConfig.pitch.barDark;
            ctx.fillRect(0, i*barHeight, barWidth, barHeight);

            ctx.font = fontSize + "px " + this.visualConfig.font.family;
            ctx.fillStyle = (i % 2 == 0) ? this.visualConfig.font.light : this.visualConfig.font.dark;
            ctx.fillText(pitch, textMargin, i*barHeight + fontSize + 0.5*(barHeight - fontSize));
        }
    }

    drawTimeGrid(parser)
    {
        const ctx = this.canvas.getContext('2d');
        ctx.font = this.visualConfig.font.size + "px " + this.visualConfig.font.family;
        ctx.fillStyle = this.visualConfig.font.light; // time stamps always on top row = light

        const textMarginX = this.visualConfig.time.textMargin;
        const textMarginY = this.visualConfig.font.size;

        for(let i = 0; i < this.timeGrid.numMeasures; i++)
        {
            for(let j = 0; j < this.timeGrid.subdivisions; j++)
            {
                let fraction = (j / this.timeGrid.subdivisions);
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

    drawTracks(parser, player = null)
    {
        for(const [id, track] of Object.entries(parser.getNotes()))
        {
            this.drawTrack(id, track, player);
        }
    }

    drawTrack(id, track, player = null)
    {
        let ctx = this.canvas.getContext('2d');

        const barHeight = this.pitchGrid.barHeight;
        const pixelsPerSecond = this.timeGrid.pixelsPerSecond;
        let curTime = player ? player.time : -1;
        
        for(const note of track)
        {
            if(!note.useVisual) { continue; }

            ctx.fillStyle = this.visualConfig.getTrackColor(id);
            ctx.shadowBlur = this.visualConfig.pitch.shadowSize;
            ctx.shadowColor = this.visualConfig.pitch.shadowColor;

            let pitchIsActive = (note.timeStart <= curTime && note.timeEnd >= curTime);
            if(pitchIsActive) { 
                ctx.fillStyle = this.visualConfig.getTrackColor(id, 30);
                ctx.shadowColor = "black";
            }

            const idx = this.pitchGrid.pitches.indexOf(note.pitch);
            const barWidth = note.duration * pixelsPerSecond;
            const noteStart = note.timeStart * pixelsPerSecond;
            const y = idx*barHeight;
            ctx.fillRect(noteStart, y, barWidth, barHeight);

            ctx.lineWidth = 4;
            ctx.strokeStyle = this.visualConfig.getTrackColor(id, -30);
            ctx.strokeRect(noteStart, y, barWidth, barHeight);
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
    }
}
