import { Composition } from "remotion";
import { CheckmateArenaOnboarding } from "./CheckmateArenaOnboarding";

export function RemotionRoot() {
  return (
    <Composition
      id="CheckmateArenaOnboarding"
      component={CheckmateArenaOnboarding}
      durationInFrames={720}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
