<template>
  <div class="min-h-screen bg-hero-gradient text-mist-900">
    <main class="relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-[url('/bg.png')] bg-cover bg-top bg-no-repeat">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#edf5ff]/35 to-[#edf5ff]"></div>
      <div class="relative z-10 flex min-h-screen flex-col px-4 pb-8 pt-6 sm:px-6">
        <slot />
      </div>
    </main>
  </div>
</template>
