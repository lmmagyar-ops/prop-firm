'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
            <div className="text-center p-8 bg-zinc-900 border border-zinc-800 rounded-xl max-w-md">
                <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
                <div className="text-zinc-500 mb-6 font-mono text-sm bg-black/50 p-4 rounded border border-white/5 overflow-x-auto">
                    {error.message}
                </div>
                <button
                    onClick={reset}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
