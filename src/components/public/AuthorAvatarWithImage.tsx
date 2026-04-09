"use client";

import { useState } from "react";

export function AuthorAvatarWithImage({ name, photoUrl, initials }: { name: string; photoUrl: string; initials: string }) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div className="h-11 w-11 rounded-full bg-[#239ddb] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{initials}</span>
            </div>
        );
    }

    return (
        <div className="h-11 w-11 rounded-full overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
            />
        </div>
    );
}
