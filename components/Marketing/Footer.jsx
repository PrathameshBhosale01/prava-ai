import Logo from '../custom/Logo'
import Link from 'next/link'

const Footer = () => {
    return (
        <footer className="w-full text-xl text-center space-y-3 bg-gray-900 px-5 md:px-10 pt-6 pb-8  border-b-8 border-cyan-500">
            <h1>
                <Logo />
            </h1>
            <div className="flex md:items-center justify-between gap-2 flex-col md:flex-row">
                <small className="text-gray-300 tracking-widest text-left">
                    &copy;{" "}
                    <span className="gradient-text ">{new Date().getFullYear()}</span>{" "}
                    AI Tour. All rights reserved.
                </small>
                <div className="flex items-center md:justify-center gap-2 justify-end text-right">
                    <Link
                        href={"/about"}
                        className="text-sm font-semibold underline text-slate-700 dark:text-slate-400 hover:opacity-80"
                    >
                        About Us
                    </Link>{" "}
                    {" | "}
                    <Link
                        href={"/contact"}
                        className="text-sm font-semibold underline text-slate-700 dark:text-slate-400 hover:opacity-80"
                    >
                        Contact Us
                    </Link>
                </div>
            </div>
        </footer>
    )
}

export default Footer;