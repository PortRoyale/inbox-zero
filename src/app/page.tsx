import { Home } from "@/components/Home";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <Home />
      </main>
    </>
  );
}
