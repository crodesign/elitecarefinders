function Bone({ className = '' }: { className?: string }) {
    return <div className={`rounded bg-gray-200 ${className}`} />;
}

export default function Loading() {
    return (
        <div className="animate-pulse">
            <div className="max-w-6xl mx-auto -mt-[10px]">
                <div className="relative bg-[#239ddb] overflow-hidden rounded-b-xl">
                    <div className="relative px-5 pt-10 pb-[30px] text-center text-white">
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-8 w-8 rounded bg-white/20" />
                            <div className="h-8 sm:h-10 w-56 rounded bg-white/20" />
                        </div>
                        <div className="mt-3 h-4 w-72 max-w-full rounded bg-white/15 mx-auto" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-10">
                <div className="mb-12">
                    <Bone className="h-5 w-44 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-white border-2 border-gray-100 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
                                <div className="flex-1 min-w-0 space-y-2">
                                    <Bone className="h-4 w-1/2" />
                                    <Bone className="h-3 w-full" />
                                    <Bone className="h-3 w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <Bone className="h-5 w-36 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex flex-col rounded-2xl overflow-hidden bg-gray-100">
                                <div className="h-48 bg-gray-200" />
                                <div className="p-4 flex flex-col flex-1 gap-2">
                                    <Bone className="h-3 w-1/3" />
                                    <Bone className="h-4 w-3/4" />
                                    <Bone className="h-3 w-full" />
                                    <Bone className="h-3 w-11/12" />
                                    <div className="flex items-center justify-between mt-2">
                                        <Bone className="h-3 w-24" />
                                        <Bone className="h-3 w-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
