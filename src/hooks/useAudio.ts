import { useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";

interface UseAudioOptions {
    enabled?: boolean;
}

export function useAudio({ enabled = true }: UseAudioOptions = {}) {
    const synthRef = useRef<Tone.PolySynth | null>(null);
    const reverbRef = useRef<Tone.Reverb | null>(null);
    const delayRef = useRef<Tone.FeedbackDelay | null>(null);
    const filterRef = useRef<Tone.Filter | null>(null);
    const analyserRef = useRef<Tone.Analyser | null>(null);
    const limiterRef = useRef<Tone.Limiter | null>(null);
    const isStartedRef = useRef(false);

    const initAudio = useCallback(async () => {
        if (isStartedRef.current || !enabled) return;

        await Tone.start();
        isStartedRef.current = true;

        // Signal chain: Synth → Filter → Delay → Reverb → Analyser → Limiter → Output
        limiterRef.current = new Tone.Limiter(-3).toDestination();
        analyserRef.current = new Tone.Analyser("waveform", 128);
        analyserRef.current.connect(limiterRef.current);

        reverbRef.current = new Tone.Reverb({ decay: 3, wet: 0.4 });
        await reverbRef.current.generate();
        reverbRef.current.connect(analyserRef.current);

        delayRef.current = new Tone.FeedbackDelay("8n", 0.3);
        delayRef.current.connect(reverbRef.current);

        filterRef.current = new Tone.Filter(2000, "lowpass");
        filterRef.current.connect(delayRef.current);

        synthRef.current = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 1.5 },
        });
        synthRef.current.connect(filterRef.current);
    }, [enabled]);

    const playNote = useCallback(
        async (note: string, duration = "8n") => {
            if (!isStartedRef.current) await initAudio();
            if (!synthRef.current) return;
            synthRef.current.triggerAttackRelease(note, duration);
        },
        [initAudio]
    );

    const playChord = useCallback(
        async (notes: string[], duration = "4n") => {
            if (!isStartedRef.current) await initAudio();
            if (!synthRef.current) return;
            synthRef.current.triggerAttackRelease(notes, duration);
        },
        [initAudio]
    );

    const setFilterFrequency = useCallback((freq: number) => {
        if (!filterRef.current) return;
        filterRef.current.frequency.rampTo(Math.max(200, Math.min(8000, freq)), 0.1);
    }, []);

    const setReverbWet = useCallback((wet: number) => {
        if (!reverbRef.current) return;
        reverbRef.current.wet.rampTo(Math.max(0, Math.min(1, wet)), 0.1);
    }, []);

    const setDelayWet = useCallback((wet: number) => {
        if (!delayRef.current) return;
        delayRef.current.wet.rampTo(Math.max(0, Math.min(1, wet)), 0.1);
    }, []);

    const getWaveform = useCallback((): Float32Array | null => {
        if (!analyserRef.current) return null;
        return analyserRef.current.getValue() as Float32Array;
    }, []);

    const stopAll = useCallback(() => {
        synthRef.current?.releaseAll();
    }, []);

    useEffect(() => {
        return () => {
            synthRef.current?.dispose();
            reverbRef.current?.dispose();
            delayRef.current?.dispose();
            filterRef.current?.dispose();
            analyserRef.current?.dispose();
            limiterRef.current?.dispose();
        };
    }, []);

    return {
        initAudio,
        playNote,
        playChord,
        setFilterFrequency,
        setReverbWet,
        setDelayWet,
        getWaveform,
        stopAll,
    };
}