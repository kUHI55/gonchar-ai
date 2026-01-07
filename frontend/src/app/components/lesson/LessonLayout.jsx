"use client";

export default function LessonLayout({ left, right, bottom }) {
  return (
    <div className="min-h-screen w-full bg-[#0b0f17] text-white">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Mobile: 1 column / Desktop: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 sm:gap-4">
          {/* LEFT */}
          <aside className="order-1 lg:order-none">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              {left}
            </div>
          </aside>

          {/* RIGHT + BOTTOM */}
          <main className="order-2 lg:order-none min-w-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              {right}
            </div>

            <div className="mt-3 sm:mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              {bottom}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}