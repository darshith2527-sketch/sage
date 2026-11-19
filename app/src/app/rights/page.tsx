import type { Metadata } from "next";
import RightsClient from "./rights-client";

export const metadata: Metadata = {
  title: "Know your rights — Sage",
  description: "In a situation right now? Tell Sage what's happening and see the law that applies, in plain words.",
};

export default function RightsPage() {
  return <RightsClient />;
}
