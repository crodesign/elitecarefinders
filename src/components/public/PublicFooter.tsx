import Image from 'next/image';
import Link from 'next/link';

export function PublicFooter() {
    return (
        <footer className="mt-16">
            <div className="max-w-6xl mx-auto px-[15px]">
            <div className="bg-gray-100 rounded-t-xl px-6 sm:px-8 pt-12 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-2">
                        <Image
                            src="/images/site/ecf-logo-black.svg"
                            alt="Elite CareFinders"
                            width={140}
                            height={36}
                            className="h-7 w-auto mb-3"
                        />
                        <p className="text-sm text-gray-500 max-w-xs">
                            Helping families find the best senior living care options with personalized guidance.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Explore</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/homes" className="hover:text-[#239ddb] transition-colors">Adult Family Homes</Link></li>
                            <li><Link href="/facilities" className="hover:text-[#239ddb] transition-colors">Assisted Living</Link></li>
                            <li><Link href="/blog" className="hover:text-[#239ddb] transition-colors">Resources</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/about" className="hover:text-[#239ddb] transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="hover:text-[#239ddb] transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t-2 border-white mt-10 pt-6 text-xs text-gray-400 text-center">
                    &copy; 2020&ndash;{new Date().getFullYear()} Elite CareFinders. All rights reserved.
                </div>
            </div>
            </div>
        </footer>
    );
}
