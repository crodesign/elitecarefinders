"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center space-y-4 text-center">
                    <h2 className="text-2xl font-bold">Something went wrong!</h2>
                    <p className="text-gray-600">A critical error occurred.</p>
                    <button
                        onClick={() => reset()}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
