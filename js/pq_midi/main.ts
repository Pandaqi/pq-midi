import Player from "./player"

// @ts-ignore
window.PQ_MIDI = {};

window.addEventListener('load', function () {
    const players : Player[] = [];
    const midiPlayers = Array.from(document.getElementsByClassName("midi-player")) as HTMLElement[];
    for(let i = 0; i < midiPlayers.length; i++)
    {
        const midiPlayer = midiPlayers[i];
        players.push(new Player(i, midiPlayer));
    }
})

