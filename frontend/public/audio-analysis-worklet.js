class F87AudioAnalysisProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ring = new Float32Array(256);
    this.ringPos = 0;
    this.sampleCounter = 0;
    this.streamPort = null;
    this.port.onmessage = (event) => {
      if (event.data?.type === 'attach-stream-port' && event.data.port) {
        this.streamPort = event.data.port;
        this.streamPort.start?.();
      }
    };
  }

  analyse() {
    const N = this.ring.length;
    const samples = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const src = (this.ringPos + i) % N;
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
      samples[i] = this.ring[src] * hann;
    }

    const bins = new Uint8Array(64);
    for (let k = 0; k < bins.length; k++) {
      let re = 0, im = 0;
      const step = (2 * Math.PI * k) / N;
      for (let n = 0; n < N; n++) {
        const a = step * n;
        const x = samples[n];
        re += x * Math.cos(a);
        im -= x * Math.sin(a);
      }
      const mag = Math.sqrt(re * re + im * im) / (N * 0.5);
      const db = 20 * Math.log10(mag + 1e-7);
      bins[k] = Math.max(0, Math.min(255, Math.round(((db + 80) / 80) * 255)));
    }

    // Copy once for each destination before transferring either buffer.
    const toMain = bins.slice();
    const toWorker = bins.slice();
    this.port.postMessage({ type: 'spectrum', bins: toMain.buffer, at: currentTime }, [toMain.buffer]);
    if (this.streamPort) {
      this.streamPort.postMessage({ type: 'spectrum', bins: toWorker.buffer, at: currentTime }, [toWorker.buffer]);
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    const ch = input?.[0];

    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.ring[this.ringPos] = ch[i];
        this.ringPos = (this.ringPos + 1) % this.ring.length;
        this.sampleCounter++;
      }
    }

    // Pass-through for graph liveness; caller connects through zero gain.
    if (input && output) {
      for (let c = 0; c < Math.min(input.length, output.length); c++) {
        output[c].set(input[c]);
      }
    }

    const postEvery = Math.max(1, Math.floor(sampleRate / 20));
    if (this.sampleCounter >= postEvery) {
      this.sampleCounter %= postEvery;
      this.analyse();
    }
    return true;
  }
}

registerProcessor('f87-audio-analysis', F87AudioAnalysisProcessor);
