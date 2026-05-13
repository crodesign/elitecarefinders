function Bone({ className = '' }: { className?: string }) {
    return <div className={`rounded bg-gray-200 ${className}`} />;
}

export default function Loading() {
    return (
        <main className="min-h-screen bg-white animate-pulse">
            <div className="max-w-3xl mx-auto px-5 py-12">
                <div className="mb-10 space-y-2">
                    <Bone className="h-3 w-32" />
                    <Bone className="h-8 w-72 max-w-full" />
                </div>

                <div className="mb-10 flex flex-wrap items-center gap-4 sm:gap-6 bg-gray-50 rounded-2xl px-6 py-5">
                    <Bone className="h-7 w-28" />
                    <Bone className="h-5 w-32" />
                    <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                    <Bone className="h-4 w-40" />
                    <Bone className="h-9 w-36 ml-auto" />
                </div>

                <div className="flex flex-col gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-gray-100 rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-11 w-11 rounded-full bg-gray-200 shrink-0" />
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Bone className="h-4 w-32" />
                                        <Bone className="h-3 w-24" />
                                    </div>
                                    <Bone className="h-4 w-24" />
                                    <div className="space-y-2 mt-3">
                                        <Bone className="h-3 w-full" />
                                        <Bone className="h-3 w-11/12" />
                                        <Bone className="h-3 w-10/12" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
