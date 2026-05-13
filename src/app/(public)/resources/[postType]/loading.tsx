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
                            <div className="h-8 sm:h-10 w-72 rounded bg-white/20" />
                        </div>
                        <div className="mt-3 h-4 w-40 rounded bg-white/15 mx-auto" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-10">
                <Bone className="h-4 w-32 mb-6" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="flex flex-col rounded-2xl overflow-hidden bg-gray-100">
                            <div className="h-48 bg-gray-200" />
                            <div className="p-4 flex flex-col flex-1 gap-2">
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
    );
}
