<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  icon: string;
}>();
</script>

<template>
  <UCard
    class="min-h-24 overflow-hidden border border-slate-200/70 bg-linear-to-br from-white to-emerald-50/45 shadow-sm shadow-emerald-900/5 dark:border-slate-800/70 dark:from-slate-900/90 dark:to-emerald-500/5"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <p
          class="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
        >
          {{ label }}
        </p>
        <p
          class="mt-1 text-3xl leading-none font-semibold text-slate-900 dark:text-white"
        >
          {{ value }}
        </p>
      </div>

      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/90 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25"
      >
        <UIcon :name="icon" class="size-4.5" />
      </div>
    </div>
  </UCard>
</template>
