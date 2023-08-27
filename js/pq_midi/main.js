import Player from "./player"

window.PQ_MIDI = {};

window.addEventListener('load', function () {
    const players = [];
    const midiPlayers = document.getElementsByClassName("midi-player");
    for(let i = 0; i < midiPlayers.length; i++)
    {
        const midiPlayer = midiPlayers[i];
        players.push(new Player(i, midiPlayer));
    }
})

