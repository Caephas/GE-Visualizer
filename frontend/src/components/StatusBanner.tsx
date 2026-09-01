import type { GEParams, MapStatus } from "../types";

export interface StatusBannerProps {
  status: Extract<MapStatus, "invalid" | "depth-limited">;
  params: GEParams;
}

export function StatusBanner({ status, params }: StatusBannerProps) {
  const heading = status === "depth-limited" ? "Depth limit reached" : "Incomplete derivation";
  const isDepthLimited = status === "depth-limited";
  const message = isDepthLimited
    ? `Derivation stopped: a branch exceeded max_depth (${params.max_depth}) and the tree is truncated.`
    : `Non-terminals remain after the genome was exhausted${params.wrap ? "" : " — wrapping is off"}.`;
  const tip = isDepthLimited
    ? "Tip: raise Max depth (try 200) or shorten the genome."
    : params.wrap
      ? "Tip: raise Genome length — wrapping is already on."
      : "Tip: enable Wrap or raise Genome length (try 40+).";
  return (
    <div className={`status-banner status-banner-${status}`} role="alert">
      <strong>{heading}</strong>
      <span>{message}</span>
      <span className="status-banner-tip">{tip}</span>
    </div>
  );
}
