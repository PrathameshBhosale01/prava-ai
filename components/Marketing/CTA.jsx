"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CTA = () => {
  return (
    <section className="py-10 md:py-20 px-6 bg-indigo-500 dark:bg-gray-900 relative overflow-hidden h-[70vh] flex justify-center items-center">
      <div className="custom-clip blur-3xl bg-blue-300 w-screen h-full absolute top-0 left-0 z-0" />

      <div className="absolute top-0 left-0 w-full h-full bg-transparent backdrop-blur-xs" />

      <div className="relative z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-4 md:p-12 text-center text-white shadow-2xl backdrop:blur-xl relative z-10"
        >
          <h2 className="text-2xl md:text-5xl font-bold mb-6">
            Ready to Start Your Adventure?
          </h2>

          <p className="text-base md:text-xl mb-8 opacity-90">
            Join thousands of travelers who trust AI Tour for their perfect
            vacation
          </p>

          <Link
            href="/login"
            className="px-4 whitespace-nowrap md:px-10 py-4 bg-gray-300 text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all transform hover:scale-102 inline-block shadow-lg cursor-pointer"
          >
            Start Planning Now →
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;