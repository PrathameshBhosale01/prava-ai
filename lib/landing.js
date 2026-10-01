import {
  Calendar,
  Clock,
  Compass,
  DollarSign,
  Map,
  Sparkles,
} from "lucide-react";

export const services = [
  {
    icon: Sparkles,
    title: "AI-Powered Planning",
    description:
      "Get personalized trip recommendations based on your preferences and budget",
    color: "blue",
  },
  {
    icon: Map,
    title: "Smart Discovery",
    description:
      "Explore destinations with interactive maps and local insights",
    color: "green",
  },
  {
    icon: Clock,
    title: "Save Time",
    description:
      "Optimize your itinerary automatically with intelligent scheduling",
    color: "purple",
  },
  {
    icon: DollarSign,
    title: "Budget Tracking",
    description:
      "Track expenses and find the best deals in real-time",
    color: "purple",
  },
];

export const planSteps = [
  {
    step: "01",
    title: "Tell Us Your Dreams",
    description:
      "Share your destination, budget, interests, and travel dates",
    icon: Compass,
  },
  {
    step: "02",
    title: "AI Creates Magic",
    description:
      "Our AI analyzes millions of data points to craft your perfect itinerary",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Book & Enjoy",
    description:
      "Review, customize, and book your personalized travel plan",
    icon: Calendar,
  },
];