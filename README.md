# 2048 implemented with React Three Fiber

## Prerequisites
* `node` - v18 was used during development
* `npm i` - to install dependencies

## Commands
* `npm run start` - To run the game in development mode, with live reloading in the
browser. Press the arrow keys to play.
* `npm run test` - To run the game's tests.

## Technologies
* Typescript + ESLint + Prettier
* React
* Jest - unit tests
* React Three Fiber - React wrapper for THREE.JS
* GLSL - Custom tweaks made to the THREE.JS MeshLambertMaterial shader to combine the
number texture and background color exactly how I wanted and to give a nice floaty effect
to the blocks.
* GSAP - animations

## State improvements
The Grid state is a deeply nested object, which made referential integrity state updates
a bit more challenging. The grid is currently shallow cloned on each update before
mutating the copy, which seems to give the best blend of immutability for reactive state
changes and ease-of-use. Potentially it could be reworked to multiple shallow nested state
properties, which reference one another, eg. a separate `blocks` key on state with a
dictionary of all blocks keyed by id, then the id of the block need only be stored in each
grid cell.
