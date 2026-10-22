import {
  Calendar,
  Clock,
  Compass,
  Crown,
  DollarSign,
  Map,
  Plane,
  Sparkles,
} from "lucide-react";
import { planBullets } from "./billing/subscriptionView.js";
import { PRICING } from "./plans.js";

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

export const teamMember = {
  name: "Prathamesh Bhosale",
  image: "/images/my_pic.jpg",
  linkedin: "https://www.linkedin.com/in/prathamesh--bhosale/",
  github: "https://github.com/PrathameshBhosale01",
  email: "bhosaleprathamesh202@gmail.com",
};

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
export const pricingPlans = [
  {
    title: "Free Plan",
    icon: Plane,
    tagline: "Explore Without Limits",
    description: "Perfect for casual travelers and students who want to plan trips effortlessly.",
    features: [...planBullets("free"), "Access to public travel blogs & tips"],
    bestFor: "Trying out the platform, weekend trips, and first-time users",
    price: "₹0",
  },
  {
    title: "Pro Plan",
    icon: Crown,
    tagline: "Travel Smarter with AI",
    description: "Built for frequent travelers who want deeper customization and control.",
    features: planBullets("pro"),
    bestFor: "Frequent travelers, planners, and users who want a fully personalized trip experience",
    price: `₹${PRICING.monthly}/mo`,
  },
];
