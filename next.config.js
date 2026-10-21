// Pin the project root. Without this, Next guesses the root from the first
// lockfile it finds walking up the folders, and a stray lockfile in your home
// directory makes Turbopack treat (and watch) your entire home folder.
/** @type {import('next').NextConfig} */
module.exports = {
  turbopack: {
    root: __dirname,
  },
};
