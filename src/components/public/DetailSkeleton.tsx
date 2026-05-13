function Bone({ className = '' }: { className?: string }) {
    return <div className={`rounded bg-gray-200 ${className}`} />;
}

export function DetailSkeleton() {
    return (
        <article className="max-w-6xl mx-auto px-[15px] py-8 sm:py-12 animate-pulse">
            <div className="flex flex-col">
                {/* Action bar */}
                <div className="order-2 lg:order-1 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Bone className="h-10 w-32" />
                        <Bone className="h-10 w-28" />
                    </div>
                    <Bone className="h-10 w-24" />
                </div>

                {/* Hero gallery — large image + 2x2 thumbs */}
                <div className="order-3 lg:order-2 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:h-[460px]">
                        <div className="md:col-span-2 h-72 md:h-full bg-gray-200 rounded-2xl" />
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                            <div className="bg-gray-200 rounded-xl h-32 md:h-full" />
                            <div className="bg-gray-200 rounded-xl h-32 md:h-full" />
                        </div>
                    </div>
                </div>

                {/* Title block */}
                <header className="order-1 lg:order-3 mb-0 pb-6">
                    <Bone className="h-9 sm:h-10 w-3/4 max-w-[600px] mb-3" />
                    <div className="space-y-1.5">
                        <Bone className="h-3 w-48" />
                        <Bone className="h-3 w-56" />
                    </div>
                </header>
            </div>

            {/* Two-column body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-0">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl bg-[#f0f8fc] p-6 space-y-4">
                        <Bone className="h-5 w-44" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Bone className="h-3 w-full" />
                                <Bone className="h-3 w-11/12" />
                                <Bone className="h-3 w-10/12" />
                                <Bone className="h-3 w-9/12" />
                            </div>
                            <div className="space-y-3">
                                <Bone className="h-3 w-full" />
                                <Bone className="h-3 w-11/12" />
                                <Bone className="h-3 w-10/12" />
                                <Bone className="h-3 w-8/12" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-gray-100 p-6 space-y-3">
                        <Bone className="h-5 w-40" />
                        <Bone className="h-3 w-full" />
                        <Bone className="h-3 w-11/12" />
                        <Bone className="h-3 w-10/12" />
                        <Bone className="h-3 w-9/12" />
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="hidden lg:block space-y-6">
                    <div className="rounded-xl bg-gray-100 p-5 space-y-4">
                        <Bone className="h-5 w-32" />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Bone className="h-2.5 w-16" />
                                <Bone className="h-3 w-24" />
                            </div>
                            <div className="space-y-1.5">
                                <Bone className="h-2.5 w-16" />
                                <Bone className="h-3 w-24" />
                            </div>
                            <div className="space-y-1.5">
                                <Bone className="h-2.5 w-16" />
                                <Bone className="h-3 w-24" />
                            </div>
                            <div className="space-y-1.5">
                                <Bone className="h-2.5 w-16" />
                                <Bone className="h-3 w-24" />
                            </div>
                        </div>
                        <div className="-mx-5 -mb-5 aspect-square bg-gray-200 rounded-b-xl" />
                    </div>
                </aside>
            </div>
        </article>
    );
}
