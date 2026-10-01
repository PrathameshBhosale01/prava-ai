"use client";

import { motion } from "framer-motion";

import { planSteps } from "@/lib/landing";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const HTW = () => {
  return (
    <section
      className="relative overflow-hidden px-6 py-20"
      id="how-it-works"
    >
      <div className="mx-auto my-20 flex min-h-auto max-w-7xl flex-col gap-12 px-4 md:gap-24">

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Plan Your Trip in 3 Easy Steps
          </h2>

          <p className="text-base tracking-widest text-gray-600 dark:text-gray-300">
            From inspiration to itinerary in minutes
          </p>
        </motion.div>

        <div className="relative z-20 grid gap-12 md:grid-cols-3">

          {planSteps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.2,
              }}
              className="group relative"
            >
              {/* Step number */}
              <div className="mb-4 text-7xl font-bold text-blue-400 dark:text-gray-700">
                {item.step}
              </div>

              {/* Card */}
              <div className="relative h-[70%] overflow-hidden rounded-2xl bg-slate-200 p-8 shadow-lg transition duration-300 ease-in-out group-hover:-translate-y-3 group-hover:bg-white dark:bg-gray-800">

                {/* Hover glow */}
                <div className="absolute left-0 top-0 z-0 h-14 w-md bg-purple-600 opacity-0 blur-[100px] transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

                {/* Icon */}
                <div className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                  <item.icon className="h-7 w-7 text-white" />
                </div>

                {/* Title */}
                <h3 className="relative z-10 mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="relative z-10 text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>

              {/* Connector */}
              {index < 2 && (
                <div className="absolute -right-12 top-1/2 hidden h-0.5 w-12 bg-gradient-to-r from-blue-500 to-purple-500 md:block" />
              )}
            </motion.div>
          ))}

        </div>
      </div>

      {/* Background glow */}
      <div className="absolute bottom-0 right-0 z-0 h-52 w-52 bg-purple-600 blur-[130px]" />

      <div className="absolute left-0 top-0 z-0 h-52 w-52 bg-purple-600 blur-[130px]" />
    </section>
  );
};

export default HTW;