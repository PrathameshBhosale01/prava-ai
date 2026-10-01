
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Accessibility } from "lucide-react";

const menus = [
  {
    name: "Home",
    href: "#home",
  },
  {
    name: "Services",
    href: "#features",
  },
{
  name: "How It Works",
  href: "#htw",
},
  {
    name: "Pricing",
    href: "#pricing",
  },
  {
    name: "About Us",
    href: "#about",
  },
  {
    name: "Contact Us",
    href: "#contact",
  },
];

const Navbar = () => {
  const [navbg, setNavBg] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavBg(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 h-16 font-serif backdrop-blur-md transition-all duration-300 ${
        navbg
          ? "bg-background/70 shadow-md backdrop-blur-2xl"
          : "bg-background shadow-none"
      }`}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between p-3">

        {/* Logo */}
        <div className="flex-1">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-lg text-white">
              ✦
            </div>

            <span className="text-xl font-bold">
              <span className="text-blue-500">Prava</span>
              <span className="text-purple-500"> AI</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:block">
          <ul className="flex items-center justify-center gap-4 text-slate-600 dark:text-slate-300">
            {menus.map((menu) => (
              <li key={menu.name}>
                <Link
                  href={menu.href}
                  className="text-sm tracking-wider transition-all hover:font-bold hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {menu.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right controls */}
        <div className="flex flex-1 items-center justify-end gap-2">

          {/* Accessibility */}
          <button
            type="button"
            aria-label="Accessibility"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-500 bg-transparent text-slate-700 transition hover:bg-purple-500/10 dark:text-slate-200"
          >
            <Accessibility className="h-4 w-4" />
          </button>

          {/* Console */}
          <Link href="/dashboard">
            <button
              type="button"
              className="rounded-md bg-purple-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-600"
            >
              Console
            </button>
          </Link>

          {/* Profile */}
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-purple-500 bg-blue-500/20 text-sm"
          >
            👤
          </Link>

        </div>
      </div>
    </header>
  );
};

export default Navbar;

// "use client"

// import React, { useEffect, useState } from 'react'
// import Link from 'next/link'

// import Logo from '../custom/Logo';
// import ThemeToggle from '../custom/ThemeToggle';
// import LanguageSelector from '../custom/LanguageSelector';
// import ProfileCard from '../custom/ProfileCard';

// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
// import { Button } from '@/components/ui/button'

// import { useAuth } from '@/context/useAuth'

// import { getUserInitials } from '@/lib/utils/nameInitial'
// import { cn } from '@/lib/utils'
// import { landingPageMenus } from '@/lib/constants';
// import { Accessibility } from '../custom/Accessibility';

// const Navbar = () => {
//     const { user, profile } = useAuth()
//     const [showProfileModal, setShowProfileModal] = useState(false)
//     const [navbg, setNavBg] = useState(false);

//     useEffect(() => {
//         window.addEventListener('scroll', () => {
//             if (window.scrollY > 30) {
//                 setNavBg(true)
//             } else {
//                 setNavBg(false)
//             }
//         })
//     }, [navbg])



//     return (
//         <>
//             <header className={cn(" h-16 sticky inset-0 font-serif backdrop-blur-md z-50", navbg ? "bg-transparent backdrop-blur-2xl shadow-md" : "shadow-none bg-card")}>
//                 <div className="flex w-full justify-between items-center h-full p-3 max-w-7xl mx-auto">

//                     <div className="flex-1">
//                         <Logo />
//                     </div>

//                     <nav className='hidden md:block'>
//                         <ul className='flex gap-4 justify-center items-center text-slate-600 dark:text-slate-300'>
//                             {
//                                 landingPageMenus.map((menu, index) => (
//                                     <Link href={menu.href} key={index}>
//                                         <li className="text-sm tracking-wider transition-all hover:font-bold hover:text-slate-700 dark:hover:text-slate-100">
//                                             {menu.name}
//                                         </li>
//                                     </Link>
//                                 ))
//                             }
//                         </ul>
//                     </nav>

//                     <div className="flex flex-1 gap-2 justify-end items-center">

//                         {/* <ThemeToggle />
//                         <LanguageSelector /> */}
//                         <Accessibility />
//                         {user ? (
//                             <div className="flex items-center gap-1 md:gap-2">
//                                 <Link href="/dashboard">
//                                     <Button className="p-1 md:p-2">
//                                         Console
//                                     </Button>
//                                 </Link>

//                                 <button
//                                     onClick={() => setShowProfileModal(true)}
//                                     className=" rounded-full  cursor-pointer border-2 border-purple-500"
//                                 >
//                                     <Avatar className="w-8 h-8 ">
//                                         <AvatarImage
//                                             src={profile?.avatarUrl || "/profile.png"}
//                                             alt={profile?.name || "Profile"}
//                                             className={"object-cover"}
//                                         />
//                                         <AvatarFallback className="text-xs font-semibold">
//                                             {getUserInitials()}
//                                         </AvatarFallback>
//                                     </Avatar>
//                                 </button>
//                             </div>
//                         ) : (
//                             <Link href={'/auth?continueTo=/dashboard'}>
//                                 <Button className='cursor-pointer'>Log In</Button>
//                             </Link>
//                         )}

//                     </div>
//                 </div>
//             </header>

//             {/* Profile Modal */}
//             <ProfileCard modal={showProfileModal} setModal={setShowProfileModal} />
//         </>
//     )
// }

// export default Navbar

