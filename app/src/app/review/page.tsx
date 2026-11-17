import type { Metadata } from "next";
import ReviewClient from "./review-client";

export const metadata: Metadata = { title: "Review an agreement — Sage" };

export default function ReviewPage() {
  return <ReviewClient />;
}
