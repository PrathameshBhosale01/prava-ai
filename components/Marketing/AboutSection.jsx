"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  FaLinkedin,
  FaGithub,
  FaEnvelope,
} from "react-icons/fa";

import { teamMember } from "@/lib/landing";

const AboutSection = () => {
  const ref = useRef(null);

  const isInView = useInView(ref, {
    once: true,
    amount: 0.3,
  });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const circleVariants = {
    hidden: {
      scale: 0,
      rotate: -180,
      opacity: 0,
      y: 100,
    },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.8,
      },
    },
  };

  const nameVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3,
        duration: 0.5,
      },
    },
  };

  const linkVariants = {
    hidden: {
      opacity: 0,
      scale: 0,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0.5,
        duration: 0.3,
      },
    },
  };

  return (
    <section
      id="about"
      className="py-20 min-h-screen w-full"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-16 h-full w-full px-6">

        {/* LEFT: About Text */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex-1 space-y-6 text-left"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              About Me
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
              The Developer Behind Prava AI
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
            }}
            viewport={{ once: true }}
            className="text-base md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl"
          >
            I'm Prathamesh Bhosale, a full-stack developer passionate about
            building practical web applications and AI-powered experiences.
            Prava AI is a personal project created to make travel planning
            smarter, more personalized, and easier to manage.
          </motion.p>
        </motion.div>

        {/* RIGHT: Profile Card */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex-1 flex justify-center lg:justify-end"
        >
          <motion.div
            variants={circleVariants}
            className="
              flex flex-col items-center
              bg-indigo-300
              dark:bg-indigo-900
              hover:shadow-2xl
              w-full
              max-w-[280px]
              rounded-lg
              p-6
              gap-4
              shadow-lg
              transition-shadow
            "
          >
            {/* Profile Image */}
            <motion.div
              whileHover={{
                scale: 1.1,
                rotate: 5,
              }}
              className="
                relative
                w-28 h-28
                md:w-36 md:h-36
                lg:w-40 lg:h-40
                rounded-full
                overflow-hidden
                shadow-2xl
                ring-4
                ring-white
                dark:ring-gray-800
                mb-4
              "
            >
              <img
                src={teamMember.image}
                alt={teamMember.name}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            </motion.div>

            {/* Name + Role */}
            <motion.div
              variants={nameVariants}
              className="text-center"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {teamMember.name}
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Full-Stack Developer & Creator of Prava AI
              </p>
            </motion.div>

            {/* Social Links */}
            <motion.div
              variants={linkVariants}
              className="flex gap-2"
            >
              {/* LinkedIn */}
              <motion.a
                href={teamMember.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{
                  scale: 1.2,
                  rotate: 5,
                }}
                className="
                  w-8 h-8
                  rounded-full
                  bg-blue-600
                  hover:bg-blue-700
                  flex items-center justify-center
                  text-white
                  transition-colors
                  shadow-md
                "
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-4 h-4" />
              </motion.a>

              {/* GitHub */}
              <motion.a
                href={teamMember.github}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{
                  scale: 1.2,
                  rotate: -5,
                }}
                className="
                  w-8 h-8
                  rounded-full
                  bg-gray-800
                  hover:bg-gray-900
                  flex items-center justify-center
                  text-white
                  transition-colors
                  shadow-md
                "
                aria-label="GitHub"
              >
                <FaGithub className="w-4 h-4" />
              </motion.a>

              {/* Email */}
              <motion.a
                href={`mailto:${teamMember.email}`}
                whileHover={{
                  scale: 1.2,
                  rotate: 5,
                }}
                className="
                  w-8 h-8
                  rounded-full
                  bg-purple-600
                  hover:bg-purple-700
                  flex items-center justify-center
                  text-white
                  transition-colors
                  shadow-md
                "
                aria-label="Email"
              >
                <FaEnvelope className="w-4 h-4" />
              </motion.a>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;