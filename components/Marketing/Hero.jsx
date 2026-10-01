"use client";

import Link from "next/link";

import { motion } from "framer-motion";
import { Globe, Map, Sparkles } from "lucide-react";

const Hero = () => {
    return (
     <section
  id="home"
  className="relative overflow-x-hidden px-6 py-10 md:py-32 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-400 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20"
>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 1 }}
                className="absolute z-0 inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.3),transparent_40%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.2),transparent_40%)]"
            />
            <div className="hidden md:block absolute bg-purple-600 blur-[125px] -top-30 left-10 w-120 h-96 z-0" />
            <div className="hidden md:block absolute bg-purple-600 blur-[265px] top-1/3 -translate-y-1/2 -right-10 w-150 h-150 z-0" />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute z-0 inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.2),transparent_40%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.15),transparent_40%)]"
            />

            <div className="max-w-7xl mx-auto relative z-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="inline-flex  items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 text-blue-700 dark:text-blue-300 mb-6 border border-blue-200 dark:border-purple-700/50"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            AI-Powered Travel Planning
                        </span>
                    </motion.div>

                    <motion.div
                        animate={{ y: [20, 60, 20] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute hidden md:block left-10 -top-10 rounded-full p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-xl"
                        style={{
                            backgroundSize: "200% 200%",
                        }}
                    >
                        <motion.div
                            animate={{
                                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-100"
                            style={{
                                backgroundSize: "200% 200%",
                            }}
                        />
                        <p className="relative z-10 bg-white dark:bg-gray-800 backdrop-blur-md rounded-full p-2">
                            AI Assistant to Plan your Trips
                        </p>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-4xl md:text-7xl font-black text-gray-900 dark:text-white mb-12 "
                    >
                        Plan Your Dream Trip
                        <br />
                        <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent relative">
                            with AI Intelligence
                            <div className="absolute -bottom-1 right-0 hidden md:block w-[75%] h-1  bg-pink-400 rounded-xl animate-collapsible-up" />
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="text-base  text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto my-4"
                    >
                        Discover amazing destinations, create personalized itineraries, and get AI-powered recommendations for your next adventure. Smart travel planning made simple.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Link
                            href="/login"
                            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-semibold transition-all transform  shadow-lg hover:shadow-2xl hover:shadow-fuchsia-500/50 cursor-pointer"
                        >
                            Get Started
                        </Link>
                        <Link
                           href="/discover"
                            className="px-8 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-violet-600 dark:hover:border-violet-500 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-md hover:shadow-lg cursor-pointer"
                        >
                            Explore Destinations
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Floating Cards Animation */}
                <div className="relative mt-20 h-64 hidden md:block">
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute left-10 top-0 w-64 h-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 dark:from-blue-600 dark:to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                                <Map className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                Paris, France
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            5-day romantic getaway with AI-curated experiences
                        </p>
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, 20, 0] }}
                        transition={{
                            duration: 3.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5,
                        }}
                        className="absolute right-10 top-10 w-64 h-40 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 dark:from-violet-600 dark:via-fuchsia-600 dark:to-pink-600 rounded-2xl shadow-2xl shadow-fuchsia-500/30 p-6 text-white border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
                                <Globe className="w-5 h-5" />
                            </div>
                            <span className="font-semibold">Tokyo, Japan</span>
                        </div>
                        <p className="text-sm opacity-90">
                            7-day adventure with local insights
                        </p>
                    </motion.div>
                </div>

                <div>
                    <video
                        autoPlay
                        loop
                        muted
                        className="w-full mt-4 md:-mt-44 max-w-3xl mx-auto rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700"
                    >
                        <source src="landing-video.mp4" type="video/mp4" />
                    </video>
                </div>
            </div>

            <div className="absolute bg-purple-600 blur-[125px] bottom-0 right-0 w-3xl h-86 z-0" />
        </section>
    );
};

export default Hero;