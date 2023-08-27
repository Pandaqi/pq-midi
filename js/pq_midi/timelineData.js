export default class TimelineData
{
    constructor(time, pitch)
    {
        this.time = time;
        this.timeOffset = 0;
        this.pitch = pitch;
    }

    setTimeOffset(to) { this.timeOffset = to; }
    getTimeOffset() { return this.timeOffset; }

    getTime() { return this.time; }
    getPitch() { return this.pitch; }
}