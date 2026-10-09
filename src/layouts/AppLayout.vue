<template>
  <div class="h-[100dvh] overflow-hidden bg-hero-gradient text-mist-900">
    <main class="relative mx-auto h-full w-full max-w-md overflow-hidden">
      <div class="pointer-events-none absolute inset-0 bg-[url('/bg.png')] bg-cover bg-top bg-no-repeat"></div>
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#edf5ff]/35 to-[#edf5ff]"></div>
      <div class="relative z-10 h-full overflow-y-auto overscroll-contain">
        <div class="app-scroll-content flex min-h-full flex-col">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>
