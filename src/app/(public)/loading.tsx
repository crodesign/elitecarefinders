function Bone({ className = '' }: { className?: string }) {
    return <div className={`rounded bg-gray-200 ${className}`} />;
}

export default function Loading() {
    return (
        <div className="animate-pulse">
            {/* Hero */}
            <section className="max-w-6xl mx-auto px-5 sm:pt-8">
                <div className="bg-[#239ddb] rounded-t-2xl py-3 flex justify-center">
                    <div className="h-8 sm:h-11 w-2/3 max-w-[500px] rounded bg-white/20" />
                </div>
                <div className="bg-gray-200 rounded-b-2xl h-[340px] sm:h-[680px]" />
            </section>

            {/* Page title */}
            <div className="max-w-6xl mx-auto px-5 text-center py-6 md:py-8 space-y-3">
                <Bone className="h-5 sm:h-6 w-3/4 max-w-[600px] mx-auto" />
                <Bone className="h-7 sm:h-8 w-2/3 max-w-[500px] mx-auto" />
            </div>

            {/* Featured Homes */}
            <section className="max-w-6xl mx-auto px-5 py-16">
                <div className="flex items-end justify-between mb-8">
                    <div className="space-y-2">
                        <Bone className="h-3 w-32" />
                        <Bone className="h-8 w-72 max-w-full" />
                    </div>
                    <Bone className="h-10 w-36 hidden sm:block" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex flex-col rounded-2xl overflow-hidden bg-gray-100">
                            <div className="h-48 bg-gray-200" />
                            <div className="p-4 flex flex-col flex-1 gap-2">
                                <Bone className="h-5 w-3/4" />
                                <Bone className="h-3 w-1/3" />
                                <Bone className="h-3 w-full mt-1" />
                                <Bone className="h-3 w-11/12" />
                                <Bone className="h-3 w-4/5" />
                                <div className="mt-auto pt-3 flex justify-end">
                                    <Bone className="h-3 w-20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Facilities */}
            <section className="max-w-6xl mx-auto px-5 py-16">
                <div className="flex items-end justify-between mb-8">
                    <div className="space-y-2">
                        <Bone className="h-3 w-32" />
                        <Bone className="h-8 w-80 max-w-full" />
                    </div>
                    <Bone className="h-10 w-44 hidden sm:block" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex flex-col rounded-2xl overflow-hidden bg-gray-100">
                            <div className="h-48 bg-gray-200" />
                            <div className="p-4 flex flex-col flex-1 gap-2">
                                <Bone className="h-5 w-3/4" />
                                <Bone className="h-3 w-full mt-1" />
                                <Bone className="h-3 w-11/12" />
                                <Bone className="h-3 w-4/5" />
                                <div className="mt-auto pt-3 flex justify-end">
                                    <Bone className="h-3 w-20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
