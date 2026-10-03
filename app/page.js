import Navbar from "@/components/Marketing/Navbar";
import Hero from "@/components/Marketing/Hero";
import Features from "@/components/Marketing/Features";
import HTW from "@/components/Marketing/HTW";
import Pricing from "@/components/Marketing/Pricing";
import AboutSection from "@/components/Marketing/AboutSection";
import CTA from "@/components/Marketing/CTA";
import Footer from "@/components/Marketing/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />

      <div id="home">
        <Hero />
      </div>

      <Features />

      <HTW />

      <section
        id="pricing"
        className="relative overflow-hidden py-24"
      >
        <div className="mx-auto mb-16 max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-5xl">
            💸 Pricing Plans
          </h2>

          <p className="mt-4 text-base tracking-widest text-gray-600 dark:text-gray-300">
            From inspiration to itinerary in minutes
          </p>
        </div>

        <Pricing />
      </section>
      
       <AboutSection />
          <CTA />
           <Footer />

    </main>
  );
}