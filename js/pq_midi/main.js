import Player from "./player"

window.PQ_MIDI = {};

window.addEventListener('load', function () {
    // add events to all midi players
    const players = [];
    const midiPlayers = document.getElementsByClassName("midi-player");
    for(let i = 0; i < midiPlayers.length; i++)
    {
        const data = midiPlayers[i].getElementsByClassName("midi-data")[0];
        const canvas = midiPlayers[i].getElementsByClassName("midi-canvas")[0];
        const metadata = midiPlayers[i].getElementsByClassName("midi-player-metadata")[0];

        players.push(new Player(i, data, canvas, metadata));
    }
})

