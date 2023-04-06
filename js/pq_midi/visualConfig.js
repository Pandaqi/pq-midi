// VisualConfig => holds general data about the visual side (calculated once, passed around as needed)
export default class VisualConfig {
    constructor(params, numTracks)
    {
        this.colorOffset = Math.round(Math.random()*360);
        this.colorInterval = 360 / numTracks;
        
        for (var key in params) {
            if(!params[key]) { continue; }
            this[key] = params[key];
        }

        this.font = {
            light: "#BBBBBB",
            dark: "#999999",
            size: 30,
            family: "Dosis"
        }
        Object.assign(this.font, params.font || {});

        this.pitch = {
            barLight: "transparent",
            barDark: "#DDDDDD",
            emptyPitchesAround: 2,
            textMargin: 20,
            shadowSize: 10,
            shadowColor: "#666666",
            verticalScale: 1.0
        };
        Object.assign(this.pitch, params.pitch || {});

        this.time = {
            lineWidth: 6,
            textMargin: 20,
            cursorColor: "#0000FF",
            cursorWidth: 6
        };
        Object.assign(this.time, params.time || {})
    }

    getTrackColor(trackNum, change = 0)
    {
        const hue = (this.colorOffset + this.colorInterval * trackNum) % 360;
        const sat = 100;
        const brightness = 50 + change;
        const col = "hsl(" + hue + ", " + sat + "%, " + brightness + "%)";
        return col;
    }
};