import { redirect } from "next/navigation";

// Authenticated users land on the leaderboard; the middleware redirects
// unauthenticated requests to /login before this renders.
export default function Home() {
  redirect("/bodovi");
}
