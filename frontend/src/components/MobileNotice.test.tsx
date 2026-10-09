import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MobileNotice } from "./MobileNotice";

afterEach(() => {
  window.localStorage.clear();
});

describe("MobileNotice", () => {
  it("suggests a bigger screen and can be dismissed for good", () => {
    const { unmount } = render(<MobileNotice />);
    expect(screen.getByText(/Better on a bigger screen/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText(/Better on a bigger screen/)).not.toBeInTheDocument();

    // The dismissal survives a remount.
    unmount();
    render(<MobileNotice />);
    expect(screen.queryByText(/Better on a bigger screen/)).not.toBeInTheDocument();
  });
});
