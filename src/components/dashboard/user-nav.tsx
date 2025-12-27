"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { User, CreditCard, Settings, LogOut } from "lucide-react";

export function UserNav() {
    const { data: session } = useSession();
    const user = session?.user;

    // Use initials or fallback
    const initials = user?.name
        ? user.name.substring(0, 2).toUpperCase()
        : "TR"; // Trader

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center ring-2 ring-zinc-700 hover:ring-zinc-600 transition-all">
                        <span className="text-xs font-bold text-zinc-400">{initials}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#0E1217] border-zinc-800 text-zinc-400" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-white">{user?.name || "Trader"}</p>
                        <p className="text-xs leading-none text-zinc-500">
                            {user?.email || "trader@projectx.com"}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuGroup>
                    <Link href="/profile">
                        <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </Link>
                    <Link href="/billing">
                        <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Billing</span>
                            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                        <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                    className="focus:bg-zinc-800 focus:text-red-400 text-red-500 cursor-pointer"
                    onClick={() => signOut({ callbackUrl: "/" })}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
