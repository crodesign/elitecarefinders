function Bone({ className = '' }: { className?: string }) {
    return <div className={`rounded bg-gray-200 ${className}`} />;
}

export function ListingSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="max-w-6xl mx-auto -mt-[10px] px-[5px]">
                <div className="relative bg-[#239ddb] overflow-hidden rounded-b-xl">
                    <div className="relative px-5 pt-10 pb-[30px] text-left sm:text-center text-white">
                        <div className="flex items-center justify-start sm:justify-center gap-3">
                            <div className="h-8 w-8 rounded bg-white/20" />
                            <div className="h-8 sm:h-10 w-64 sm:w-96 rounded bg-white/20" />
                        </div>
                        <div className="mt-3 h-4 w-40 rounded bg-white/15 mx-0 sm:mx-auto" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-8">
                <div className="mb-6 flex flex-wrap gap-2">
                    <Bone className="h-10 w-32" />
                    <Bone className="h-10 w-28" />
                    <Bone className="h-10 w-36" />
                    <Bone className="h-10 w-28" />
                    <Bone className="h-10 w-10 ml-auto" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="flex flex-col rounded-2xl overflow-hidden bg-gray-100">
                            <div className="h-48 bg-gray-200" />
                            <div className="flex flex-col flex-1 p-4 gap-2">
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
            </div>
        </div>
    );
}
