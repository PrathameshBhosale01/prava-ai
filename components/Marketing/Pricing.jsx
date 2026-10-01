"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { pricingPlans } from "@/lib/landing";

const Pricing = () => {
  const [hoverIdx, setHoverIdx] = useState(0);

  const handleHover = (idx) => {
    setHoverIdx(idx);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.3,
        delay: 0.1,
        ease: "easeIn",
      }}
      className="flex flex-col md:flex-row justify-center gap-14 max-w-7xl mx-auto"
    >
      {pricingPlans.map((plan, idx) => {
        const isActive = hoverIdx === idx;

        return (
          <div
            key={plan.title}
            onMouseEnter={() => handleHover(idx)}
            className={`
              transition-all duration-700 ease-in-out cursor-pointer relative overflow-hidden
              rounded-xl text-left p-5 w-full md:max-w-sm
              md:h-[600px]
              ${
                isActive
                  ? "md:flex-1 dark:text-white bg-card border-2 border-purple-600 shadow-lg md:shadow-2xl"
                  : "md:flex-[0.1] bg-primary-foreground md:text-primary"
              }
            `}
          >
            {/* Collapsed State */}
            <div
              className={`
                hidden md:flex items-center gap-3 absolute top-1/2 left-1/2
                -translate-x-1/2 -translate-y-1/2
                transition-all duration-500 ease-in-out
                ${
                  isActive
                    ? "rotate-0 opacity-0 -translate-x-full"
                    : "rotate-90 opacity-100 -translate-x-1/2"
                }
              `}
            >
              <plan.icon className="w-8 h-8" />

              <h3 className="text-2xl font-black whitespace-nowrap">
                {plan.title}
              </h3>
            </div>

            {/* Expanded State */}
            <div
              className={`
                md:transition-all flex flex-col h-full
                md:duration-700 md:ease-in-out md:delay-200
                ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "md:opacity-0 md:translate-y-16 md:pointer-events-none"
                }
              `}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="p-4 rounded-md bg-purple-600">
                  <plan.icon className="w-8 h-8" />
                </div>

                <h3 className="text-2xl font-black">
                  {plan.title}
                </h3>
              </div>

              {/* Tagline */}
              <p className="text-xl font-bold text-indigo-400 opacity-70">
                {plan.tagline}
              </p>

              {/* Description */}
              <p className="text-sm opacity-80 mb-4">
                {plan.description}
              </p>

              {/* Price */}
              <h2 className="text-2xl md:text-3xl font-bold m-4">
                {plan.price}
              </h2>

              {/* Features */}
              <ul className="flex flex-col gap-5 my-4 flex-1 h-full">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-1 w-2 h-2 rounded-full bg-secondary-foreground flex-shrink-0" />

                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="/login">
                <button
                  className="w-full py-2 rounded-lg font-medium bg-blue-500 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

export default Pricing;