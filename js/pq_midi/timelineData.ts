export default class TimelineData
{
    time: number;
    timeOffset: number;
    pitch: string;

    constructor(time:number, pitch:string)
    {
        this.time = time;
        this.timeOffset = 0;
        this.pitch = pitch;
    }

    setTimeOffset(to:number) { this.timeOffset = to; }
    getTimeOffset() { return this.timeOffset; }

    getTime() { return this.time; }
    getPitch() { return this.pitch; }
}