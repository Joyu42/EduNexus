// This page is intentionally a thin server wrapper.
// The homepage client logic lives in @/components/home/home-page-client
import HomePageClient from "@/components/home/home-page-client";

export default function HomePage() {
  return <HomePageClient />;
}
