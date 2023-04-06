# To Do

## Annoying

* I need to make an exception at playSound for the “M” (metronome clicks), otherwise after the first one, the audio remains at 0 volume. Figure out WHY so we can actually fix the issue.
  * I guess it’s because the next sound plays before the previous one is properly finished.
  * Maybe I should change how tracks are played. Remember when the previous note was about to stop and only play the next note when that has happened?

## Niceties

* Allow setting multiple instruments in Hugo + actually listening to that (of course)
* Add in Shortcode, Grab from dataset when creating Config, change PATH to the sound being played, save multiple audioBuffers on LOADER
* Changing tempo/key midway
* *Multiline. (It automatically wraps the canvas or creates more MIDI elements? Nah, this seems hard.)
* Make it interactive?
  * Allow dragging, placing new, and resizing
  * Register click => convert to place on timeline
  * If something there, erase and overwrite
  * While dragging, grow to match cursor position
  * When released, fix the new note into place
  * Disallow overlapping other notes in the existing track. (Add button to create new tracks)