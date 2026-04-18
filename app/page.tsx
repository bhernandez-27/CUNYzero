import Link from "next/link";
// Component that renders a star mark
function StarMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 2l1.4 5.2L18 12l-4.6 1.6L12 22l-1.4-8.4L6 12l4.6-4.8L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

// HeroIllustration is a component that renders a hero illustration
function HeroIllustration() {
  return (
    <div className="relative">
      <div className="absolute -top-8 -left-8 h-16 w-16 text-neutral-900/10">
        <StarMark className="h-16 w-16" />
      </div>

      <div className="rounded-[28px] bg-white border border-black/5 shadow-[0_18px_45px_rgba(0,0,0,0.08)] p-6 sm:p-8">
        <svg
          viewBox="0 0 520 360"
          className="w-full h-auto"
          role="img"
          aria-label="Learning illustration"
        >
          <rect x="324" y="54" width="144" height="232" rx="26" fill="#F6F2EA" stroke="#0B0B0B" strokeOpacity="0.12" />
          <circle cx="396" cy="166" r="42" fill="#0B0B0B" opacity="0.06" />
          <path
            d="M372 210c10 10 21 16 34 16 13 0 24-6 34-16"
            stroke="#0B0B0B"
            strokeOpacity="0.35"
            strokeWidth="6"
            strokeLinecap="round"
          />

          <path
            d="M185 88c28-15 56-21 84-18 34 4 56 24 66 59"
            stroke="#0B0B0B"
            strokeOpacity="0.2"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <circle cx="226" cy="88" r="18" fill="#F07E62" stroke="#0B0B0B" strokeOpacity="0.15" />
          <circle cx="276" cy="122" r="12" fill="#0B0B0B" opacity="0.12" />

          <path
            d="M210 232c0-46 28-78 70-78s70 32 70 78"
            fill="#0B0B0B"
            opacity="0.06"
          />

          <path
            d="M210 232c0-46 28-78 70-78s70 32 70 78"
            stroke="#0B0B0B"
            strokeOpacity="0.16"
            strokeWidth="6"
            strokeLinecap="round"
          />

          <path
            d="M232 220c8 16 22 28 48 28 34 0 56-20 64-46"
            stroke="#F07E62"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <path
            d="M260 130c4 8 10 12 18 12 10 0 16-6 20-16"
            stroke="#0B0B0B"
            strokeOpacity="0.35"
            strokeWidth="8"
            strokeLinecap="round"
          />

          <path
            d="M222 175c-14-4-25-12-34-26"
            stroke="#0B0B0B"
            strokeOpacity="0.18"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <path
            d="M160 230h165"
            stroke="#0B0B0B"
            strokeOpacity="0.08"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <path
            d="M107 110c26 3 44 13 56 29 13 18 15 39 6 63"
            stroke="#0B0B0B"
            strokeOpacity="0.14"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <path
            d="M124 178c10 9 20 13 31 13"
            stroke="#F07E62"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <circle cx="442" cy="78" r="10" fill="#0B0B0B" opacity="0.12" />
          <circle cx="460" cy="98" r="6" fill="#F07E62" opacity="0.85" />
        </svg>
      </div>
    </div>
  );
}

