# interpolation-buffer

## Installation

```
npm install interpolation-buffer
```

## Usage

```ts
import { InterpolationBuffer } from "interpolation-buffer";

// initialize
const stateBuffer = new InterpolationBuffer(state, 50, lerp);

// enqueue
tateBuffer.enqueue(msg.state, [], timestamp);

// fetch
const { state } = this.stateBuffer.getInterpolatedState(Date.now());
```
