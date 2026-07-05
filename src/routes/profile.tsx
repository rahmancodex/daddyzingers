import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/profile", replace: true });
  },
});
