import { defineStore } from "pinia";
import { normalizePairCode } from "~/utils/duo-funds";
import type { DuoUser } from "~/types/duo-funds";

export const useAuthStore = defineStore(
  "auth",
  () => {
    const user = ref<DuoUser | null>(null);
    const isHydrated = ref(false);

    const isAuthenticated = computed(() => Boolean(user.value));

    const displayName = computed(() => user.value?.displayName ?? "");
    const email = computed(() => user.value?.email ?? "");
    const pairId = computed(() => user.value?.pairId ?? "");

    const setFirebaseUser = (payload: {
      uid: string;
      displayName?: string | null;
      email?: string | null;
      pairId?: string | null;
    }) => {
      user.value = {
        uid: payload.uid,
        displayName: payload.displayName?.trim() || "Duo Member",
        email: payload.email?.trim().toLowerCase() || "",
        pairId: normalizePairCode(payload.pairId || ""),
        provider: "firebase",
      };
      isHydrated.value = true;
    };

    const signOut = () => {
      user.value = null;
      isHydrated.value = true;
    };

    const setHydrated = (value: boolean) => {
      isHydrated.value = value;
    };

    return {
      user,
      isHydrated,
      isAuthenticated,
      displayName,
      email,
      pairId,
      setFirebaseUser,
      signOut,
      setHydrated,
    };
  },
  {
    persist: true,
  },
);
