import { siteConfig } from '@/config/site';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
        Welcome to {siteConfig.name}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">{siteConfig.description}</p>
    </section>
  );
}
