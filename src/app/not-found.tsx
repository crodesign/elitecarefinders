import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900">404 – Page Not Found</h2>
            <p className="text-gray-600">The page you are looking for does not exist.</p>
            <Link
                href="/"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
            >
                Go Home
            </Link>
        </div>
    );
}
