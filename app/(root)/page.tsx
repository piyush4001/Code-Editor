import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
export default function Home() {
  return (
    <div className="z-20 mt-10 flex min-h-screen flex-col items-center justify-start py-2">
      <div className="my-5 flex flex-col items-center justify-center">
        <Image src={"/hero.svg"} alt="Hero-Section" height={500} width={500} />

        <h1 className="z-20 mt-5 bg-linear-to-r from-rose-500 via-red-500 to-pink-500 bg-clip-text text-center text-6xl leading-[1.3] font-extrabold tracking-tight text-transparent dark:from-rose-400 dark:via-red-400 dark:to-pink-400">
          Vibe Code With with Intelligence
        </h1>
      </div>

      <p className="mt-2 max-w-2xl px-5 py-10 text-center text-lg text-gray-600 dark:text-gray-400">
        VibeCode Editor is a powerful and intelligent code editor that enhances
        your coding experience with advanced features and seamless integration.
        It is designed to help you write, debug, and optimize your code
        efficiently.
      </p>
      <Link href={"/dashboard"}>
        <Button variant={"brand"} className="mb-4" size={"lg"}>
          Get Started
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
