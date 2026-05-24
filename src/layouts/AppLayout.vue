<template>
  <div class="min-h-screen bg-hero-gradient text-mist-900">
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute -left-20 top-16 h-52 w-52 rounded-full bg-white/30 blur-3xl"></div>
      <div class="absolute right-[-4rem] top-52 h-64 w-64 rounded-full bg-sky-100/30 blur-3xl"></div>
      <div class="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-mist-100/20 blur-3xl"></div>
    </div>

    <main class="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8 pt-6 sm:px-6">
      <slot />
    </main>
  </div>
</template>
