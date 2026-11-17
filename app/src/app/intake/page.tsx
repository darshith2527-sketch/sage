import { redirect } from "next/navigation";

// The old address. Keeps any links you've already shared working.
export default function IntakePage() {
  redirect("/draft/freelance");
}
