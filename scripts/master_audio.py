"""Master original Vision-rendered 16-bit stereo WAVs with matched gentle peaks.

This changes gain only, not the waveform's envelope, harmonic layers or stereo
performance. Keep the exact Vision score JSON in audio-sources for reauthoring.
"""
from pathlib import Path
import array
import math
import wave

BASE = Path(__file__).resolve().parents[1]
TARGET_DBFS = -10.5

for name in ("arrival", "bloom", "turn", "celebrate"):
    path = BASE / "public" / "audio" / (name + ".wav")
    with wave.open(str(path), "rb") as source:
        params = source.getparams()
        samples = array.array("h", source.readframes(params.nframes))
    if params.nchannels != 2 or params.sampwidth != 2:
        raise RuntimeError("Expected authored stereo PCM16: " + name)
    if not samples:
        raise RuntimeError("Empty sound performance: " + name)
    if __import__("sys").byteorder != "little":
        samples.byteswap()
    current = max(abs(v) for v in samples)
    gain = (10 ** (TARGET_DBFS / 20) * 32767) / current
    mastered = array.array("h", (max(-32768, min(32767, int(v * gain))) for v in samples))
    if __import__("sys").byteorder != "little":
        mastered.byteswap()
    with wave.open(str(path), "wb") as target:
        target.setparams(params)
        target.writeframes(mastered.tobytes())
    peak = max(abs(v) for v in mastered) / 32768
    print(f"{name}: peak {20*math.log10(peak):.1f} dBFS, {params.nframes/params.framerate:.2f} s, {path.stat().st_size} bytes")
