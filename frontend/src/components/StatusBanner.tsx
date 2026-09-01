import type { GEParams, MapStatus } from "../types";

export interface StatusBannerProps {
  status: Extract<MapStatus, "invalid" | "depth-limited">;
  params: GEParams;
}

export function StatusBanner({ status, params }: StatusBannerProps) {
  const heading = status === "depth-limited" ? "Depth limit reached" : "Incomplete derivation";
  const message =
    status === "depth-limited"
      ? `Derivation stopped: a branch exceeded max_depth (${params.max_depth}) and the tree is truncated.`
      : `Non-terminals remain after the genome was exhausted${params.wrap ? "" : " — wrapping is off"}. Try a longer genome or enable wrapping.`;
  return (
    <div className={`status-banner status-banner-${status}`} role="alert">
      <strong>{heading}</strong>
      <span>{message}</span>
    </div>
  );
}
