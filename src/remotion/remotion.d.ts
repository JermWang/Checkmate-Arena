declare module "remotion" {
  import type {
    ComponentType,
    CSSProperties,
    ImgHTMLAttributes,
    ReactNode,
  } from "react";

  type ExtrapolateType = "clamp" | "extend" | "identity";

  export const AbsoluteFill: ComponentType<{
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
  }>;

  export const Sequence: ComponentType<{
    children?: ReactNode;
    durationInFrames?: number;
    from?: number;
  }>;

  export const Composition: ComponentType<{
    component: ComponentType;
    durationInFrames: number;
    fps: number;
    height: number;
    id: string;
    width: number;
  }>;

  export const Img: ComponentType<ImgHTMLAttributes<HTMLImageElement>>;

  export const Easing: {
    bezier: (x1: number, y1: number, x2: number, y2: number) => (t: number) => number;
  };

  export function interpolate(
    input: number,
    inputRange: number[],
    outputRange: number[],
    options?: {
      easing?: (t: number) => number;
      extrapolateLeft?: ExtrapolateType;
      extrapolateRight?: ExtrapolateType;
    }
  ): number;

  export function registerRoot(component: ComponentType): void;
  export function staticFile(path: string): string;
  export function useCurrentFrame(): number;
  export function useVideoConfig(): {
    durationInFrames: number;
    fps: number;
    height: number;
    width: number;
  };
}
