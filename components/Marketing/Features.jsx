"use client";

import { motion } from "framer-motion";

import { services } from "@/lib/landing";

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { duration: 0.5 },
};

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const colorClasses = {
  blue: {
    background: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  green: {
    background: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
  },
  purple: {
    background: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
  },
};

const Features = () => {
  return (
    <section
      className="py-10 px-3 lg:px-6 overflow-hidden bg-indigo-200 dark:bg-gray-900 relative"
   id="features"
    >
      <div className="relative z-10 flex flex-col max-w-7xl mx-auto gap-12 md:gap-24 min-h-auto my-20 md:pb-20">
        <div className="hidden md:block absolute bg-indigo-600 blur-[265px] bottom-0 -right-10 w-150 h-150 z-0" />

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-8 md:mb-16 z-20 relative"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Why Choose AI Tour?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-base md:text-xl text-gray-600 dark:text-gray-300"
          >
            Everything you need for the perfect trip, powered by AI
          </motion.p>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-8 z-20 relative"
        >
          {services.map((feature, index) =>  (
              <motion.div
                key={index}
                variants={scaleIn}
                initial={{ opacity: 0, scale: 0.8, y: index * 30 }}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                className="bg-gradient-to-br from-indigo-400 to-indigo-600 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-shadow"
              >
              <div
                className={`w-16 h-16 ${
                  colorClasses[feature.color].background
                } rounded-xl flex items-center justify-center mb-6`}
              >
                <feature.icon
                  className={`w-8 h-8 ${colorClasses[feature.color].text}`}
                />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>

                <p className="text-gray-300 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;