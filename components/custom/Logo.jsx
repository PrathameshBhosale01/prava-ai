import React from "react";
import Link from "next/link";
import Image from "next/image";

const Logo = () => {
  return (
    <Link href={"/"} className="flex items-center gap-2 group">
      <Image 
      src="/logo2.png"
      alt="logo"
      width={28}
      height={28} 
      />
      <h1 className="text-base md:text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:text-slate-200 transition-all group-hover:scale-105 ">
         Prava AI
        {/* Prava AI */}
      </h1>
    </Link>
  );
};

export default Logo;