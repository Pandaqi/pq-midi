import Note from "./note"
import Point from "./point";
import TimelineData from "./timelineData";
import Tracks from "./tracks";
import Visualizer from "./visualizer";

export default class Interactor
{
    tracks: Tracks;
    visualizer: Visualizer;
    clicked: boolean;
    lastClickPos: Point;
    noteSelected: Note;
    noteSelectedTimeOffset: number;
    noteNewStart: number;
    NOTE_EDGE_GRAB_THRESHOLD: number;
    action: string;

    constructor(tracks:Tracks, visualizer:Visualizer)
    {
        this.tracks = tracks;
        this.visualizer = visualizer;

        this.clicked = false;
        this.lastClickPos = null;
        this.noteSelected = null;
        this.noteSelectedTimeOffset = 0.0;
        this.noteNewStart = 0.0;

        // how many pixels from edge you can resize the start/end (instead of moving the whole note)
        this.NOTE_EDGE_GRAB_THRESHOLD = 50;

        // ACTIONS: move, moveStart, moveEnd, create
        // Right-click, or making notes 0 time, destroys them
        this.action = null; 

        this.attachMouseEvents();
    }

    attachMouseEvents()
    {
        const canv = this.visualizer.getCanvas();
        canv.addEventListener('mousedown', this.onClickStart.bind(this), true);
        canv.addEventListener('touchstart', this.onClickStart.bind(this), true);

        canv.addEventListener('mousemove', this.onClickMove.bind(this), true);
        canv.addEventListener('touchmove', this.onClickMove.bind(this), true);

        canv.addEventListener('mouseup', this.onClickEnd.bind(this), true);
        canv.addEventListener('touchend', this.onClickEnd.bind(this), true);

        canv.addEventListener('mouseleave', this.onClickCancel.bind(this), true);
        canv.addEventListener('touchcancel', this.onClickCancel.bind(this), true);

        canv.addEventListener("auxclick", this.onAuxiliaryClick.bind(this), true);
        canv.addEventListener("contextmenu", this.onRightClick.bind(this), true);
    }

    getTimelineDataUnderneathCursor(ev)
    {
        const pos = this.visualizer.getPosFromEvent(ev);
        const data = this.visualizer.getTimelineDataFromCanvasPos(pos);
        data.setTimeOffset(this.noteSelectedTimeOffset);
        return data;
    }

    getNoteUnderneathCursor(ev)
    {
        const data = this.getTimelineDataUnderneathCursor(ev);
        const note = this.tracks.findNoteAtTimelineData(data);
        return note;
    }

    createNewNoteFromTimelineData(data:TimelineData)
    {
        const timeRaw = data.getTime();
        const timeSnapped = this.tracks.snapToTimeGrid(timeRaw);
        const note = new Note(data.getPitch(), timeSnapped, 0);
        return note;
    }

    onRightClick(ev)
    {
        this.cancelEvent(ev);
        return false;
    }

    onAuxiliaryClick(ev)
    {
        const note = this.getNoteUnderneathCursor(ev);
        this.removeNote(note);
        this.cancelEvent(ev);
        return false;
    }

    cancelEvent(ev)
    {
        ev.preventDefault();
        ev.stopPropagation();
    }

    onClickStart(ev)
    {
        if(this.clicked) { return; }
        this.cancelEvent(ev);
        
        this.clicked = true;
        
        const pos = this.visualizer.getPosFromEvent(ev);
        this.lastClickPos = pos;

        const data = this.getTimelineDataUnderneathCursor(ev);
        this.noteSelected = this.getNoteUnderneathCursor(ev);
        this.noteSelectedTimeOffset = 0;

        if(this.noteSelected) {
            this.noteSelectedTimeOffset = this.noteSelected.getTimeStart() - data.getTime();
            this.action = "move";

            const noteDuration = this.noteSelected.getDuration();
            let grabThreshold = this.visualizer.convertPixelsToSeconds(this.NOTE_EDGE_GRAB_THRESHOLD);
            const grabAreaCoversTooMuch = 2*grabThreshold >= 0.75*noteDuration;
            if(grabAreaCoversTooMuch) { grabThreshold = 0.25 * noteDuration; }

            const dragStart = Math.abs(this.noteSelectedTimeOffset) <= grabThreshold;
            const dragEnd = Math.abs(this.noteSelectedTimeOffset) >= (noteDuration - grabThreshold)

            if(dragStart) { this.action = "moveStart"; }
            if(dragEnd) { this.action = "moveEnd"; }
        } else {
            this.action = "create";
            const newNote = this.createNewNoteFromTimelineData(data);
            this.noteSelected = newNote;
            this.noteNewStart = newNote.getTimeStart();
            this.tracks.addNote(newNote);
        }
        return false;
    }

    onClickMove(ev)
    {
        if(!this.clicked) { return; }
        if(!this.action) { return; }
        this.cancelEvent(ev);

        const pos = this.visualizer.getPosFromEvent(ev);
        this.lastClickPos = pos;

        const data = this.getTimelineDataUnderneathCursor(ev);

        if(this.action == "move") { this.moveNote(this.noteSelected, data); }
        else if(this.action == "moveStart") { this.moveNote(this.noteSelected, data, "start"); }
        else if(this.action == "moveEnd") { this.moveNote(this.noteSelected, data, "end"); }
        else if(this.action == "create") { this.moveNote(this.noteSelected, data, "end"); }
        return false;
    }

    onClickEnd(ev)
    {
        if(!this.clicked) { return; }
        this.cancelEvent(ev);
        
        this.clicked = false;
        this.lastClickPos = null;

        if(this.noteSelected) {
            this.noteSelected.putStartEndInCorrectOrder();
            if(this.noteSelected.isEmpty()) { this.removeNote(this.noteSelected); }
        }

        this.noteSelected = null;
        this.noteSelectedTimeOffset = 0;
        this.action = "";

        // @TODO: not great, should request a refresh ourselves in a clean way
        this.tracks.onChange();
        return false;
    }

    onClickCancel()
    {
        if(!this.clicked) { return; }
        this.onClickEnd(null);
        return false;
    }

    isNoteSelected(note:Note) { return this.noteSelected == note; }

    moveNote(note:Note, timelineData:TimelineData, side = "both")
    {
        if(!note) { return; }
        this.tracks.moveNoteTo(note, timelineData, side);
    }

    removeNote(note:Note)
    {
        if(!note) { return;}
        this.tracks.removeNote(note);
    }
}