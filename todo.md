# To Do

# Interactive

UI BUG: If setting changed from outside (like #measures being reset, or canvas cleared and thus #layers set to 0), the UI control doesn't update with it! => Use CustomEvents, connect those inputs, so they're notified on changes

## Niceties

* Allow pausing + moving cursor to any spot
  * On click, check how far we moved from start point
  * If not far at all, it must be a quick click, so move cursor there
  * Then allow playing from current cursor (instead of auto-resetting)

* DOWNLOAD the resulting melody?
 * Just copy my code for PQ_DAW, waaay simplified for this project

* Allow setting multiple instruments in Hugo + actually listening to that (of course)
  * Add in Shortcode, Grab from dataset when creating Config, change PATH to the sound being played, save multiple audioBuffers on LOADER
* Changing tempo/key midway
* Scrolling (to allow much longer melodies)
  * Allow very wide canvas
  * Put it inside a container with scroll-x
  * Automatically scroll to keep the current cursor within view (as it's playing) 