// Component that renders a dark feature illustration
function DarkFeatureIllustration() {
  return (
    <div className="relative rounded-[26px] bg-[#0f0f0f] border border-white/10 p-6">
      <div className="absolute -top-6 -left-6 text-white/10">
        <StarMark className="h-12 w-12" />
      </div>

      <svg
        viewBox="0 0 520 320"
        className="w-full h-auto"
        role="img"
        aria-label="Teaching tools illustration"
      >
        <rect x="26" y="36" width="240" height="248" rx="28" fill="#0B0B0B" stroke="#FFFFFF" strokeOpacity="0.12" />
        <path
          d="M150 235c-32-18-49-46-49-84 0-54 36-92 90-92s90 38 90 92c0 39-17 67-50 84"
          fill="#FFFFFF"
          opacity="0.05"
        />
        <path
          d="M116 132c12-18 29-27 50-27 30 0 54 20 62 52"
          stroke="#FFFFFF"
          strokeOpacity="0.24"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M124 224c18 10 36 15 56 15 22 0 42-6 62-18"
          stroke="#F07E62"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle cx="128" cy="82" r="12" fill="#F07E62" />
        <circle cx="206" cy="72" r="8" fill="#FFFFFF" opacity="0.22" />
        <circle cx="224" cy="98" r="6" fill="#FFFFFF" opacity="0.18" />

        <path
          d="M90 258h170"
          stroke="#FFFFFF"
          strokeOpacity="0.14"
          strokeWidth="10"
          strokeLinecap="round"
        />

        <circle cx="360" cy="110" r="18" fill="#FFFFFF" opacity="0.12" />
        <circle cx="402" cy="86" r="10" fill="#F07E62" opacity="0.9" />
        <path
          d="M330 178c28-22 60-28 96-18"
          stroke="#FFFFFF"
          strokeOpacity="0.12"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function AvatarRow() {
  const colors = ["bg-[#F07E62]", "bg-[#1F2937]", "bg-[#60A5FA]", "bg-[#22C55E]", "bg-[#A78BFA]"];
  return (
    <div className="flex -space-x-2">
      {colors.map((c, i) => (
        <div
          key={c}
          className={`h-8 w-8 rounded-full ring-2 ring-white ${c} grid place-items-center text-[10px] font-semibold text-white`}
          aria-hidden="true"
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}
    </div>
  );
}
// Main component that renders the home page
export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-[44px] leading-[1.05] sm:text-[54px] font-semibold tracking-tight text-neutral-900">
              Your ultimate destination for limitless learning
            </h1>
            <p className="mt-4 text-neutral-600 max-w-xl">
              The only authoring platform designed to unlock learner potential and streamline production.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] hover:brightness-[0.97] active:brightness-[0.95] transition"
              >
                Get Started →
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition"
              >
                Explore dashboard
              </Link>
            </div>
          </div>

          <HeroIllustration />
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
          <div className="rounded-2xl bg-white/75 border border-black/5 p-5 flex items-center gap-4">
            <div className="shrink-0">
              <AvatarRow />
            </div>
            <div>
              <div className="text-lg font-semibold text-neutral-900">12k+ Happy Students</div>
              <div className="text-sm text-neutral-600">Learn with us</div>
            </div>
          </div>

          <div className="rounded-2xl bg-transparent p-5 flex items-center justify-center md:justify-start">
            <div>
              <div className="text-3xl font-semibold tracking-tight text-neutral-900">140+</div>
              <div className="mt-1 text-sm text-neutral-600">Courses &amp; subjects</div>
            </div>
          </div>

          <div className="rounded-2xl bg-transparent p-5 flex items-center justify-center md:justify-start">
            <div>
              <div className="text-3xl font-semibold tracking-tight text-neutral-900">120+</div>
              <div className="mt-1 text-sm text-neutral-600">Instructors</div>
            </div>
          </div>

          <div className="rounded-2xl bg-transparent p-5 flex items-center justify-center md:justify-start">
            <div>
              <div className="text-3xl font-semibold tracking-tight text-neutral-900">32+</div>
              <div className="mt-1 text-sm text-neutral-600">Using app &amp; website</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 pb-14">
        <div className="rounded-[32px] bg-[#0B0B0B] text-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 p-8 sm:p-10 items-center">
            <DarkFeatureIllustration />

            <div className="lg:pl-2">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Concentrate on your passion, we&apos;ll care of everything else.
              </h2>
              <p className="mt-4 text-white/70 max-w-xl">
                We can easily find out easy-to-use teaching tools, the College0 team ensures a smooth and effortless online
                learning journey for every educator.
              </p>

              <div className="mt-7">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95] transition"
                >
                  Join Our Team →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}