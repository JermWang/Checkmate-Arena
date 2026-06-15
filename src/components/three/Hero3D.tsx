import { Component, Suspense } from "react";
import type { ReactNode } from "react";
import { PieceShowcase } from "./PieceShowcase";

class GLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    /* fallback renders */
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Hero3D({
  pieceKey,
  png,
  alt,
  className,
  pieceHeight,
}: {
  pieceKey: string;
  png: string;
  alt: string;
  className?: string;
  pieceHeight?: number;
}) {
  const fallback = (
    <img src={png} alt={alt} className="h-full w-full object-contain" />
  );

  return (
    <div className={className}>
      <GLErrorBoundary fallback={fallback}>
        <Suspense fallback={null}>
          <PieceShowcase
            pieceKey={pieceKey}
            height={pieceHeight}
            className="!h-full !w-full"
          />
        </Suspense>
      </GLErrorBoundary>
    </div>
  );
}
