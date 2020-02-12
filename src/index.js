import { init, workloop } from "./lib/worker";

console.log('Starting up mongodb-sidecar');

init(
  err => {
    if (err) {
      console.error('Error trying to initialize mongodb-sidecar', err);
      return;
    }

    workloop();
  }
);
