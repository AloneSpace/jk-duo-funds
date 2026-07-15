<script setup lang="ts">
defineProps<{
  pairName: string;
  currentBalance: string;
  transactionCount: number;
  myTotal: string;
  partnerTotal: string;
  userInitials: string;
}>();

defineEmits<{ filterClick: []; signOut: [] }>();
</script>

<template>
  <section
    class="-mx-4 -mt-4 relative overflow-hidden bg-linear-to-br from-green-500 via-emerald-600 to-green-800 px-5 pb-7 pt-5 text-white shadow-2xl shadow-emerald-900/30"
    style="
      border-bottom-left-radius: 2.5rem;
      border-bottom-right-radius: 2.5rem;
    "
  >
    <!-- Decorative blobs -->
    <div
      class="pointer-events-none absolute -right-14 -top-14 size-60 rounded-full bg-white/6"
    />
    <div
      class="pointer-events-none absolute -left-10 -bottom-6 size-44 rounded-full bg-white/4"
    />

    <!-- Top bar -->
    <div class="relative flex items-center justify-between">
      <button
        class="flex size-9 items-center justify-center rounded-full bg-white/15 transition active:bg-white/25"
        @click="$emit('filterClick')"
      >
        <UIcon name="i-lucide-sliders-horizontal" class="size-4.5 text-white" />
      </button>

      <div class="flex items-center gap-2">
        <span class="text-[11px] font-medium text-white/70">{{
          pairName
        }}</span>

        <UDropdownMenu
          :items="[
            {
              label: 'Sign out',
              icon: 'i-lucide-log-out',
              onSelect: () => $emit('signOut'),
            },
          ]"
          :ui="{ content: 'w-36' }"
        >
          <button
            class="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-[11px] font-bold uppercase tracking-wider text-white transition active:bg-white/35"
          >
            {{ userInitials }}
          </button>
        </UDropdownMenu>
      </div>
    </div>

    <!-- Balance -->
    <div class="relative mt-6 text-center">
      <p
        class="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/65"
      >
        Current Balance
      </p>
      <p
        class="mt-2 text-[2.6rem] font-bold leading-none tracking-tight text-yellow-300 drop-shadow"
      >
        {{ currentBalance }}
      </p>
      <p class="mt-2 text-xs text-white/55">
        {{ transactionCount }}
        transaction{{ transactionCount === 1 ? "" : "s" }}
      </p>
    </div>

    <!-- Sub-stats chips -->
    <div class="relative mt-7 grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-white/15 px-4 py-3.5 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <p
            class="text-[10px] font-medium uppercase tracking-widest text-white/65"
          >
            Your total
          </p>
          <UIcon
            name="i-lucide-arrow-up-right"
            class="size-3.5 text-emerald-300"
          />
        </div>
        <p class="mt-1.5 text-lg font-bold leading-none">{{ myTotal }}</p>
      </div>

      <div class="rounded-2xl bg-white/15 px-4 py-3.5 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <p
            class="text-[10px] font-medium uppercase tracking-widest text-white/65"
          >
            Partner
          </p>
          <UIcon
            name="i-lucide-arrow-down-left"
            class="size-3.5 text-orange-300"
          />
        </div>
        <p class="mt-1.5 text-lg font-bold leading-none">{{ partnerTotal }}</p>
      </div>
    </div>
  </section>
</template>
