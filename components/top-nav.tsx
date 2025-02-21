import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./toggle";

export function TopNav() {
    return (
        <nav className="flex items-center justify-between px-4 py-2 bg-background border-b gap-2">
            <div className="flex items-center">
                <Button
                    variant="outline"
                    size="icon"
                    aria-label="Home"
                    className="p-0 w-[34px] h-[34px]"
                >
                    <Link
                        href="https://baike.baidu.com/item/%E4%B8%AD%E5%9B%BD%E4%BA%BA%E6%B0%91%E8%A7%A3%E6%94%BE%E5%86%9B%E6%88%98%E7%95%A5%E6%94%AF%E6%8F%B4%E9%83%A8%E9%98%9F%E4%BF%A1%E6%81%AF%E5%B7%A5%E7%A8%8B%E5%A4%A7%E5%AD%A6/21507141"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full h-full"
                    >
                        <img
                            src="/logo.svg"
                            alt="Logo"
                            className="w-full h-full"
                        />
                    </Link>
                </Button>
                <span className="ml-2 text-lg font-semibold">先锋·智绘</span>
            </div>
            
            <ModeToggle />
        </nav>
    );
}
