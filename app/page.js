import SplashScreen from "@/components/providers/SplashScreen";
import AboutSection from "@/components/Marketing/AboutSection";
import CTA from "@/components/Marketing/CTA";
import FAQ from "@/components/Marketing/FAQ";
import Features from "@/components/Marketing/Features";
import Footer from "@/components/Marketing/Footer";
import Hero from "@/components/Marketing/Hero";
import HTW from "@/components/Marketing/HTW";
import Navbar from "@/components/Marketing/Navbar";
import Pricing from "@/components/Marketing/Pricing";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: `${BRAND_NAME} — Plan your next trip in a minute`,
  description:
    "Describe your trip and get a full day-by-day itinerary: real places, honest timings, stays, budgets and expenses. Free to start.",
};

export default function Home() {
  return (
    // `landing` scopes the marketing design tokens; the signed-in app keeps its own.
    <div className="landing flex min-h-screen flex-col">
      {/* Scroll-reveal hides elements until JavaScript shows them; without it,
          everything must stay visible. */}
      <noscript>
        <style>{".l-reveal{opacity:1!important;transform:none!important}"}</style>
      </noscript>

      <SplashScreen />
      <Navbar />

      <main id="main">
        <Hero />
        <Features />
        <HTW />
        <Pricing />
        <FAQ />
        <AboutSection />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
