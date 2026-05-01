import { useEffect, useRef } from "react";
import { useGestureStore } from "@/store/gestureStore";

interface GestureOverlayProps {
    width?: number;
    height?: number;
    className?: string;
}

export default function GestureOverlay({
                                           width = 640,
                                           height = 480,
                                           className,
                                       }: GestureOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { detectedHands } = useGestureStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        detectedHands.forEach((hand) => {
            const lm = hand.landmarks;

            // Connections between landmarks
            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4],           // thumb
                [0, 5], [5, 6], [6, 7], [7, 8],            // index
                [0, 9], [9, 10], [10, 11], [11, 12],       // middle
                [0, 13], [13, 14], [14, 15], [15, 16],     // ring
                [0, 17], [17, 18], [18, 19], [19, 20],     // pinky
                [5, 9], [9, 13], [13, 17],                 // palm
            ];

            // Draw connections
            ctx.strokeStyle = "rgba(99, 102, 241, 0.5)";
            ctx.lineWidth = 1.5;
            connections.forEach(([a, b]) => {
                const pa = lm[a];
                const pb = lm[b];
                if (!pa || !pb) return;
                ctx.beginPath();
                // Mirror horizontally (selfie view)
                ctx.moveTo((1 - pa.x) * width, pa.y * height);
                ctx.lineTo((1 - pb.x) * width, pb.y * height);
                ctx.stroke();
            });

            // Draw landmark dots
            lm.forEach((point, i) => {
                const x = (1 - point.x) * width;
                const y = point.y * height;

                // Fingertips get a larger glow
                const isTip = [4, 8, 12, 16, 20].includes(i);

                ctx.beginPath();
                ctx.arc(x, y, isTip ? 5 : 3, 0, Math.PI * 2);
                ctx.fillStyle = isTip
                    ? "rgba(34, 211, 238, 0.95)"
                    : "rgba(139, 92, 246, 0.8)";
                ctx.fill();

                if (isTip) {
                    ctx.beginPath();
                    ctx.arc(x, y, 10, 0, Math.PI * 2);
                    ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });

            // Handedness label
            const wrist = lm[0];
            if (wrist) {
                ctx.font = "bold 11px Inter, sans-serif";
                ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
                ctx.fillText(
                    hand.handedness,
                    (1 - wrist.x) * width - 12,
                    wrist.y * height + 20
                );
            }
        });
    }, [detectedHands, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={className}
            style={{ pointerEvents: "none" }}
        />
    );
}